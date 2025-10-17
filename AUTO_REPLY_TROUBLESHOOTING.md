# 🔧 Auto-Reply Troubleshooting Guide

## ⚠️ Auto-Reply Not Working - Quick Fix

Follow these steps to diagnose and fix the issue:

---

## 🔍 Step 1: Check WhatsApp Connection

### Check Connection Status
```bash
# Terminal
cd backend
pm2 logs whatsapp-backend --lines 50 | grep "WhatsApp"
```

**Look for**:
```
✅ WhatsApp client is ready for user: abc123
🎧 Setting up message listener for user: abc123
```

**If you see**:
```
❌ WhatsApp disconnected
⚠️ No WhatsApp connection
```

**Fix**: Reconnect WhatsApp
1. Go to frontend → WhatsApp page
2. Click "Connect WhatsApp"
3. Scan QR code
4. Wait for "Connected" status

---

## 🔍 Step 2: Check Auto-Reply Configuration

### Via API
```bash
curl http://localhost:5000/api/auto-reply \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check These Fields

**1. Is it active?**
```json
{
  "isActive": true  // MUST be true
}
```

**2. Has trigger keywords?**
```json
{
  "triggerKeywords": ["hello", "hi", "hey"]  // Must have at least one
}
```

**3. Has response type?**
```json
{
  "responseType": "ai_generated",  // or "text" or "template"
  "responseTemplate": "Hello! How can I help?"  // Required if not ai_generated
}
```

**4. AI Settings (if using AI)**
```json
{
  "aiSettings": {
    "useAI": true  // MUST be true for AI responses
  }
}
```

---

## 🔍 Step 3: Check OpenAI Configuration

### Verify OpenAI API Key
```bash
cd backend
cat environment-config.env | grep OPENAI_API_KEY
```

**Should see**:
```
OPENAI_API_KEY=sk-...  // Your actual API key
```

**If missing or empty**:
```bash
# Add to environment-config.env
echo "OPENAI_API_KEY=sk-your-actual-api-key" >> environment-config.env

# Restart backend
pm2 restart whatsapp-backend
```

### Test OpenAI Connection
```bash
# Check logs for OpenAI errors
pm2 logs whatsapp-backend --lines 100 | grep -i "openai\|api key\|401"
```

---

## 🔍 Step 4: Check Message Listener

### Verify Message Listener is Set Up
```bash
pm2 logs whatsapp-backend --lines 100 | grep "listener"
```

**Look for**:
```
🎧 Setting up message listener for user: abc123
✅ Message listener set up for user: abc123
```

**If NOT found**:
1. Message listener might not be initialized
2. Connection might have failed during setup

**Fix**:
```bash
# Restart backend
pm2 restart whatsapp-backend

# Check logs again
pm2 logs whatsapp-backend --lines 50
```

---

## 🔍 Step 5: Test With a Message

### Send Test Message to Your WhatsApp

1. From another phone, send: **"hello"**
2. Watch backend logs in real-time:

```bash
pm2 logs whatsapp-backend --lines 0
```

### What You Should See

**✅ Working (Expected)**:
```
📨 Incoming message from 919876543210: hello
🤖 Processing auto-reply for user abc123, phone: 919876543210
🎯 AI Auto-reply found, processing with AI...
✅ Auto-reply sent successfully to 919876543210
```

### What Indicates a Problem

**❌ No logs at all**:
- Message listener not set up
- WhatsApp not connected
- Connection lost

**❌ "No active auto-replies found"**:
```
🤖 Processing auto-reply for user abc123
No active auto-replies found for user
```
**Fix**: Create or enable auto-reply rule

**❌ "No auto-reply triggered"**:
```
🤖 Processing auto-reply for user abc123
⏭️ No auto-reply triggered for 919876543210
```
**Fix**: Check trigger keywords don't match

**❌ "Failed to send auto-reply"**:
```
🤖 Auto-reply triggered for 919876543210
❌ Failed to send auto-reply to 919876543210: Error message
💾 Saving message as pending for later recovery
```
**Fix**: Check error message, might be network or WhatsApp issue

---

## 🔍 Step 6: Common Issues & Fixes

### Issue 1: No Auto-Reply Rules

**Symptom**: Logs show "No active auto-replies found"

**Check**:
```bash
# In MongoDB
mongosh whatsapp-broadcast
db.autoreplies.find({ isActive: true }).count()
```

**Fix**: Create an auto-reply rule

**Via Frontend**:
1. Go to Auto-Reply page
2. Click "Create New"
3. Fill in:
   - Name: "Welcome Message"
   - Trigger Keywords: hello, hi, hey
   - Response Type: AI Generated
   - AI Settings: Use AI = true
   - Active: true
4. Save

**Via API**:
```bash
curl -X POST http://localhost:5000/api/auto-reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Message",
    "triggerKeywords": ["hello", "hi", "hey", "hi there"],
    "responseType": "ai_generated",
    "category": "general",
    "aiSettings": {
      "useAI": true,
      "personality": "friendly",
      "contextAware": true,
      "includeGreeting": true,
      "includeClosing": true
    },
    "isActive": true,
    "priority": 5
  }'
