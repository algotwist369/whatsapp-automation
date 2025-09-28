# 🚀 WhatsApp Bulk Messenger - Complete Setup Guide

This guide will walk you through setting up the WhatsApp Bulk Messenger application with all necessary credentials and configurations.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

### Required Software
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community)
- **Redis** - [Download here](https://redis.io/download)
- **Git** - [Download here](https://git-scm.com/)

### Required Accounts & API Keys
- **OpenAI API Key** - [Get here](https://platform.openai.com/api-keys)

## 🔧 Quick Setup (Automated)

Run the automated setup script:

```bash
# Make the setup script executable and run it
chmod +x setup.sh
./setup.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Create environment files
- ✅ Generate security keys
- ✅ Create necessary directories

## 🛠️ Manual Setup

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Step 2: Environment Configuration

#### Backend Environment (`backend/.env`)
Copy `backend/environment-config.env` to `backend/.env` and update:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/whatsapp-bulk-messaging

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions

# Server
PORT=5000
NODE_ENV=development
```

#### Frontend Environment (`frontend/.env.local`)
Copy `frontend/environment-config.env.local` to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### Step 3: Start Services

#### MongoDB
```bash
# Linux/Ubuntu
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS (with Homebrew)
brew services start mongodb-community

# Windows
net start MongoDB
```

#### Redis
```bash
# Linux/Ubuntu
sudo systemctl start redis
sudo systemctl enable redis

# macOS (with Homebrew)
brew services start redis

# Windows
redis-server
```

### Step 4: Run the Application

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

## 🔑 API Keys & Credentials Setup

### 1. OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up/Login to your account
3. Go to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Add it to `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 2. MongoDB Connection

#### Local MongoDB
```env
MONGODB_URI=mongodb://localhost:27017/whatsapp-bulk-messaging
```

#### MongoDB Atlas (Cloud)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-bulk-messaging?retryWrites=true&w=majority
```

### 3. Redis Connection

#### Local Redis
```env
REDIS_URL=redis://localhost:6379
```

#### Redis Cloud
```env
REDIS_URL=redis://default:password@your-redis-host:6379
```

### 4. JWT Secret Generation

Generate a secure JWT secret:

```bash
# Generate random 64-character hex string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add the generated string to `backend/.env`:
```env
JWT_SECRET=your-generated-secret-here
```

## 🌐 Access Points

After setup, access the application at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Documentation**: http://localhost:5000/api-docs (if enabled)

## 📱 WhatsApp Connection Setup

1. **Register/Login**: Create an account or login
2. **Connect WhatsApp**: Go to Dashboard → Click "Connect WhatsApp"
3. **Scan QR Code**: Use your WhatsApp Business account to scan the QR code
4. **Wait for Connection**: The status will update to "Connected"

## 🔍 Verification & Testing

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. API Endpoints Test
```bash
# Test authentication
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Test WhatsApp status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/whatsapp/status
```

### 3. Frontend Test
- Open http://localhost:3000
- Register a new account
- Login successfully
- Navigate through the dashboard

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

#### 2. Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Expected response: PONG

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis
```

#### 3. OpenAI API Error
- Verify API key is correct
- Check API quota and billing
- Ensure internet connectivity
- Test API key: `curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models`

#### 4. WhatsApp Connection Issues
- Ensure stable internet connection
- Try disconnecting and reconnecting
- Clear browser cache and cookies
- Check WhatsApp Web is not already connected elsewhere

#### 5. Port Already in Use
```bash
# Check what's using port 5000
lsof -i :5000

# Kill the process
kill -9 PID_NUMBER

# Or change port in .env
PORT=5001
```

### Logs and Debugging

#### Backend Logs
```bash
# View backend logs
cd backend
npm run dev

# Or check log files
tail -f logs/app.log
```

#### Frontend Logs
- Open browser developer tools (F12)
- Check Console tab for errors
- Check Network tab for API call failures

#### Database Logs
```bash
# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**:
   - Never commit `.env` files to version control
   - Use strong, unique secrets
   - Rotate API keys regularly

2. **Database Security**:
   - Use authentication for MongoDB
   - Enable SSL/TLS connections
   - Restrict database access by IP

3. **API Security**:
   - Enable rate limiting
   - Use HTTPS in production
   - Implement proper CORS settings

4. **WhatsApp Compliance**:
   - Follow WhatsApp Business Policy
   - Respect user consent
   - Implement opt-out mechanisms

## 📊 Performance Optimization

### For Large Scale Usage

1. **Database Indexing**:
   ```javascript
   // Add indexes for better performance
   db.contacts.createIndex({ userId: 1, phone: 1 })
   db.messages.createIndex({ userId: 1, status: 1 })
   ```

2. **Redis Configuration**:
   ```env
   # Optimize Redis for production
   REDIS_MAXMEMORY=256mb
   REDIS_MAXMEMORY_POLICY=allkeys-lru
   ```

3. **Queue Configuration**:
   ```javascript
   // Adjust queue settings for high volume
   const messageQueue = new Bull('message processing', {
     redis: redisConfig,
     defaultJobOptions: {
       removeOnComplete: 100,
       removeOnFail: 50,
     }
   });
   ```

## 🆘 Support

If you encounter issues:

1. **Check the logs** for error messages
2. **Verify all services** are running (MongoDB, Redis)
3. **Test API endpoints** individually
4. **Check environment variables** are set correctly
5. **Review the troubleshooting section** above

For additional help:
- Check the main README.md
- Review API documentation
- Open an issue on GitHub

---

**🎉 You're all set! Happy messaging!**
