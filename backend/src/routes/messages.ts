import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, bulkMessageSchema } from '../middleware/validation';
import Contact from '../models/Contact';
import Message from '../models/Message';
import BulkMessage from '../models/BulkMessage';
import aiService from '../services/aiService';
import whatsappService from '../services/whatsappService';
import Bull from 'bull';

const router = Router();

// Create Bull queue for message processing
const messageQueue = new Bull('message processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 1000, // Keep more completed jobs for monitoring
    removeOnFail: 100, // Keep more failed jobs for debugging
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    delay: 1000, // 1 second delay between messages to avoid rate limiting (will be overridden by user settings)
  },
  settings: {
    stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 1, // Max number of times a job can be stalled
  },
});

// @route   POST /api/messages/analyze
// @desc    Analyze message for spam and get AI rewrite
// @access  Private
router.post('/analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const { message, category } = req.body;

    if (!message || !category) {
      return res.status(400).json({
        success: false,
        message: 'Message and category are required'
      });
    }

    // Analyze message for spam detection
    const analysis = await aiService.analyzeMessage(message, category);

    res.json({
      success: true,
      data: {
        originalMessage: message,
        isSpam: analysis.isSpam,
        spamWords: analysis.spamWords,
        replacements: analysis.replacements,
        rewrittenMessage: analysis.rewrittenMessage,
        confidence: analysis.confidence
      }
    });

  } catch (error) {
    console.error('Message analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during message analysis'
    });
  }
});

// @route   POST /api/messages/send-bulk
// @desc    Send bulk messages with AI processing
// @access  Private
router.post('/send-bulk', authenticate, validate(bulkMessageSchema), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { message, category, selectedContacts } = req.body;

    // Check if WhatsApp is connected
    const userId = user._id.toString();
    if (!whatsappService.isConnected(userId)) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp is not connected. Please connect first.'
      });
    }

    // Verify all contacts exist and belong to user
    const contacts = await Contact.find({
      _id: { $in: selectedContacts },
      userId: user._id,
      isActive: true
    });

    if (contacts.length !== selectedContacts.length) {
      return res.status(400).json({
        success: false,
        message: 'Some selected contacts are invalid or not found'
      });
    }

    // Get user settings for AI processing
    const userSettings = user.settings || {};
    
    // Analyze and rewrite message with user settings
    const analysis = await aiService.analyzeMessage(message, category, userSettings);

    // Create bulk message record
    const bulkMessage = new BulkMessage({
      userId: user._id,
      originalMessage: message,
      aiRewrittenMessage: analysis.rewrittenMessage,
      category,
      selectedContacts,
      totalContacts: contacts.length,
      spamWords: analysis.spamWords,
      replacements: analysis.replacements,
      progress: {
        total: contacts.length,
        sent: 0,
        failed: 0,
        pending: contacts.length
      }
    });

    await bulkMessage.save();

    // Generate message variations for each contact
    const messageVariations = await aiService.generateMessageVariations(
      analysis.rewrittenMessage, 
      contacts.length
    );

    // Create individual message records
    const messages = [];
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const variation = messageVariations[i] || messageVariations[0];

      // Generate personalized message
      const personalizedMessage = await aiService.generateUniqueMessageForContact(
        variation.variation,
        contact.name,
        i + 1
      );

      const messageRecord = new Message({
        userId: user._id,
        contactId: contact._id,
        originalMessage: message,
        aiRewrittenMessage: personalizedMessage,
        category,
        spamWords: analysis.spamWords,
        replacements: analysis.replacements,
        status: 'pending'
      });

      messages.push(messageRecord);
    }

    await Message.insertMany(messages);

    // Get user settings for message delay and retry attempts
    const messageSettings = user.settings || {};
    const messageDelay = (messageSettings.messageDelay || 2) * 1000; // Convert to milliseconds
    const maxRetries = messageSettings.maxRetries || 3;
    
    // Add jobs to queue for processing with user settings
    for (const messageRecord of messages) {
      await messageQueue.add('send-message', {
        messageId: messageRecord._id.toString(),
        bulkMessageId: bulkMessage._id.toString(),
        userId: userId,
        contactPhone: contacts.find(c => c._id.toString() === messageRecord.contactId.toString())?.phone,
        message: messageRecord.aiRewrittenMessage
      }, {
        delay: messageDelay, // Use user-configured delay
        attempts: maxRetries, // Use user-configured retry attempts
        backoff: {
          type: 'exponential',
          delay: 2000,
        }
      });
    }

    // Update bulk message status
    bulkMessage.status = 'processing';
    bulkMessage.startedAt = new Date();
    await bulkMessage.save();

    res.json({
      success: true,
      message: 'Bulk message processing started',
      data: {
        bulkMessageId: bulkMessage._id,
        totalContacts: contacts.length,
        status: 'processing',
        analysis: {
          isSpam: analysis.isSpam,
          spamWords: analysis.spamWords,
          replacements: analysis.replacements
        }
      }
    });

  } catch (error) {
    console.error('Bulk message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during bulk messaging'
    });
  }
});

