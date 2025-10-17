# 🚀 Complete Auto-Reply Setup - Step by Step

## ✅ I've Fixed the Code - Now Follow These Steps

I've added diagnostic and auto-setup endpoints to make this easy.

---

## 📋 Complete Setup (5 Minutes)

### Step 1: Login to Frontend

1. Open browser: `http://localhost:3000`
2. Login with your credentials
3. Open browser console (Press F12)
4. Get your token:
```javascript
localStorage.getItem('token')
```
5. Copy the token (it starts with "eyJ...")

### Step 2: Set Token in Terminal

```bash
# Replace with your actual token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 3: Check System Status

```bash
curl http://localhost:5000/api/auto-reply-test/check-setup \
  -H "Authorization: Bearer $TOKEN" | json_pp
```

**This will show you**:
- WhatsApp connection status
- Auto-reply rules status
- Exact issues if any
- Recommendations to fix

### Step 4: Auto-Create Default Auto-Reply Rule

```bash
curl -X POST http://localhost:5000/api/auto-reply-test/create-default \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**This creates a rule with these keywords**:
- hello, hi, hey, hii, hiii
- good morning, good evening
- test, testing
- help, support, assist
- info, information
- price, cost, how much, rates
- booking, book, appointment, schedule

**Response**: "Hello! Thank you for contacting us. How can I help you today?"

### Step 5: Verify WhatsApp Connection

```bash
curl http://localhost:5000/api/whatsapp/status \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "state": "open"
  }
}
```

**If NOT connected**:
1. Go to frontend: `http://localhost:3000/whatsapp`
2. Click "Connect WhatsApp"
3. Scan QR code
4. Wait for "Connected" status

### Step 6: Test Auto-Reply (Simulate)

```bash
curl -X POST http://localhost:5000/api/auto-reply-test/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919876543210",
    "message": "hello"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "shouldReply": true,
    "response": "Hello! Thank you for contacting us..."
  }
}
```

**If `shouldReply: false`** → Keywords don't match or no auto-reply rules

### Step 7: Test with Real WhatsApp Message

1. From another phone, send "hello" to your WhatsApp number
2. You should receive auto-reply immediately
3. Check backend logs:
```bash
cd /home/ankit/Desktop/DOS/Projects/new-whatsapp-broadcast/backend
# Check the terminal where backend is running
# Look for:
# 📨 Incoming message from...
# 🤖 Processing auto-reply...
# ✅ Auto-reply sent successfully
```

---

## 🔧 If Auto-Reply Still Doesn't Work

### Issue: WhatsApp Not Connected

**Check**:
```bash
curl http://localhost:5000/api/whatsapp/debug \
  -H "Authorization: Bearer $TOKEN"
```

**Fix**:
1. Frontend → WhatsApp page
2. If disconnected → Connect WhatsApp
3. Scan QR code
4. Wait for "Connected"

### Issue: Message Listener Not Set Up

**Symptoms**: No logs when messages arrive

**Fix**:
```bash
# Kill and restart backend
pkill -f "ts-node-dev"
cd /home/ankit/Desktop/DOS/Projects/new-whatsapp-broadcast/backend
npm run dev
```

Wait 30 seconds, then check logs for:
```
✅ WhatsApp client is ready
🎧 Setting up message listener
✅ Message listener set up
```

### Issue: No Auto-Reply Rules

**Check**:
```bash
curl http://localhost:5000/api/auto-reply \
  -H "Authorization: Bearer $TOKEN"
```

**Fix**: Run the auto-create command from Step 4 above

### Issue: Keywords Don't Match

**Your message**: "Hello sir"  
**Keywords**: ["hello", "hi"]  
**Result**: ✅ Will trigger (contains "hello")

**Your message**: "Thanks"  
**Keywords**: ["hello", "hi"]  
**Result**: ❌ Won't trigger (no match)

**Fix**: Add more keywords or use the default rule I created (has 20+ keywords)

---

## 🎯 Complete Command Sequence (Copy & Paste)