```

### Issue 2: Keywords Don't Match

**Symptom**: Logs show "No auto-reply triggered"

**Problem**: Your trigger keywords don't match the incoming message

**Example**:
- Trigger keywords: ["booking", "appointment"]
- Incoming message: "hello" ❌ (no match)
- Incoming message: "I want to book" ✅ (contains "book")

**Fix**: Add more keywords or use broader matching

**Better Keywords**:
```json
{
  "triggerKeywords": [
    "hello", "hi", "hey", "good morning", "good evening",
    "price", "cost", "how much", "rates",
    "booking", "book", "appointment", "schedule",
    "help", "support", "assist",
    "open", "closed", "hours", "timing"
  ]
}
```

**Or use Patterns (Regex)**:
```json
{
  "triggerPatterns": [
    ".*help.*",     // Matches anything with "help"
    ".*price.*",    // Matches anything with "price"
    ".*book.*"      // Matches anything with "book"
  ]
}
```

### Issue 3: Time Restrictions Blocking

**Symptom**: Auto-reply works sometimes, not always

**Check**:
```bash
# Get auto-reply details
curl http://localhost:5000/api/auto-reply/YOUR_AUTOREPLY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Look for**:
```json
{
  "conditions": {
    "timeRestrictions": {
      "startTime": "09:00",  // Only works 9 AM to 6 PM
      "endTime": "18:00",
      "daysOfWeek": [1,2,3,4,5]  // Only Mon-Fri
    }
  }
}
```

**Fix**: Remove time restrictions for testing
```bash
curl -X PUT http://localhost:5000/api/auto-reply/YOUR_AUTOREPLY_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conditions": {
      "timeRestrictions": null
    }
  }'
```

### Issue 4: OpenAI API Error

**Symptom**: Logs show OpenAI errors

**Common Errors**:

**A. Invalid API Key**
```
Error: OpenAI API error: 401 Unauthorized
```
**Fix**: 
```bash
# Update API key in environment-config.env
OPENAI_API_KEY=sk-your-correct-api-key

# Restart
pm2 restart whatsapp-backend
```

**B. Rate Limit Exceeded**
```
Error: OpenAI API error: 429 Too Many Requests
```
**Fix**: 
- Wait a few minutes
- Upgrade OpenAI plan
- Use simpler response type temporarily

**C. No Credits**
```
Error: OpenAI API error: insufficient_quota
```
**Fix**: 
- Add credits to OpenAI account
- Switch to text responses temporarily

### Issue 5: Message Listener Not Set Up

**Symptom**: No logs when you send messages

**Check**:
```bash
pm2 logs whatsapp-backend --lines 100 | grep "listener"
```

**If missing**, restart the connection:
```bash
# Via API
curl -X POST http://localhost:5000/api/whatsapp/disconnect \
  -H "Authorization: Bearer YOUR_TOKEN"

# Wait 5 seconds

curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Step 7: Full System Check

### Run This Complete Check

```bash
#!/bin/bash
echo "🔍 AUTO-REPLY SYSTEM CHECK"
echo "=========================="

# 1. Check if backend is running
echo -e "\n1. Backend Status:"
pm2 list | grep whatsapp-backend

# 2. Check WhatsApp connection
echo -e "\n2. WhatsApp Connection (last 20 lines):"
pm2 logs whatsapp-backend --lines 20 | grep -E "WhatsApp|connected|listener"

# 3. Check auto-reply configuration
echo -e "\n3. Auto-Reply Rules:"
mongosh whatsapp-broadcast --quiet --eval "db.autoreplies.find({isActive:true}).count()" 2>/dev/null || echo "Can't connect to MongoDB"

# 4. Check OpenAI key
echo -e "\n4. OpenAI Configuration:"
cd backend
grep "OPENAI_API_KEY" environment-config.env | sed 's/sk-.*$/sk-****.../' 2>/dev/null || echo "No .env file found"