// @route   GET /api/messages/bulk
// @desc    Get all bulk messages for user
// @access  Private
router.get('/bulk', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user._id.toString();
    const { page = 1, limit = 10, status } = req.query;

    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const bulkMessages = await BulkMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string) * 1)
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await BulkMessage.countDocuments(query);

    res.json({
      success: true,
      data: {
        bulkMessages,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get bulk messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/messages/bulk/:id/status
// @desc    Get bulk message status and progress
// @access  Private
router.get('/bulk/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const bulkMessage = await BulkMessage.findOne({
      _id: id,
      userId: user._id
    });

    if (!bulkMessage) {
      return res.status(404).json({
        success: false,
        message: 'Bulk message not found'
      });
    }

    res.json({
      success: true,
      data: {
        bulkMessage: {
          id: bulkMessage._id,
          status: bulkMessage.status,
          progress: bulkMessage.progress,
          progressPercentage: (bulkMessage as any).progressPercentage,
          originalMessage: bulkMessage.originalMessage,
          aiRewrittenMessage: bulkMessage.aiRewrittenMessage,
          category: bulkMessage.category,
          totalContacts: bulkMessage.totalContacts,
          startedAt: bulkMessage.startedAt,
          completedAt: bulkMessage.completedAt,
          spamWords: bulkMessage.spamWords,
          replacements: bulkMessage.replacements
        }
      }
    });

  } catch (error) {
    console.error('Bulk message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/messages/bulk/:id/details
// @desc    Get detailed progress for each contact in bulk message
// @access  Private
router.get('/bulk/:id/details', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const bulkMessage = await BulkMessage.findOne({
      _id: id,
      userId: user._id
    });

    if (!bulkMessage) {
      return res.status(404).json({
        success: false,
        message: 'Bulk message not found'
      });
    }

    const messages = await Message.find({
      userId: user._id,
      originalMessage: bulkMessage.originalMessage,
      createdAt: { $gte: bulkMessage.createdAt }
    })
    .populate('contactId', 'name phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    const total = await Message.countDocuments({
      userId: user._id,
      originalMessage: bulkMessage.originalMessage,
      createdAt: { $gte: bulkMessage.createdAt }
    });

    res.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg._id,
          contact: msg.contactId,
          status: msg.status,
          sentAt: msg.sentAt,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt,
          errorMessage: msg.errorMessage,
          retryCount: msg.retryCount
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalMessages: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Bulk message details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/messages/history
// @desc    Get message history for the user
// @access  Private
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { page = 1, limit = 50, status = '' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let query: any = { userId: user._id };
    if (status) {
      query.status = status;
    }

    const messages = await Message.find(query)
      .populate('contactId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg._id,
          contact: msg.contactId,
          originalMessage: msg.originalMessage,
          aiRewrittenMessage: msg.aiRewrittenMessage,
          category: msg.category,
          status: msg.status,
          sentAt: msg.sentAt,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt,
          errorMessage: msg.errorMessage,
          retryCount: msg.retryCount,
          createdAt: msg.createdAt
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalMessages: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Message history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/messages/statistics
// @desc    Get messaging statistics for the user
// @access  Private
router.get('/statistics', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { period = '30' } = req.query; // days

    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Message.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const bulkStats = await BulkMessage.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        messageStats: stats,
        bulkMessageStats: bulkStats,
        totalContacts: await Contact.countDocuments({ userId: user._id, isActive: true })
      }
    });

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Process message queue with concurrency for better performance
messageQueue.process('send-message', 5, async (job) => { // Process 5 messages concurrently
  const { messageId, bulkMessageId, userId, contactPhone, message } = job.data;

  try {
    // Update message status to processing
    await Message.findByIdAndUpdate(messageId, { status: 'processing' });

    // Send WhatsApp message
    const result = await whatsappService.sendMessage(userId, contactPhone, message);

    if (result.success) {
      // Update message as sent
      await Message.findByIdAndUpdate(messageId, {
        status: 'sent',
        whatsappMessageId: result.messageId,
        sentAt: new Date()
      });

      // Update bulk message progress
      await BulkMessage.findByIdAndUpdate(bulkMessageId, {
        $inc: { 'progress.sent': 1, 'progress.pending': -1 }
      });

    } else {
      // Update message as failed
      await Message.findByIdAndUpdate(messageId, {
        status: 'failed',
        errorMessage: result.error,
        $inc: { retryCount: 1 }
      });

      // Update bulk message progress
      await BulkMessage.findByIdAndUpdate(bulkMessageId, {
        $inc: { 'progress.failed': 1, 'progress.pending': -1 }
      });
    }

  } catch (error) {
    console.error('Message processing error:', error);
    
    await Message.findByIdAndUpdate(messageId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      $inc: { retryCount: 1 }
    });

    await BulkMessage.findByIdAndUpdate(bulkMessageId, {
      $inc: { 'progress.failed': 1, 'progress.pending': -1 }
    });
  }
});

export default router;
