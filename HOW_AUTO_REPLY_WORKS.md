# 🤖 How Auto-Reply System Works

## Overview
The Auto-Reply system automatically responds to incoming WhatsApp messages using AI and/or predefined knowledge bases. It's perfect for customer support, FAQ handling, and engaging with customers 24/7.

---

## 🎯 System Architecture

```
┌─────────────────┐
│  WhatsApp User  │
│   sends message │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────────┐
│     WhatsApp Service (Backend)         │
│  - Receives incoming message           │
│  - Checks if from user (not self)      │
│  - Validates message type              │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│      Auto-Reply Service                │
│  - Checks if auto-reply is enabled     │
│  - Gets active auto-reply rules        │
│  - Processes message                   │
└────────┬───────────────────────────────┘
         │
         ├─── AI Auto-Reply? ───────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│  Keyword-Based   │         │   AI-Powered     │
│   Auto-Reply     │         │   Auto-Reply     │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │                            ├─ Use RAG? ──┐
         │                            │              │
         │                            │              ▼
         │                            │    ┌──────────────────┐
         │                            │    │  Reply Data KB   │
         │                            │    │  (Spa/Salon Q&A) │
         │                            │    └────────┬─────────┘
         │                            │             │
         │                            ▼             ▼
         │                    ┌────────────────────────┐
         │                    │    AI Service          │
         │                    │ - Generates response   │
         │                    │ - Uses context + RAG   │
         │                    └──────────┬─────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Send Reply via WhatsApp     │
         │   Log the interaction         │
         │   Update statistics           │
         └───────────────────────────────┘
```

---

## 📝 Step-by-Step Process

### **Step 1: Message Reception**
```typescript
// WhatsApp Service listens for incoming messages
client.on('message', async (message: Message) => {
  // Filter: Only incoming messages (not sent by us)
  if (message.fromMe) return;
  
  // Filter: Only text messages
  if (message.type !== 'chat') return;
  
  // Extract phone number and message text
  const phoneNumber = message.from.replace('@c.us', '');
  const messageText = message.body;
  
  // Process auto-reply
  await autoReplyService.processIncomingMessage(userId, phoneNumber, messageText);
});
```

### **Step 2: Auto-Reply Processing**
```typescript
// Auto-Reply Service checks if response is needed
async processIncomingMessage(userId, phoneNumber, incomingMessage) {
  // 1. Get active auto-reply rules for the user
  const autoReplies = await this.getActiveAutoReplies(userId);
  
  // 2. Check if AI auto-reply is enabled
  const aiAutoReply = autoReplies.find(ar => 
    ar.responseType === 'ai_generated' && ar.isActive
  );
  
  if (aiAutoReply) {
    // Use AI to generate response
    return await this.processAIAutoReply(...);
  }
  
  // 3. Check keyword-based rules
  for (const autoReply of autoReplies) {
    if (this.shouldTriggerAutoReply(autoReply, incomingMessage)) {
      return { shouldReply: true, response: autoReply.responseTemplate };
    }
  }
  
  return { shouldReply: false };
}
```

### **Step 3: AI Response Generation (if enabled)**
```typescript
async processAIAutoReply(aiAutoReply, userId, phoneNumber, incomingMessage) {
  // 1. Get contact information
  const contact = await Contact.findOne({ userId, phone: phoneNumber });
  
  // 2. Build context
  const contextData = {
    contactName: contact?.name || 'Customer',
    contactCategory: contact?.category || 'general',
    previousMessages: await this.getPreviousMessageCount(userId, phoneNumber),
    messageTime: new Date(),
    messageLength: incomingMessage.length
  };
  
  // 3. Use RAG if enabled (Retrieval-Augmented Generation)
  let ragContext = '';
  if (aiAutoReply.aiSettings?.useRAG) {
    // Search knowledge base for relevant information
    const replyData = await this.getReplyData(userId);
    const bestMatch = await this.findBestReplyFromData(userId, incomingMessage);
    
    if (bestMatch.bestMatch) {
      // Add relevant info from spa/salon Q&A database
      ragContext = `\n\nRelevant information: ${bestMatch.bestMatch.value}`;
    }
  }
  
  // 4. Generate AI response
  const aiResult = await aiService.generateAutoReply(
    incomingMessage + ragContext,
    contextData.contactName,
    contextData,
    aiAutoReply.aiSettings?.personality || 'professional'
  );
  
  return { shouldReply: true, response: aiResult.response };
}
```

