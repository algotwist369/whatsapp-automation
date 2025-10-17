# 🔄 Auto-Reply Recovery System

## Overview

The **Auto-Reply Recovery System** ensures that no customer message goes unanswered, even during server issues, disconnections, or failures. It automatically saves missed messages and processes them when the connection is restored, maintaining full chat history context.

## 🎯 Problem Solved

### Before Recovery System
```
Scenario 1: Server Restarts
❌ Customer sends message while server is down
❌ Message is lost
❌ No auto-reply sent
😞 Customer feels ignored

Scenario 2: Auto-Reply Fails
❌ Customer sends message
❌ Auto-reply processing fails (AI timeout, network issue, etc.)
❌ Message is lost
😞 Customer gets no response

Scenario 3: User Leaves Mid-Chat
❌ Customer sends multiple messages
❌ User disconnects WhatsApp
❌ Messages accumulate but not processed
😞 Conversation context is lost
```

### After Recovery System
```
Scenario 1: Server Restarts
✅ Customer sends message while server is down
✅ Message is saved as "pending"
✅ When server restarts, automatically processes pending messages
✅ Auto-reply sent with full chat history context
😊 Customer gets timely response

Scenario 2: Auto-Reply Fails
✅ Customer sends message
✅ Auto-reply fails
✅ Message automatically saved as "pending"
✅ Retried later with context
😊 Customer eventually gets response

Scenario 3: User Reconnects
✅ Messages accumulate during disconnection
✅ When WhatsApp reconnects, processes all pending messages
✅ Maintains conversation context across all messages
✅ Sends appropriate responses
😊 Conversation flow maintained
```

## 🏗️ Architecture

### Components

1. **PendingMessage Model** - Stores messages that need processing
2. **MessageRecoveryService** - Core recovery logic
3. **WhatsAppService Integration** - Auto-recovery on connection restore
4. **API Routes** - Manual control and monitoring

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Message Received                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             Process Auto-Reply                              │
│  ┌──────────────────────────────────────────────┐          │
│  │  Try: autoReplyService.processIncomingMessage│          │
│  └──────────────┬───────────────────────────────┘          │
└─────────────────┼───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ✅ SUCCESS          ❌ FAILURE
        │                   │
        ▼                   ▼
 Send Auto-Reply    Save as Pending
        │              (PendingMessage)
        │                   │
        ▼                   │
    Complete               │
                           │
        ┌──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│           Connection Restored Event                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│    Check for Pending Messages                               │
│  ┌──────────────────────────────────────────────┐          │
│  │  messageRecoveryService.needsRecovery()      │          │
│  └──────────────┬───────────────────────────────┘          │
└─────────────────┼───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ✅ Has Pending      ❌ No Pending
        │                   │
        ▼                   ▼
 Process All Pending    Done
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│         Batch Process by Contact                            │
│  • Group messages by phone number                           │
│  • Process in chronological order                           │
│  • Maintain conversation history                            │
│  • Send auto-replies with full context                      │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### PendingMessage Model

```typescript
{
  userId: ObjectId,              // Who received the message
  phoneNumber: string,           // Who sent the message
  contactId: ObjectId,           // Contact reference (optional)
  message: string,               // Message content
  messageId: string,             // WhatsApp message ID (for deduplication)
  receivedAt: Date,              // When message was received
  processingAttempts: number,    // How many times we tried (max 5)
  lastAttemptAt: Date,           // Last processing attempt
  status: 'pending' | 'processing' | 'processed' | 'failed',
  errorMessage: string,          // Error if processing failed
  autoReplyResult: {             // Result after processing
    shouldReply: boolean,
    response: string,
    autoReplyId: string,
    confidence: number
  },
  processedAt: Date              // When successfully processed
}
```

### Indexes

- **Efficient querying**: `{ userId, status, receivedAt }`
- **Deduplication**: `{ messageId }` (sparse)
- **Conversation grouping**: `{ userId, phoneNumber, receivedAt }`
- **Auto-cleanup**: TTL indexes for processed (7 days) and failed (30 days)

