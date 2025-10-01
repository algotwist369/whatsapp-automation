import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { performanceMiddleware, errorHandler, cacheMiddleware, rateLimitMiddleware, getPerformanceMetrics } from './middleware/performance';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Extend Socket interface to include custom properties
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    user?: any;
  }
}

// Import configurations
import connectDB from './config/database';
import redis from './config/redis';

// Import routes
import authRoutes from './routes/auth';
import whatsappRoutes from './routes/whatsapp';
import contactsRoutes from './routes/contacts';
import messagesRoutes from './routes/messages';
import performanceRoutes from './routes/performance';
import settingsRoutes from './routes/settings';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Socket.IO for real-time updates
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

console.log('🔌 Socket.IO server initialized');

// Connect to databases
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Enhanced rate limiting with Redis backend
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Higher limit for better performance
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// API-specific rate limiting
const apiLimiter = rateLimitMiddleware(60000, 1000); // 1000 requests per minute
const authLimiter = rateLimitMiddleware(300000, 10); // 10 requests per 5 minutes for auth

const authLimiterLegacy = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Lower limit for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply different rate limits to different route groups
app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Optimized compression middleware
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress files > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  }
}));

// Add caching headers for static content
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // Cache API responses for 30 seconds
    res.set('Cache-Control', 'private, max-age=30');
  }
  next();
});

// Performance monitoring middleware
app.use(performanceMiddleware);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/whatsapp', apiLimiter, whatsappRoutes);
app.use('/api/contacts', apiLimiter, cacheMiddleware(300), contactsRoutes); // Cache for 5 minutes
app.use('/api/messages', apiLimiter, messagesRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('🔒 No token provided for socket connection');
      return next(new Error('Authentication error: No token provided'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const User = require('./models/User').default;
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      console.log('🔒 Invalid user for socket connection');
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.userId = decoded.userId;
    socket.user = user;
    console.log('🔒 Socket authenticated for user:', user.email);
    next();
  } catch (error) {
    console.error('🔒 Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket: any) => {
  console.log('🔌 Client connected:', socket.id, 'User:', socket.user?.email);

  socket.on('join-room', (userId: string) => {
    // Verify the user is joining their own room
    if (socket.userId !== userId) {
      console.log('🔒 Unauthorized room join attempt:', userId, 'by user:', socket.userId);
      return;
    }
    
    socket.join(`user-${userId}`);
    console.log(`📡 User ${userId} joined their room`);
  });

  // Removed automatic status request handler - WebSocket events handle status updates

  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Add debug listener for all events
  socket.onAny((eventName, ...args) => {
    console.log('🔍 Socket event received:', eventName, 'from user:', socket.user?.email);
  });
});

// Make io available to routes
app.set('io', io);

// Initialize WhatsApp service with Socket.IO
import whatsappService from './services/whatsappService';
whatsappService.setSocketIO(io);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val: any) => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Enhanced performance monitoring error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res, next);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Close database connections
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      
      // Close Redis connection
      redis.disconnect();
      console.log('Redis connection closed');
      
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize WhatsApp service after database connection
const initializeServices = async () => {
  try {
    // Import WhatsApp service
    const whatsappService = (await import('./services/whatsappService')).default;
    
    // Set Socket.IO instance
    whatsappService.setSocketIO(io);
    
    // Initialize WhatsApp service to restore connections
    await whatsappService.initialize();
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Initialize services after server starts
  await initializeServices();
});

export default app;
