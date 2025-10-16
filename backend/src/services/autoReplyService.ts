import AutoReply from '../models/AutoReply';
import AutoReplyLog from '../models/AutoReplyLog';
import ReplyData from '../models/ReplyData';
import Contact from '../models/Contact';
import ConversationHistory from '../models/ConversationHistory';
import aiService from './aiService';
import whatsappService from './whatsappService';

interface AutoReplyContext {
  contactName: string;
  contactCategory?: string;
  previousMessages: number;
  messageTime: Date;
  messageLength: number;
}

interface AutoReplyResult {
  shouldReply: boolean;
  response?: string;
  autoReplyId?: string;
  confidence?: number;
  processingTime?: number;
  error?: string;
}

class AutoReplyService {
  private activeAutoReplies: Map<string, any[]> = new Map();
  private replyDataCache: Map<string, any[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache

  constructor() {
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.cacheExpiry.entries()) {
        if (expiry < now) {
          this.activeAutoReplies.delete(key);
          this.replyDataCache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  async processIncomingMessage(
    userId: string,
    phoneNumber: string,
    incomingMessage: string
  ): Promise<AutoReplyResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Processing auto-reply for user ${userId}, phone: ${phoneNumber}`);
      
      // Get or load active auto-replies for user
      const autoReplies = await this.getActiveAutoReplies(userId);
      if (autoReplies.length === 0) {
        console.log('No active auto-replies found for user');
        return { shouldReply: false };
      }

      // Check if there's an AI auto-reply rule
      const aiAutoReply = autoReplies.find(ar => ar.responseType === 'ai_generated' && ar.isActive);
      if (aiAutoReply) {
        console.log('🎯 AI Auto-reply found, processing with AI...');
        return await this.processAIAutoReply(aiAutoReply, userId, phoneNumber, incomingMessage, startTime);
      }

      // Get contact information
      const contact = await Contact.findOne({
        userId,
        phone: phoneNumber,
        isActive: true
      });

      const contextData: AutoReplyContext = {
        contactName: contact?.name || 'Customer',
        contactCategory: contact?.category || 'general',
        previousMessages: await this.getPreviousMessageCount(userId, phoneNumber),
        messageTime: new Date(),
        messageLength: incomingMessage.length
      };

      // Check each auto-reply rule
      for (const autoReply of autoReplies) {
        const shouldTrigger = await this.shouldTriggerAutoReply(
          autoReply,
          incomingMessage,
          contextData
        );

        if (shouldTrigger) {
          console.log(`🎯 Auto-reply triggered: ${autoReply.name}`);
          
          const response = await this.generateResponse(
            autoReply,
            incomingMessage,
            contextData
          );

          if (response) {
            // Log the auto-reply
            await this.logAutoReply(
              userId,
              autoReply._id.toString(),
              contact?._id,
              incomingMessage,
              autoReply.responseTemplate,
              response,
              autoReply.responseType,
              'success',
              Date.now() - startTime
            );

            // Update statistics
            await this.updateAutoReplyStats(autoReply._id.toString(), true);

            return {
              shouldReply: true,
              response,
              autoReplyId: autoReply._id.toString(),
              confidence: 0.85,
              processingTime: Date.now() - startTime
            };
          }
        }
      }

      console.log('No auto-reply triggered for this message');
      return { shouldReply: false };

    } catch (error) {
      console.error('Error processing auto-reply:', error);
      return {
        shouldReply: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processAIAutoReply(
    aiAutoReply: any,
    userId: string,
    phoneNumber: string,
    incomingMessage: string,
    startTime: number
  ): Promise<AutoReplyResult> {
    try {
      // Get contact information
      const contact = await Contact.findOne({
        userId,
        phone: phoneNumber,
        isActive: true
      });

      // Get or create conversation history
      let conversation = await ConversationHistory.findOne({
        userId,
        phoneNumber,
        isActive: true
      });

      if (!conversation) {
        conversation = new ConversationHistory({
          userId,
          phoneNumber,
          contactId: contact?._id,
          messages: [],
          messageCount: 0,
          isActive: true
        });
      }

      // Add incoming message to conversation
      (conversation as any).addMessage('user', incomingMessage);

      // Get recent conversation context (last 5 messages)
      const recentMessages = (conversation as any).getRecentMessages(5);

      const contextData: AutoReplyContext = {
        contactName: contact?.name || 'Customer',
        contactCategory: contact?.category || 'general',
        previousMessages: conversation.messageCount,
        messageTime: new Date(),
        messageLength: incomingMessage.length
      };

      // Check if we should use RAG for additional context
      let ragContext = '';
      if (aiAutoReply.aiSettings?.useRAG) {
        const replyData = await this.getReplyData(userId);
        if (replyData.length > 0) {
          const bestMatch = await this.findBestReplyFromData(userId, incomingMessage);
          if (bestMatch.bestMatch) {
            ragContext = `\n\nRelevant information from knowledge base:\n${bestMatch.bestMatch.value}`;
          }
        }
      }

      // Generate AI response with conversation history
      const aiResult = await aiService.generateAutoReply(
        incomingMessage + ragContext,
        contextData.contactName,
        contextData,
        aiAutoReply.aiSettings?.personality || 'professional',
        aiAutoReply.aiSettings?.includeGreeting || true,
        aiAutoReply.aiSettings?.includeClosing || true,
        recentMessages // Pass conversation history
      );

      if (aiResult.response) {
        // Add assistant's response to conversation history
        (conversation as any).addMessage('assistant', aiResult.response, aiAutoReply._id);
        await conversation.save();
        
        // Log the auto-reply
        await this.logAutoReply(
          userId,
          aiAutoReply._id.toString(),
          contact?._id,
          incomingMessage,
          'AI Generated Response',
          aiResult.response,
          'ai_generated',
          'success',
          Date.now() - startTime
        );

        // Update statistics
        await this.updateAutoReplyStats(aiAutoReply._id.toString(), true);

        return {
          shouldReply: true,
          response: aiResult.response,
          autoReplyId: aiAutoReply._id.toString(),
          confidence: aiResult.confidence,
          processingTime: Date.now() - startTime
        };
      }

      return { shouldReply: false };

    } catch (error) {
      console.error('Error processing AI auto-reply:', error);
      return {
        shouldReply: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getActiveAutoReplies(userId: string): Promise<any[]> {
    const cacheKey = `autoReplies_${userId}`;
    
    // Check cache first
    if (this.activeAutoReplies.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && expiry > Date.now()) {
        return this.activeAutoReplies.get(cacheKey) || [];
      }
    }

    // Load from database
    const autoReplies = await AutoReply.find({
      userId,
      isActive: true
    }).sort({ priority: -1, createdAt: -1 });

    // Cache the results
    this.activeAutoReplies.set(cacheKey, autoReplies);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    return autoReplies;
  }

  private async shouldTriggerAutoReply(
    autoReply: any,
    incomingMessage: string,
    contextData: AutoReplyContext
  ): Promise<boolean> {
    try {
      // Check time restrictions
      if (autoReply.conditions?.timeRestrictions) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        const { startTime, endTime, daysOfWeek } = autoReply.conditions.timeRestrictions;

        // Check day of week
        if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(currentDay)) {
          return false;
        }

        // Check time range
        if (startTime && endTime) {
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          const currentMinutes = currentHour * 60 + now.getMinutes();
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
            return false;
          }
        }
      }

      // Check contact filters
      if (autoReply.conditions?.contactFilters) {
        const { categories, tags, excludeContacts } = autoReply.conditions.contactFilters;

        if (categories && categories.length > 0 && !categories.includes(contextData.contactCategory)) {
          return false;
        }

        if (excludeContacts && excludeContacts.length > 0) {
          // This would need contact ID, skip for now
        }
      }

      // Check message filters
      if (autoReply.conditions?.messageFilters) {
        const { minLength, maxLength, containsAny, containsAll } = autoReply.conditions.messageFilters;

        if (minLength && contextData.messageLength < minLength) {
          return false;
        }

        if (maxLength && contextData.messageLength > maxLength) {
          return false;
        }

        if (containsAll && containsAll.length > 0) {
          const message = incomingMessage.toLowerCase();
          const allPresent = containsAll.every(term => message.includes(term.toLowerCase()));
          if (!allPresent) return false;
        }

        if (containsAny && containsAny.length > 0) {
          const message = incomingMessage.toLowerCase();
          const anyPresent = containsAny.some(term => message.includes(term.toLowerCase()));
          if (!anyPresent) return false;
        }
      }

      // Check trigger keywords
      if (autoReply.triggerKeywords && autoReply.triggerKeywords.length > 0) {
        const message = incomingMessage.toLowerCase();
        const keywordMatch = autoReply.triggerKeywords.some(keyword => 
          message.includes(keyword.toLowerCase())
        );
        if (!keywordMatch) return false;
      }

      // Check trigger patterns (regex)
      if (autoReply.triggerPatterns && autoReply.triggerPatterns.length > 0) {
        const patternMatch = autoReply.triggerPatterns.some(pattern => {
          try {
            const regex = new RegExp(pattern, 'i');
            return regex.test(incomingMessage);
          } catch (error) {
            console.error('Invalid regex pattern:', pattern, error);
            return false;
          }
        });
        if (!patternMatch) return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking auto-reply conditions:', error);
      return false;
    }
  }

  private async generateResponse(
    autoReply: any,
    incomingMessage: string,
    contextData: AutoReplyContext
  ): Promise<string | null> {
    try {
      switch (autoReply.responseType) {
        case 'text':
          return autoReply.responseTemplate;

        case 'template':
          return this.processTemplate(autoReply.responseTemplate, contextData);

        case 'ai_generated':
          if (autoReply.aiSettings?.useAI) {
            const aiResult = await aiService.generateAutoReply(
              incomingMessage,
              contextData.contactName,
              contextData,
              autoReply.aiSettings.personality,
              autoReply.aiSettings.includeGreeting,
              autoReply.aiSettings.includeClosing
            );
            return aiResult.response;
          }
          return autoReply.responseTemplate;

        default:
          return autoReply.responseTemplate;
      }
    } catch (error) {
      console.error('Error generating response:', error);
      return autoReply.responseTemplate; // Fallback to template
    }
  }

  private processTemplate(template: string, contextData: AutoReplyContext): string {
    let processed = template;

    // Replace placeholders
    processed = processed.replace(/\{contactName\}/g, contextData.contactName);
    processed = processed.replace(/\{contactCategory\}/g, contextData.contactCategory || 'Customer');
    processed = processed.replace(/\{messageTime\}/g, contextData.messageTime.toLocaleString());
    processed = processed.replace(/\{previousMessages\}/g, contextData.previousMessages.toString());

    return processed;
  }

  private async getPreviousMessageCount(userId: string, phoneNumber: string): Promise<number> {
    try {
      // This would need to be implemented based on your message history
      // For now, return 0
      return 0;
    } catch (error) {
      console.error('Error getting previous message count:', error);
      return 0;
    }
  }

  private async logAutoReply(
    userId: string,
    autoReplyId: string,
    contactId: string | undefined,
    incomingMessage: string,
    originalResponse: string,
    finalResponse: string,
    responseType: string,
    status: string,
    processingTime: number
  ): Promise<void> {
    try {
      const log = new AutoReplyLog({
        userId,
        autoReplyId,
        contactId,
        incomingMessage,
        originalResponse,
        finalResponse,
        responseType,
        status,
        processingTime,
        contextData: {
          messageLength: incomingMessage.length,
          messageTime: new Date()
        }
      });

      await log.save();
    } catch (error) {
      console.error('Error logging auto-reply:', error);
    }
  }

  private async updateAutoReplyStats(autoReplyId: string, success: boolean): Promise<void> {
    try {
      const updateData: any = {
        $inc: { 'statistics.totalTriggers': 1 },
        $set: { 'statistics.lastTriggered': new Date() }
      };

      if (success) {
        updateData.$inc['statistics.successfulReplies'] = 1;
      } else {
        updateData.$inc['statistics.failedReplies'] = 1;
      }

      await AutoReply.findByIdAndUpdate(autoReplyId, updateData);
    } catch (error) {
      console.error('Error updating auto-reply stats:', error);
    }
  }

  async sendAutoReply(
    userId: string,
    phoneNumber: string,
    response: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await whatsappService.sendMessage(userId, phoneNumber, response);
      
      if (result.success) {
        console.log(`✅ Auto-reply sent successfully to ${phoneNumber}`);
      } else {
        console.error(`❌ Failed to send auto-reply to ${phoneNumber}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending auto-reply:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getReplyData(userId: string, category?: string): Promise<any[]> {
    const cacheKey = `replyData_${userId}_${category || 'all'}`;
    
    // Check cache first
    if (this.replyDataCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && expiry > Date.now()) {
        return this.replyDataCache.get(cacheKey) || [];
      }
    }

    // Load from database
    const query: any = { userId, isActive: true };
    if (category) {
      query.category = category;
    }

    const replyData = await ReplyData.find(query).sort({ createdAt: -1 });

    // Cache the results
    this.replyDataCache.set(cacheKey, replyData);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    return replyData;
  }

  async findBestReplyFromData(
    userId: string,
    incomingMessage: string,
    category?: string
  ): Promise<{
    bestMatch: { key: string; value: string; priority: number } | null;
    confidence: number;
    source: string;
  }> {
    try {
      const replyDataSets = await this.getReplyData(userId, category);
      
      for (const dataSet of replyDataSets) {
        const result = await aiService.findBestReplyMatch(
          incomingMessage,
          dataSet.data
        );

        if (result.bestMatch && result.confidence > 0.5) {
          return {
            bestMatch: result.bestMatch,
            confidence: result.confidence,
            source: dataSet.name
          };
        }
      }

      return {
        bestMatch: null,
        confidence: 0,
        source: 'none'
      };
    } catch (error) {
      console.error('Error finding best reply from data:', error);
      return {
        bestMatch: null,
        confidence: 0,
        source: 'error'
      };
    }
  }

  // Clear cache for a specific user
  clearUserCache(userId: string): void {
    const keysToDelete = [];
    for (const key of this.activeAutoReplies.keys()) {
      if (key.startsWith(`autoReplies_${userId}`) || key.startsWith(`replyData_${userId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.activeAutoReplies.delete(key);
      this.replyDataCache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }
}

export default new AutoReplyService();