## 🔧 How It Works

### 1. Message Received During Normal Operation

```javascript
// In whatsappService.ts - message listener
client.on('message', async (message) => {
  try {
    // Try to process auto-reply
    const result = await autoReplyService.processIncomingMessage(...);
    
    if (result.shouldReply && result.response) {
      const sendResult = await autoReplyService.sendAutoReply(...);
      
      if (!sendResult.success) {
        // ❌ Sending failed - SAVE AS PENDING
        await messageRecoveryService.savePendingMessage(...);
      }
    }
  } catch (error) {
    // ❌ Processing failed - SAVE AS PENDING
    await messageRecoveryService.savePendingMessage(...);
  }
});
```

### 2. Connection Restored

```javascript
// In whatsappService.ts - ready event
client.on('ready', async () => {
  // ... connection setup ...
  
  setTimeout(async () => {
    // Check for pending messages
    const needsRecovery = await messageRecoveryService.needsRecovery(userId);
    
    if (needsRecovery) {
      // Process all pending messages
      const result = await messageRecoveryService.processPendingMessages(userId);
      
      // Emit completion event
      io.emit('message-recovery-complete', {
        totalPending: result.totalPending,
        processed: result.processed,
        replied: result.replied,
        failed: result.failed
      });
    }
  }, 2000); // Wait 2 seconds after connection is stable
});
```

### 3. Recovery Processing

```javascript
// In messageRecoveryService.ts
async processPendingMessages(userId: string) {
  // 1. Get all pending messages
  const pendingMessages = await PendingMessage.find({
    userId,
    status: 'pending'
  }).sort({ receivedAt: 1 }); // Chronological order
  
  // 2. Group by phone number (to maintain conversation context)
  const messagesByPhone = groupBy(pendingMessages, 'phoneNumber');
  
  // 3. Process each conversation sequentially
  for (const [phoneNumber, messages] of messagesByPhone) {
    // Get conversation history
    const conversation = await ConversationHistory.findOne({
      userId, phoneNumber
    });
    
    // Process messages in order
    for (const msg of messages) {
      // Add to conversation history
      conversation.addMessage('user', msg.message);
      
      // Process with auto-reply (with full context)
      const autoReplyResult = await autoReplyService.processIncomingMessage(
        userId, phoneNumber, msg.message
      );
      
      // Send auto-reply if needed
      if (autoReplyResult.shouldReply) {
        await autoReplyService.sendAutoReply(...);
        conversation.addMessage('assistant', autoReplyResult.response);
      }
      
      // Mark as processed
      msg.status = 'processed';
      await msg.save();
    }
    
    // Save conversation history
    await conversation.save();
  }
}
```

## 🎛️ API Endpoints

### 1. Get Recovery Statistics

```bash
GET /api/recovery/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "processing": 0,
    "processed": 23,
    "failed": 1,
    "oldestPending": "2025-10-17T10:30:00Z"
  }
}
```

### 2. Manually Trigger Recovery

```bash
POST /api/recovery/process
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Recovery completed: 5 messages processed, 4 replied",
  "data": {
    "totalPending": 5,
    "processed": 5,
    "replied": 4,
    "failed": 0,
    "errors": []
  }
}
```

### 3. Retry Failed Messages

```bash
POST /api/recovery/retry
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Retry completed: 1 messages processed, 1 replied",
  "data": {
    "totalPending": 1,
    "processed": 1,
    "replied": 1,
    "failed": 0,
    "errors": []
  }
}
```

### 4. Cleanup Old Messages

```bash
POST /api/recovery/cleanup
Authorization: Bearer <token>
Content-Type: application/json

{
  "daysOld": 7
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 23 old messages",
  "data": {
    "deletedCount": 23
  }
}
```

## 🔔 WebSocket Events