### **Step 4: Response Delivery**
```typescript
// Send the auto-reply back to the customer
if (autoReplyResult.shouldReply && autoReplyResult.response) {
  const sendResult = await whatsappService.sendMessage(
    userId,
    phoneNumber,
    autoReplyResult.response
  );
  
  // Log the interaction for analytics
  await this.logAutoReply(userId, autoReplyId, contactId, ...);
  
  // Update statistics
  await this.updateAutoReplyStats(autoReplyId, sendResult.success);
}
```

---

## 🧠 How AI Auto-Reply Works

### **Without RAG (Basic AI)**
```
Customer: "What are your timings?"
         ↓
AI Service analyzes message
         ↓
Generates response based on:
- Customer name
- Message context
- Personality setting (professional/friendly)
- General knowledge
         ↓
Response: "Hi [Name], we're open Monday to Saturday, 10 AM to 8 PM. 
           How can we help you today?"
```

### **With RAG (Knowledge-Enhanced AI)**
```
Customer: "What are your timings?"
         ↓
System searches Reply Data KB
         ↓
Finds exact match: "salon timings" → "We are open Monday to Saturday 
from 10:00 AM to 8:00 PM, and Sunday from 11:00 AM to 7:00 PM."
         ↓
AI uses this information + context
         ↓
Response: "Hi [Name], we're open Monday to Saturday from 10:00 AM to 8:00 PM, 
           and Sunday from 11:00 AM to 7:00 PM. Would you like to book an appointment?"
```

### **Example with Spa/Salon Data**

**Customer Query 1:**
```
Input: "hair coloring price?"
  ↓
RAG matches: "hair coloring cost" entry in spa_salon category
  ↓
AI Response: "Hi! Our hair coloring starts at ₹1500 for basic color. 
We also offer highlights (₹2500+) and balayage (₹3500+). 
Prices vary based on hair length. Would you like to book a consultation?"
```

**Customer Query 2:**
```
Input: "when can i come"
  ↓
RAG matches: "salon timings" + "book appointment" entries
  ↓
AI Response: "We're open Monday to Saturday, 10 AM - 8 PM, and Sunday 11 AM - 7 PM. 
We recommend booking in advance, especially for weekends. 
What service are you interested in?"
```

**Customer Query 3:**
```
Input: "facial types and rates"
  ↓
RAG matches: "facial prices" entry
  ↓
AI Response: "We offer several facials:
• Classic Cleanup - ₹800
• Gold Facial - ₹1200
• Diamond Facial - ₹1800
• Vitamin C Facial - ₹1500
• Anti-Aging Facial - ₹2200

Each session takes 45-60 minutes. Which one interests you?"
```

---

## 🔧 How to Set Up Auto-Reply

### **Option 1: Simple AI Auto-Reply (No Knowledge Base)**

1. **Go to Auto-Reply page**
2. **Enable Auto-Reply** - Toggle the switch at the top
3. **Configure Settings:**
   - Personality: Professional/Friendly/Casual/Formal
   - Include Greeting: Yes (personalized with customer name)
   - Include Closing: Yes (professional sign-off)
   - Use RAG: No (AI uses only general knowledge)
4. **Done!** - AI will respond to all incoming messages

**Best for:** General inquiries, greetings, simple questions

---

### **Option 2: AI Auto-Reply + Knowledge Base (RAG)**

1. **Create Knowledge Base (Reply Data):**
   ```
   Auto-Reply Page → Data Tab → Add Manual Data
   ```
   - Name: "Spa & Salon Services Q&A"
   - Category: Spa & Salon
   - Add Q&A pairs:
     ```
     Question: haircut prices
     Answer: Our haircut prices start from ₹300 for men and ₹500 for women...
     
     Question: facial types
     Answer: We offer Classic Cleanup (₹800), Gold Facial (₹1200)...
     ```

2. **Enable Auto-Reply with RAG:**
   - Enable Auto-Reply toggle
   - Set **Use RAG: Yes**
   - Configure personality and greetings

3. **How it works:**
   ```
   Customer message → AI searches your Q&A database → 
   Finds best match → Uses that info to generate response
   ```

**Best for:** Specific business information (pricing, services, policies)

---

### **Option 3: Upload Excel Knowledge Base**

1. **Prepare Excel File:**
   ```
   Column A (Questions)    | Column B (Answers)
   ------------------------|---------------------------
   haircut prices         | Our haircut prices start...
   facial types           | We offer various facials...
   booking appointment    | You can book by calling...
   ```

