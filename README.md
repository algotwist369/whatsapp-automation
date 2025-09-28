# WhatsApp Bulk Messenger with AI

A comprehensive MERN stack application for bulk WhatsApp messaging with AI-powered spam detection and professional message rewriting.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login/registration with JWT tokens
- **WhatsApp Integration**: Connect WhatsApp Business accounts via QR code scanning using Baileys
- **Contact Management**: Add contacts manually or upload Excel/CSV files
- **Bulk Messaging**: Send messages to multiple contacts with AI optimization
- **Real-time Progress**: Live tracking of message sending status

### AI-Powered Features
- **Spam Detection**: Automatically detect spammy/risky words that might trigger WhatsApp filters
- **Message Rewriting**: Professional rewriting of messages to comply with WhatsApp Business Policy
- **Message Variations**: Generate unique variations for each contact to avoid detection
- **Category-based Optimization**: Different handling for promotional, notification, advertising, etc.

### Technical Features
- **Queue System**: Redis-based message queue for reliable processing
- **Rate Limiting**: Built-in throttling to prevent account bans
- **Real-time Updates**: WebSocket integration for live progress tracking
- **Responsive UI**: Modern, mobile-friendly interface with Tailwind CSS
- **Type Safety**: Full TypeScript implementation

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **MongoDB** with **Mongoose** for database
- **Redis** for caching and message queues
- **Baileys** for WhatsApp Web API
- **OpenAI GPT-4** with **LangChain** for AI processing
- **Bull** for job queue management
- **Socket.IO** for real-time communication

### Frontend
- **Next.js 14** with **App Router**
- **React 18** with **TypeScript**
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Hook Form** for form handling
- **Axios** for API calls
- **Socket.IO Client** for real-time updates

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB
- Redis
- OpenAI API Key

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp ../env.example .env
   ```

4. **Configure environment variables**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/whatsapp-bulk-messaging
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   OPENAI_API_KEY=your-openai-api-key-here
   WHATSAPP_SESSION_PATH=./sessions
   PORT=5000
   NODE_ENV=development
   ```

5. **Start the backend server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
   ```

4. **Start the frontend development server**:
   ```bash
   npm run dev
   ```

### Full Stack Setup

From the root directory:
```bash
npm run install-all  # Install all dependencies
npm run dev          # Start both backend and frontend
```

## 🔧 Configuration

### OpenAI Setup
1. Get your API key from [OpenAI Platform](https://platform.openai.com/)
2. Add it to your `.env` file as `OPENAI_API_KEY`

### WhatsApp Connection
1. Start the application
2. Go to Dashboard and click "Connect WhatsApp"
3. Scan the QR code with your WhatsApp Business account
4. Wait for connection confirmation

### Database Setup
The application will automatically create the necessary collections in MongoDB:
- `users` - User accounts and authentication
- `contacts` - Contact information
- `messages` - Individual message records
- `bulkmessages` - Bulk message campaigns

## 📱 Usage

### 1. User Registration/Login
- Create an account or login with existing credentials
- Complete your profile information

### 2. WhatsApp Connection
- Connect your WhatsApp Business account by scanning QR code
- Ensure stable internet connection for reliable messaging

### 3. Contact Management
- Add contacts manually with name and phone number
- Upload Excel/CSV files for bulk contact import
- Organize contacts with tags

### 4. Bulk Messaging
- Compose your message and select category
- Use AI analysis to detect and fix potential issues
- Select contacts for bulk sending
- Monitor real-time progress

### 5. Message Analytics
- View delivery statistics and success rates
- Track message performance over time
- Monitor failed messages and retry options

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization
- **CORS Protection**: Proper CORS configuration
- **Helmet Security**: Security headers and protection
- **Environment Variables**: Sensitive data stored in environment variables

## 📊 AI Message Analysis

The AI system analyzes messages for:

### Spam Indicators
- Urgency tactics ("urgent", "limited time", "act now")
- Promotional language ("exclusive offer", "don't miss out")
- Call-to-action phrases ("click here", "buy now")
- False claims ("guaranteed", "risk-free")
- Misleading content

### Professional Rewriting
- Maintains original intent and call-to-action
- Uses professional, conversational tone
- Avoids spammy language and urgency tactics
- Ensures WhatsApp Business Policy compliance
- Generates personalized variations

## 🚦 Message Categories

- **Promotional**: Marketing and promotional content
- **Notification**: Important updates and alerts
- **Advertising**: Product and service advertisements
- **Discount Offer**: Special offers and discounts
- **Information**: General information sharing
- **Other**: Miscellaneous messages

## 📈 Performance Features

- **Message Queuing**: Redis-based queue for reliable processing
- **Throttling**: Randomized delays between messages (1-3 seconds)
- **Retry Logic**: Automatic retry for failed messages
- **Batch Processing**: Efficient bulk message handling
- **Real-time Updates**: Live progress tracking via WebSocket

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### WhatsApp
- `POST /api/whatsapp/connect` - Connect WhatsApp
- `GET /api/whatsapp/status` - Get connection status
- `GET /api/whatsapp/qr` - Get QR code
- `POST /api/whatsapp/disconnect` - Disconnect WhatsApp

### Contacts
- `GET /api/contacts` - Get contacts
- `POST /api/contacts` - Add contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/upload` - Upload Excel/CSV

### Messages
- `POST /api/messages/analyze` - Analyze message with AI
- `POST /api/messages/send-bulk` - Send bulk messages
- `GET /api/messages/bulk/:id/status` - Get bulk message status
- `GET /api/messages/history` - Get message history
- `GET /api/messages/statistics` - Get messaging statistics

## 🐛 Troubleshooting

### Common Issues

1. **WhatsApp Connection Fails**
   - Ensure stable internet connection
   - Try disconnecting and reconnecting
   - Clear browser cache and cookies

2. **AI Analysis Not Working**
   - Verify OpenAI API key is correct
   - Check API quota and billing
   - Ensure internet connectivity

3. **Messages Not Sending**
   - Verify WhatsApp is connected
   - Check contact phone numbers
   - Review message content for compliance

4. **Database Connection Issues**
   - Ensure MongoDB is running
   - Check connection string in .env
   - Verify database permissions

### Logs and Debugging
- Backend logs are available in the console
- Frontend errors are shown in browser console
- Check MongoDB logs for database issues
- Monitor Redis for queue processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is for educational and legitimate business purposes only. Users are responsible for:
- Complying with WhatsApp Business Policy
- Respecting recipient privacy and consent
- Following local laws and regulations
- Using appropriate message content

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ using modern web technologies**