### Message Recovery Complete

```javascript
// Frontend listens for this event
socket.on('message-recovery-complete', (data) => {
  console.log(`Recovery complete: ${data.replied} auto-replies sent`);
  // Show notification to user
});
```

**Event Data:**
```javascript
{
  success: true,
  totalPending: 5,
  processed: 5,
  replied: 4,
  failed: 0
}
```

## 🎯 Key Features

### 1. ✅ Automatic Recovery on Connection Restore

- Triggers automatically when WhatsApp connects
- No manual intervention required
- Processes in background without blocking

### 2. ✅ Conversation Context Maintained

- Groups messages by phone number
- Processes in chronological order
- Preserves full chat history
- AI receives complete conversation context

### 3. ✅ Deduplication

- Uses WhatsApp message IDs
- Prevents duplicate processing
- Handles reconnections gracefully

### 4. ✅ Retry Logic

- Max 5 attempts per message
- Exponential backoff
- Manual retry option
- Tracks attempt history

### 5. ✅ Automatic Cleanup

- TTL indexes auto-delete old data
- Processed messages: 7 days
- Failed messages: 30 days
- Manual cleanup endpoint available

### 6. ✅ Monitoring & Stats

- Real-time statistics
- Processing status tracking
- Error logging
- WebSocket notifications

## 📝 Usage Examples

### Example 1: Server Restart Scenario

```bash
# Before restart: Customer sends 3 messages
Message 1: "Hi, I need help"
Message 2: "Are you there?"
Message 3: "Please respond"

# Server goes down (messages saved as pending)
# Server restarts
# Backend logs:
🔍 Checking for pending messages for user abc123...
📋 Found 3 pending messages to process
👥 Messages from 1 different contacts

📞 Processing 3 messages from 919876543210
  ⚙️ Processing message: "Hi, I need help"
  🤖 Sending auto-reply...
  ✅ Auto-reply sent successfully

  ⚙️ Processing message: "Are you there?"
  🤖 Sending auto-reply...
  ✅ Auto-reply sent successfully

  ⚙️ Processing message: "Please respond"
  🤖 Sending auto-reply...
  ✅ Auto-reply sent successfully

  💾 Conversation history saved for 919876543210

✅ Message recovery completed for user abc123:
   Total pending: 3
   Processed: 3
   Replied: 3
   Failed: 0
```

### Example 2: Manual Recovery Trigger

```bash
# API Call
curl -X POST https://yourapp.com/api/recovery/process \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response
{
  "success": true,
  "message": "Recovery completed: 5 messages processed, 4 replied",
  "data": {
    "totalPending": 5,
    "processed": 5,
    "replied": 4,
    "failed": 0,
    "errors": []
  }
}
```

### Example 3: Monitoring Dashboard

```javascript
// Frontend code to show recovery status
const checkRecoveryStats = async () => {
  const response = await fetch('/api/recovery/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  
  // Show badge if pending messages exist
  if (data.pending > 0) {
    showNotification(`${data.pending} messages waiting to be processed`);
  }
};

// Listen for recovery completion
socket.on('message-recovery-complete', (result) => {
  toast.success(`✅ Recovered ${result.replied} messages!`);
  refreshStats();
});
```

## 🔍 Monitoring & Debugging

### Backend Logs to Watch

```
🔍 Checking for pending messages for user abc123...
📋 Found 5 pending messages to process
👥 Messages from 2 different contacts

📞 Processing 3 messages from 919876543210
  ⚙️ Processing message: "Hello..."
  🤖 Sending auto-reply...
  ✅ Auto-reply sent successfully

📞 Processing 2 messages from 919876543211
  ⚙️ Processing message: "Hi..."
  ⏭️ No auto-reply needed for this message

✅ Message recovery completed for user abc123:
   Total pending: 5
   Processed: 5
   Replied: 3
   Failed: 0
```

### Database Queries