```bash
# 1. Set your token (get from frontend localStorage)
export TOKEN="paste-your-token-here"

# 2. Check system status
echo "Checking system status..."
curl -s http://localhost:5000/api/auto-reply-test/check-setup \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 3. Create default auto-reply rule
echo ""
echo "Creating default auto-reply rule..."
curl -s -X POST http://localhost:5000/api/auto-reply-test/create-default \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 4. Verify WhatsApp connection
echo ""
echo "Checking WhatsApp connection..."
curl -s http://localhost:5000/api/whatsapp/status \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Test auto-reply simulation
echo ""
echo "Testing auto-reply (simulation)..."
curl -s -X POST http://localhost:5000/api/auto-reply-test/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"919876543210","message":"hello"}' | python3 -m json.tool

echo ""
echo "================================"
echo "Setup complete! Now send 'hello' to your WhatsApp to test for real."
```

---

## 📨 Bulk 10,000 Messages - Configuration

### Current System Status

✅ **Already configured for 10,000+ messages!**

The system uses Bull queue with these settings:
- Concurrency: 5-10 messages at once
- Automatic retries: 3 attempts
- Progress tracking: Real-time
- Error recovery: Automatic

### How to Send 10,000 Messages

**Via Frontend**:
1. Go to Messages page
2. Import or select 10,000 contacts
3. Write message
4. System will:
   - Generate unique AI message for each contact
   - Queue all 10,000 in Redis
   - Process with delays (10-60s per message)
   - Track progress
   - Retry failures

**Time Estimate**:
- With 10s delay: ~2.8 hours
- With 30s delay: ~17 hours
- With 60s delay: ~33 hours

**Recommended**: 10-15 second delay (safe from WhatsApp ban)

### Monitor Progress

```bash
# Check queue
redis-cli LLEN bull:message\ processing:wait

# Watch processing
# (In the terminal where backend is running)
# Look for: 📤 [1/10000] Processing message...
```

---

## ✅ System Verification

After running the commands above, verify:

1. **Auto-Reply Rule Created**:
   - Check response from create-default endpoint
   - Should see: "Default auto-reply created successfully"

2. **WhatsApp Connected**:
   - Response should show: `"isConnected": true`
   - If false → Connect via frontend

3. **Simulation Works**:
   - Response should show: `"shouldReply": true`
   - If false → Check keywords match

4. **Real Test Works**:
   - Send "hello" to WhatsApp
   - Receive auto-reply
   - See logs in backend terminal

---

## 🆘 Quick Troubleshooting

| Issue | Command to Check | Fix |
|-------|-----------------|-----|
| Backend not running | `curl http://localhost:5000/health` | `npm run dev` |
| WhatsApp not connected | `curl .../api/whatsapp/status` | Connect via frontend |
| No auto-reply rules | `curl .../api/auto-reply` | Run create-default |
| Keywords don't match | Test with "hello" | Use default rule |
| No logs when testing | Check backend terminal | Restart backend |

---

## 🎉 What You Have Now

### Auto-Reply System:
- ✅ Diagnostic endpoint (`/api/auto-reply-test/check-setup`)
- ✅ Auto-create default rule (`/api/auto-reply-test/create-default`)
- ✅ Simulation testing (`/api/auto-reply-test/simulate`)
- ✅ 20+ trigger keywords (default rule)
- ✅ AI support (GPT-4)
- ✅ Conversation memory
- ✅ Multi-user support

### Bulk Messaging:
- ✅ Support for 10,000+ contacts
- ✅ Queue-based processing
- ✅ Unique messages per contact
- ✅ Progress tracking
- ✅ Error recovery
- ✅ Automatic retries

---

## 🚀 Next Steps

1. **Get your JWT token** from frontend (localStorage)
2. **Run the command sequence** above
3. **Test with "hello"** message
4. **Verify auto-reply works**
5. **Start using it!**

**Token Location**:
- Frontend → Browser Console (F12) → `localStorage.getItem('token')`

---

**Date**: October 17, 2025  
**Status**: ✅ **Diagnostic Tools Added**  
**Auto-Setup**: ✅ **Available**  
**Ready to Test**: 🚀 **Yes!**