2. **Upload:**
   ```
   Data Tab → Upload Excel → Select file → Upload
   ```

3. **Enable Auto-Reply with RAG** (Use RAG: Yes)

**Best for:** Large knowledge bases, frequent updates

---

## 📊 Key Features

### **1. Intelligent Matching**
- Keyword detection in customer messages
- Partial matching ("price" matches "haircut prices")
- Priority-based responses (high priority answers first)
- Tag-based categorization

### **2. Context Awareness**
- Uses customer name (if saved in contacts)
- Considers previous conversation history
- Time-aware responses
- Category-specific responses

### **3. Safety & Compliance**
- Spam detection prevents ban-triggering words
- Professional tone maintained
- Rate limiting prevents excessive messages
- Logs all interactions for review

### **4. Performance Optimization**
- Caching for fast responses (5-minute TTL)
- Background processing
- Batch message handling
- Automatic cleanup of old data

---

## 📈 Analytics & Logs

The system tracks:
- **Total Triggers** - How many times auto-reply was activated
- **Successful Replies** - Messages sent successfully
- **Failed Replies** - Messages that failed to send
- **Last Triggered** - When it was last used
- **Response Time** - How long it took to generate response
- **Match Confidence** - How confident the AI was about the response

View logs in: **Auto-Reply Page → Logs Tab**

---

## 💡 Best Practices

### **For Spa/Salon Businesses:**

1. **Create comprehensive Q&A database:**
   - All services with prices
   - Timings and booking info
   - Location and contact details
   - Special offers and packages
   - Policies (cancellation, payment, etc.)

2. **Use friendly personality:**
   - Set personality to "friendly" or "professional"
   - Always include greeting with customer name
   - Keep responses conversational

3. **Update regularly:**
   - Change pricing info when updated
   - Update current offers monthly
   - Add new services/packages

4. **Monitor performance:**
   - Check logs weekly
   - Review failed responses
   - Update Q&A based on common questions

### **Example Complete Setup:**

```yaml
Auto-Reply Settings:
  Enabled: Yes
  Personality: Friendly
  Include Greeting: Yes
  Include Closing: Yes
  Use RAG: Yes

Knowledge Base:
  Name: "Complete Spa Services Info"
  Category: spa_salon
  Total Entries: 28 Q&A pairs
  Covers:
    - All services (hair, facial, makeup, waxing)
    - Pricing for each service
    - Timings and booking
    - Offers and packages
    - Location and payment
```

---

## 🚀 Quick Start Example

### **Scenario: Customer asks about facials**

**Without Auto-Reply:**
```
Customer: "facial price?"
[No response until you manually reply]
```

**With Auto-Reply (No RAG):**
```
Customer: "facial price?"
AI: "Hi! We offer facial services. For specific pricing, 
     please let me know which type you're interested in!"
```

**With Auto-Reply (RAG Enabled):**
```
Customer: "facial price?"
AI searches spa_salon knowledge base...
Finds: "facial prices" entry with detailed pricing
AI: "Hi! We offer various facials:
     • Classic Cleanup - ₹800
     • Gold Facial - ₹1200
     • Diamond Facial - ₹1800
     • Vitamin C Facial - ₹1500
     • Anti-Aging Facial - ₹2200
     
     Each session takes 45-60 minutes. 
     Which one would you like to try?"
```

---

## 🔐 Privacy & Security

- Messages are processed in real-time (not stored unless logged)
- Customer data is encrypted
- Only the business owner can access logs
- AI responses are filtered for compliance
- No data is shared with third parties

---

## 🛠️ Troubleshooting

### **Auto-reply not working?**
1. Check if toggle is enabled
2. Verify WhatsApp is connected
3. Check if you have an active auto-reply rule
4. Review logs for errors

### **Responses not relevant?**
1. Enable RAG (Use RAG toggle)
2. Add more Q&A data to knowledge base
3. Use specific keywords in Q&A entries
4. Increase priority for important answers

### **Getting too many responses?**
1. Set up keyword filters
2. Use time restrictions
3. Add contact filters
4. Adjust trigger sensitivity

---

## 📞 Support

For issues or questions:
- Check logs in Auto-Reply page
- Review knowledge base entries
- Test with different messages
- Update AI settings for better results

---

**🎉 You're all set! Your AI-powered auto-reply system is now ready to handle customer inquiries 24/7!**