# 5. Check recent errors
echo -e "\n5. Recent Errors:"
pm2 logs whatsapp-backend --lines 50 --err --nostream 2>/dev/null | tail -10

echo -e "\n=========================="
echo "✅ Check complete"
```

**Save as** `check-autoreply.sh` and run:
```bash
chmod +x check-autoreply.sh
./check-autoreply.sh
```

---

## 🔍 Step 8: Create a Working Auto-Reply Rule

### Minimal Working Configuration

```bash
curl -X POST http://localhost:5000/api/auto-reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Auto Reply",
    "description": "Testing auto-reply system",
    "isActive": true,
    "triggerKeywords": ["test", "hello", "hi"],
    "responseType": "text",
    "responseTemplate": "Hello! This is an automatic reply. How can I help you?",
    "category": "general",
    "priority": 5
  }'
```

**Test it**:
1. Send "hello" to your WhatsApp
2. Should get immediate response

**If this works**, your system is fine! Issue is with your specific configuration.

**If this doesn't work**, system issue - check:
- WhatsApp connection
- Message listener
- Backend logs

---

## 🔍 Step 9: Enable Debug Mode

### Temporary Debug Logging

Add to `backend/src/services/autoReplyService.ts`:

```typescript
// At the start of processIncomingMessage
console.log('DEBUG: Processing message', {
  userId,
  phoneNumber,
  message: incomingMessage,
  timestamp: new Date()
});
```

Then:
```bash
# Rebuild and restart
cd backend
npm run build
pm2 restart whatsapp-backend

# Watch logs
pm2 logs whatsapp-backend --lines 0
```

---

## ✅ Quick Fix Checklist

Try these in order:

1. [ ] **Restart Backend**
   ```bash
   pm2 restart whatsapp-backend
   pm2 logs whatsapp-backend
   ```

2. [ ] **Check WhatsApp Connected**
   - Frontend → WhatsApp page
   - Should show "Connected" (green)

3. [ ] **Check Auto-Reply Exists and is Active**
   ```bash
   curl http://localhost:5000/api/auto-reply \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. [ ] **Check OpenAI API Key**
   ```bash
   grep OPENAI_API_KEY backend/environment-config.env
   ```

5. [ ] **Test with Simple Keywords**
   - Add keywords: ["test", "hello", "hi"]
   - Send "hello" message

6. [ ] **Check Logs When Testing**
   ```bash
   pm2 logs whatsapp-backend --lines 0
   ```

7. [ ] **Try Text Response (Not AI)**
   - Change responseType to "text"
   - Set responseTemplate
   - Test again

---

## 📞 Get Help

### Collect This Information

```bash
# 1. Backend version and status
pm2 list

# 2. Recent logs (last 50 lines)
pm2 logs whatsapp-backend --lines 50 > autoreply-logs.txt

# 3. Auto-reply configuration
curl http://localhost:5000/api/auto-reply \
  -H "Authorization: Bearer YOUR_TOKEN" > autoreply-config.json

# 4. System info
node --version
npm --version
mongosh --version
```

### Common Solutions Summary

| Problem | Quick Fix |
|---------|-----------|
| No logs when sending messages | Restart backend, reconnect WhatsApp |
| "No active auto-replies found" | Create auto-reply rule, check isActive=true |
| "No auto-reply triggered" | Add more keywords, check time restrictions |
| OpenAI errors | Check API key, check credits |
| Auto-reply works sometimes | Remove time restrictions |
| Message received but no processing | Check message listener setup |

---

## 🎯 Most Common Issue

**95% of auto-reply issues are due to**:

1. **Auto-reply rule not created** or **isActive = false**
2. **Trigger keywords don't match** incoming message
3. **OpenAI API key** missing or invalid (for AI responses)
4. **WhatsApp not connected** or connection lost

**Quick Test**:
```bash
# Create simple text auto-reply (no AI required)
curl -X POST http://localhost:5000/api/auto-reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple Test",
    "isActive": true,
    "triggerKeywords": ["test123"],
    "responseType": "text",
    "responseTemplate": "AUTO-REPLY IS WORKING!",
    "category": "test",
    "priority": 10
  }'

# Then send "test123" to your WhatsApp
# Should get "AUTO-REPLY IS WORKING!" immediately
```

If this works → Your system is fine, fix your configuration  
If this doesn't work → System issue, check connection and logs

---

**Need more help?** Share your:
1. Backend logs (last 50 lines)
2. Auto-reply configuration
3. What message you're sending for testing

---

**Last Updated**: October 17, 2025  
**Status**: Troubleshooting Guide

