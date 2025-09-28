import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import User from '../models/User';
import whatsappService from '../services/whatsappService';

const router = Router();

// @route   POST /api/whatsapp/connect
// @desc    Connect WhatsApp account
// @access  Private
router.post('/connect', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user._id.toString();

    // Check if already connected
    if (user.whatsappConnected) {
      const isStillConnected = whatsappService.isConnected(userId);
      if (isStillConnected) {
        return res.json({
          success: true,
          message: 'WhatsApp is already connected',
          data: { isConnected: true }
        });
      }
    }

    // Get user settings
    const userSettings = user.settings || {};
    
    // Create new connection with user settings
    const result = await whatsappService.createConnection(userId, userSettings);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Update user's WhatsApp connection status
    if (result.qr) {
      // QR code generated, but not yet connected
      await User.findByIdAndUpdate(userId, { whatsappConnected: false });
    }

    // If no QR code was generated immediately, wait a bit for it
    let qrCode = result.qr;
    if (!qrCode) {
      console.log('No QR code in initial response, waiting for generation...');
      qrCode = await whatsappService.waitForQRCode(userId, 8000); // Reduced wait time to 8 seconds for faster response
    }

    // If still no QR code after waiting, return appropriate message
    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code generation failed. Please try again.'
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        qr: qrCode,
        isConnected: false
      }
    });

  } catch (error) {
    console.error('WhatsApp connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during WhatsApp connection'
    });
  }
});

// @route   GET /api/whatsapp/status
// @desc    Get WhatsApp connection status
// @access  Private
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user._id.toString();

    const status = whatsappService.getConnectionStatus(userId);
    const qr = whatsappService.getQRCode(userId);

    console.log('Status check:', { 
      userId, 
      isConnected: status.isConnected, 
      state: status.state, 
      hasQR: !!qr 
    });

    // If we have an active connection attempt, don't override it with stale status
    if (status.state === 'connecting' && qr) {
      console.log('Active connection in progress, returning current state');
      return res.json({
        success: true,
        data: {
          isConnected: status.isConnected,
          state: status.state,
          qr: qr
        }
      });
    }

    // Update user's connection status in database
    if (status.isConnected !== user.whatsappConnected) {
      await User.findByIdAndUpdate(userId, { 
        whatsappConnected: status.isConnected 
      });
      console.log('Updated user WhatsApp connection status:', status.isConnected);
    }

    res.json({
      success: true,
      data: {
        isConnected: status.isConnected,
        state: status.state,
        qr: qr
      }
    });

  } catch (error) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/whatsapp/qr
// @desc    Get QR code for WhatsApp connection
// @access  Private
router.get('/qr', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user._id.toString();

    const isConnected = whatsappService.isConnected(userId);

    if (isConnected) {
      return res.json({
        success: true,
        message: 'WhatsApp is already connected',
        data: { isConnected: true }
      });
    }

    // Check if user has an active connection attempt
    if (!whatsappService.hasActiveConnection(userId)) {
      return res.status(400).json({
        success: false,
        message: 'No active connection. Please initiate connection first.'
      });
    }

    // Try to get existing QR code first
    let qr = whatsappService.getQRCode(userId);
    
    // If no QR code, wait for it to be generated
    if (!qr) {
      console.log('No QR code found, waiting for generation...');
      qr = await whatsappService.waitForQRCode(userId, 5000); // Wait up to 5 seconds for faster response
    }

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR code not available. Please try connecting again.'
      });
    }

    res.json({
      success: true,
      data: {
        qr,
        isConnected: false
      }
    });

  } catch (error) {
    console.error('QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/whatsapp/disconnect
// @desc    Disconnect WhatsApp account
// @access  Private
router.post('/disconnect', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user._id.toString();

    const disconnected = await whatsappService.disconnect(userId);

    if (disconnected) {
      // Update user's connection status
      await User.findByIdAndUpdate(userId, { 
        whatsappConnected: false,
        whatsappSessionId: null
      });

      res.json({
        success: true,
        message: 'WhatsApp disconnected successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'WhatsApp was not connected or already disconnected'
      });
    }

  } catch (error) {
    console.error('WhatsApp disconnection error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during disconnection'
    });
  }
});

// @route   POST /api/whatsapp/test-message
// @desc    Send a test message
// @access  Private
router.post('/test-message', authenticate, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    const user = req.user!;
    const userId = user._id.toString();

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    // Check if WhatsApp is connected
    if (!whatsappService.isConnected(userId)) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp is not connected. Please connect first.'
      });
    }

    const result = await whatsappService.sendMessage(userId, phoneNumber, message);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test message sent successfully',
        data: {
          messageId: result.messageId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to send test message'
      });
    }

  } catch (error) {
    console.error('Test message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
