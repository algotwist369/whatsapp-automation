# 🧪 Auto-Reply System Testing Guide

## Quick Test Steps

### 1. **Start the Backend Server**
```bash
cd backend
npm run dev
```

### 2. **Start the Frontend Server**
```bash
cd frontend
npm run dev
```

### 3. **Access the Auto-Reply Interface**
1. Open your browser and go to `http://localhost:3000`
2. Login to your account
3. Navigate to **Auto-Reply** in the sidebar menu

### 4. **Test Auto-Reply Creation**
1. Click **"Create Auto-Reply"**
2. Fill in the form:
   - **Name**: "Welcome Message"
   - **Description**: "Greets new customers"
   - **Category**: "General"
   - **Response Type**: "AI Generated"
   - **Trigger Keywords**: "hello, hi, hey, good morning"
   - **Response Template**: "Hi {contactName}! Thanks for reaching out. How can I help you today?"
3. Click **"Create Auto-Reply"**

### 5. **Test Excel Upload**
1. Create a simple Excel file with columns:
   - **Question**: "What are your prices?"
   - **Answer**: "Our pricing starts at $99/month for basic plans."
2. Click **"Upload Excel"**
3. Select your Excel file
4. Set name and category
5. Click **"Upload File"**

### 6. **Test WhatsApp Connection**
1. Go to **WhatsApp** section
2. Click **"Connect WhatsApp"**
3. Scan the QR code with your phone
4. Wait for "Connected" status

### 7. **Test Auto-Reply Functionality**
1. Send a test message to your WhatsApp number from another phone
2. Message should contain trigger keywords like "hello" or "hi"
3. You should receive an auto-reply within seconds
4. Check the **Logs** tab to see the response logs

## Expected Results

### ✅ **Success Indicators**
- Auto-reply page loads without errors
- Can create auto-reply rules
- Can upload Excel files
- WhatsApp connects successfully
- Auto-replies are sent when triggered
- Logs show successful responses

### ❌ **Common Issues & Solutions**

#### Issue: "useAuth is not a function"
**Solution**: Fixed by updating import to `useAuthStore`

#### Issue: API endpoints not found
**Solution**: Ensure backend server is running and routes are registered

#### Issue: WhatsApp not connecting
**Solution**: 
- Check if WhatsApp is already connected on another device
- Clear browser cache and try again
- Ensure QR code is scanned within 60 seconds

#### Issue: Auto-replies not triggering
**Solution**:
- Check if auto-reply is active (toggle on)
- Verify trigger keywords match incoming message
- Check time restrictions if set
- Review logs for error messages

## Testing Checklist

- [ ] Auto-reply page loads
- [ ] Can create auto-reply rules
- [ ] Can toggle auto-reply on/off
- [ ] Can delete auto-reply rules
- [ ] Can upload Excel files
- [ ] Can view reply data
- [ ] Can delete reply data
- [ ] WhatsApp connects successfully
- [ ] Auto-replies trigger correctly
- [ ] Logs show response activity
- [ ] Statistics display correctly

## Performance Testing

### Load Testing
1. Create multiple auto-reply rules (10+)
2. Upload large Excel files (1000+ rows)
3. Send multiple test messages rapidly
4. Monitor system performance

### Stress Testing
1. Create complex trigger patterns
2. Upload multiple data sources
3. Test with various message types
4. Monitor memory usage and response times

## Debug Information

### Backend Logs
Check backend console for:
- Auto-reply processing logs
- AI service responses
- WhatsApp message handling
- Database operations

### Frontend Console
Check browser console for:
- API request/response logs
- Component state changes
- Error messages
- Network requests

### Database Verification
Check MongoDB for:
- Auto-reply rules created
- Response logs generated
- Data imports successful
- Statistics updated

## Success Metrics

- **Response Time**: < 2 seconds for auto-reply
- **Accuracy**: 90%+ correct responses
- **Uptime**: 99%+ system availability
- **User Experience**: Smooth interface interactions

## Next Steps After Testing

1. **Configure Production Settings**
   - Set up proper OpenAI API key
   - Configure production database
   - Set up monitoring and alerts

2. **Optimize Performance**
   - Fine-tune AI response settings
   - Optimize database queries
   - Implement caching strategies

3. **Scale Testing**
   - Test with larger datasets
   - Simulate high message volumes
   - Monitor resource usage

The auto-reply system is now ready for production use! 🚀