```javascript
// Check pending messages
db.pendingmessages.find({ userId: ObjectId("..."), status: "pending" })

// Check failed messages
db.pendingmessages.find({ userId: ObjectId("..."), status: "failed" })

// Check processing attempts
db.pendingmessages.find({ processingAttempts: { $gte: 3 } })
```

## ⚙️ Configuration

### Environment Variables

```bash
# In .env (optional, uses defaults if not set)
MESSAGE_RECOVERY_MAX_ATTEMPTS=5
MESSAGE_RECOVERY_PROCESSED_TTL=7  # days
MESSAGE_RECOVERY_FAILED_TTL=30    # days
```

### Adjusting Recovery Timing

```javascript
// In whatsappService.ts - ready event
setTimeout(async () => {
  // Adjust this delay (currently 2000ms = 2 seconds)
  // Increase if you want to wait longer after connection
}, 2000);
```

## 🚨 Error Handling

### Scenario 1: Recovery Fails

```javascript
// System automatically saves error message
pendingMessage.status = 'failed';
pendingMessage.errorMessage = 'AI timeout after 30 seconds';
await pendingMessage.save();

// Can be retried later
POST /api/recovery/retry
```

### Scenario 2: Max Attempts Exceeded

```javascript
// After 5 attempts, message is marked as permanently failed
// Manual intervention required
// Check error message in database
// Adjust auto-reply settings if needed
// Retry manually via API
```

### Scenario 3: Conversation History Missing

```javascript
// System creates new conversation history automatically
if (!conversation) {
  conversation = new ConversationHistory({
    userId, phoneNumber, messages: []
  });
}
```

## 📈 Performance Considerations

### Scalability

- **Batch Processing**: Messages grouped by contact
- **Sequential Processing**: Maintains order, prevents race conditions
- **Background Processing**: Doesn't block connection
- **TTL Indexes**: Auto-cleanup prevents database bloat

### Memory Usage

- **Conversation History**: Limited to last 10 messages
- **Caching**: Auto-reply rules cached (5 min TTL)
- **Streaming**: Large batches processed in chunks

### Database Load

- **Indexed Queries**: Fast lookups
- **Compound Indexes**: Optimized for common queries
- **TTL Cleanup**: Automatic, runs in background

## ✅ Testing

### Manual Test Scenarios

1. **Test Recovery on Reconnect:**
   ```bash
   # 1. Disconnect WhatsApp
   # 2. Have someone send you messages
   # 3. Reconnect WhatsApp
   # 4. Check logs for recovery process
   # 5. Verify auto-replies were sent
   ```

2. **Test Failed Auto-Reply:**
   ```bash
   # 1. Temporarily break AI service (invalid API key)
   # 2. Have someone send message
   # 3. Check message saved as pending
   # 4. Fix AI service
   # 5. Manually trigger recovery
   # 6. Verify message processed
   ```

3. **Test Conversation Context:**
   ```bash
   # 1. Start conversation with customer
   # 2. Server crashes
   # 3. Customer sends more messages
   # 4. Server restarts
   # 5. Verify AI responses reference earlier messages
   ```

## 🎓 Best Practices

1. **Monitor Stats Regularly**: Check `/api/recovery/stats` daily
2. **Set Up Alerts**: Alert if pending messages > 10
3. **Review Failed Messages**: Check failed messages weekly
4. **Cleanup Regularly**: Run cleanup monthly
5. **Test Recovery**: Test recovery process monthly
6. **Update Retry Logic**: Adjust max attempts based on your needs

## 🔗 Related Documentation

- `AUTO_REPLY_SYSTEM_GUIDE.md` - Auto-reply configuration
- `HOW_AUTO_REPLY_WORKS.md` - Auto-reply mechanics
- `CONVERSATION_MEMORY_UPDATE.md` - Chat history system

---

**System Status**: ✅ Active & Production Ready

**Last Updated**: October 17, 2025

**Created By**: AI Senior Software Engineer

