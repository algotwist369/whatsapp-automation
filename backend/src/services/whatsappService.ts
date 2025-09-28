import { Client, LocalAuth } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
dotenv.config();

interface WhatsAppConnection {
  client: Client;
  qr: string | null;
  isConnected: boolean;
  connectionState: string;
}

class WhatsAppService {
  private connections: Map<string, WhatsAppConnection> = new Map();
  private readonly sessionPath: string;
  private io: SocketIOServer | null = null;
  private connectionAttempts: Map<string, boolean> = new Map(); // Track connection attempts

  constructor() {
    this.sessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions';
    this.ensureSessionDirectory();
  }

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  private emitStatusUpdate(userId: string, status: { isConnected: boolean; state: string; qr?: string | null }) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit('whatsapp-status-update', status);
      console.log('📡 Emitted status update to user:', userId, status);
    }
  }

  private ensureSessionDirectory(): void {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  async createConnection(userId: string, settings?: any): Promise<{ qr?: string; success: boolean; message: string }> {
    try {
      // Check if connection attempt is already in progress
      if (this.connectionAttempts.has(userId)) {
        console.log('Connection attempt already in progress for user:', userId);
        return { success: false, message: 'Connection attempt already in progress' };
      }

      // Mark connection attempt as started
      this.connectionAttempts.set(userId, true);

      // Check if user already has an active connection
      if (this.connections.has(userId)) {
        const connection = this.connections.get(userId)!;
        if (connection.isConnected) {
          console.log('User already has active connection, returning success');
          this.connectionAttempts.delete(userId);
          return { success: true, message: 'WhatsApp already connected' };
        }
        
        // Try to auto-reconnect if session exists but not connected
        if (!connection.isConnected && connection.client) {
          console.log(`Attempting auto-reconnection for user ${userId}`);
          try {
            await connection.client.initialize();
            // Wait for connection to establish
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            if (connection.isConnected) {
              console.log(`Auto-reconnection successful for user ${userId}`);
              this.connectionAttempts.delete(userId);
              return { success: true, message: 'WhatsApp reconnected successfully' };
            }
          } catch (reconnectError) {
            console.log(`Auto-reconnection failed for user ${userId}:`, reconnectError);
            // Clean up failed connection and create new one
            this.connections.delete(userId);
          }
        }
        
        // If connection exists but not connected, check if it's still in connecting state
        if (connection.connectionState === 'connecting') {
          console.log('Connection already in progress, waiting for QR...');
          // Wait a bit for QR to be generated
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (connection.qr) {
            this.connectionAttempts.delete(userId);
            return { success: true, qr: connection.qr, message: 'QR code already available' };
          }
        }
        
        // Clean up existing connection if not connected
        console.log('Cleaning up existing disconnected connection...');
        await this.disconnect(userId);
      }

      const sessionPath = path.join(this.sessionPath, `session-${userId}`);

      // Clean up any existing session files that might be corrupted
      if (fs.existsSync(sessionPath)) {
        console.log('Cleaning up existing session files...');
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (error) {
          console.error('Error cleaning up session:', error);
        }
      }

      // Create WhatsApp client with LocalAuth and settings
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `client-${userId}`,
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      });

      const connection: WhatsAppConnection = {
        client,
        qr: null,
        isConnected: false,
        connectionState: 'connecting',
      };

      this.connections.set(userId, connection);

      // Add connection timeout to detect stuck connections
      const connectionTimeout = setTimeout(() => {
        if (connection.connectionState === 'connecting' && !connection.isConnected) {
          console.log('⏰ Connection timeout - QR may not have been scanned within 120 seconds');
          // Emit timeout status
          this.emitStatusUpdate(userId, {
            isConnected: false,
            state: 'timeout',
            qr: connection.qr
          });
        }
      }, 60000); // Reduced to 60 seconds timeout for faster feedback

      // Handle QR code generation
      client.on('qr', async (qr) => {
        console.log('QR code received for user:', userId);
        
        try {
          // Convert QR string to base64 image format with optimized settings
          const qrImageData = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });
          connection.qr = qrImageData;
          connection.isConnected = false;
          
          // Emit real-time update immediately
          this.emitStatusUpdate(userId, {
            isConnected: false,
            state: 'connecting',
            qr: qrImageData
          });
        } catch (error) {
          console.error('Error generating QR code image:', error);
          // Fallback to original string if QRCode fails
          const qrImageData = `data:image/png;base64,${qr}`;
          connection.qr = qrImageData;
          connection.isConnected = false;
          
          this.emitStatusUpdate(userId, {
            isConnected: false,
            state: 'connecting',
            qr: qrImageData
          });
        }
      });

      // Handle successful connection
      client.on('ready', () => {
        console.log('WhatsApp client is ready for user:', userId);
        connection.isConnected = true;
        connection.qr = null;
        connection.connectionState = 'open';
        clearTimeout(connectionTimeout);
        this.connectionAttempts.delete(userId);
        
        // Emit real-time update
        this.emitStatusUpdate(userId, {
          isConnected: true,
          state: 'open',
          qr: null
        });
      });

      // Handle authentication failure
      client.on('auth_failure', (msg) => {
        console.log('Authentication failed for user:', userId, msg);
        connection.isConnected = false;
        connection.qr = null;
        connection.connectionState = 'auth_error';
        this.connections.delete(userId);
        this.connectionAttempts.delete(userId);
        clearTimeout(connectionTimeout);
        
        // Clean up session files on auth failure
        try {
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
        } catch (err) {
          console.error('Error cleaning up session:', err);
        }
        
        this.emitStatusUpdate(userId, {
          isConnected: false,
          state: 'auth_error',
          qr: null
        });
      });

      // Handle disconnection
      client.on('disconnected', (reason) => {
        console.log('WhatsApp client disconnected for user:', userId, 'Reason:', reason);
        connection.isConnected = false;
        connection.qr = null;
        connection.connectionState = 'disconnected';
        this.connections.delete(userId);
        this.connectionAttempts.delete(userId);
        clearTimeout(connectionTimeout);
        
        this.emitStatusUpdate(userId, {
          isConnected: false,
          state: 'disconnected',
          qr: null
        });
      });

      // Initialize the client
      await client.initialize();

      // Wait for QR code generation with faster polling
      let qrAttempts = 0;
      const maxAttempts = 5;
      const baseWaitTime = 1000; // Reduced from 3000ms to 1000ms

      while (!connection.qr && qrAttempts < maxAttempts && connection.isConnected === false) {
        const waitTime = baseWaitTime + (qrAttempts * 500); // Reduced increment from 2000ms to 500ms
        await new Promise(resolve => setTimeout(resolve, waitTime));
        qrAttempts++;
        console.log(`QR generation attempt ${qrAttempts}/${maxAttempts} - State: ${connection.connectionState}, Connected: ${connection.isConnected}, HasQR: ${!!connection.qr}`);

        // Check if connection is still valid
        if (connection.connectionState === 'disconnected') {
          console.log('Connection closed during QR generation, stopping attempts');
          break;
        }

        // Check if connection state changed to open (connected)
        if (connection.connectionState === 'open' || connection.isConnected) {
          console.log('Connection established during QR generation');
          break;
        }

        // Check if we got a QR code
        if (connection.qr) {
          console.log('QR code generated successfully');
          break;
        }
      }

      if (connection.qr) {
        console.log('QR code generated successfully and ready');
        this.connectionAttempts.delete(userId);
        return {
          success: true,
          qr: connection.qr,
          message: 'QR code generated. Please scan to connect.'
        };
      } else if (connection.isConnected) {
        console.log('Connection established without QR code');
        this.connectionAttempts.delete(userId);
        return {
          success: true,
          message: 'WhatsApp connected successfully.'
        };
      } else {
        console.log('QR code not generated within timeout, but connection may still be establishing');
        this.connectionAttempts.delete(userId);
        return {
          success: true,
          message: 'Connection in progress. QR code may appear shortly.'
        };
      }

    } catch (error) {
      console.error('Error creating WhatsApp connection:', error);
      this.connectionAttempts.delete(userId);
      return {
        success: false,
        message: 'Failed to create WhatsApp connection'
      };
    }
  }

  async sendMessage(
    userId: string,
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`Attempting to send message for user ${userId} to ${phoneNumber}`);
      
      const connection = this.connections.get(userId);

      if (!connection || !connection.isConnected) {
        console.log(`Connection not found or not connected for user ${userId}`);
        return {
          success: false,
          error: 'WhatsApp not connected. Please connect first.'
        };
      }

      // Format phone number for India (+91)
      let formattedNumber = phoneNumber.replace(/\D/g, '');
      
      // Handle India phone numbers specifically
      if (formattedNumber.startsWith('91')) {
        // Already has country code
        formattedNumber = formattedNumber;
      } else if (formattedNumber.startsWith('0')) {
        // Remove leading 0 and add 91
        formattedNumber = '91' + formattedNumber.substring(1);
      } else if (formattedNumber.length === 10) {
        // 10-digit Indian number, add 91
        formattedNumber = '91' + formattedNumber;
      } else if (!formattedNumber.startsWith('91') && formattedNumber.length > 10) {
        // International number, keep as is
        formattedNumber = formattedNumber;
      }
      
      const chatId = `${formattedNumber}@c.us`;
      
      console.log(`Sending message to chatId: ${chatId} (Original: ${phoneNumber})`);

      // Validate Indian phone number format
      if (formattedNumber.startsWith('91') && formattedNumber.length !== 12) {
        return {
          success: false,
          error: 'Invalid Indian phone number format. Please use 10-digit number or +91XXXXXXXXXX'
        };
      }

      // Send message using whatsapp-web.js
      const sent = await connection.client.sendMessage(chatId, message);
      
      console.log(`Message sent successfully:`, sent);

      if (sent) {
        return {
          success: true,
          messageId: typeof sent.id === 'string' ? sent.id : sent.id?._serialized || 'unknown'
        };
      } else {
        return {
          success: false,
          error: 'Failed to send message'
        };
      }

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendBulkMessages(
    userId: string,
    contacts: Array<{ phone: string; message: string; contactId: string }>
  ): Promise<Array<{ contactId: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    const batchSize = 5; // Process 5 messages at a time for better performance

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      // Process batch in parallel with controlled concurrency
      const batchPromises = batch.map(async (contact) => {
        try {
          // Adaptive delay based on batch position (slower at start, faster in middle)
          const delay = i === 0 ? 2000 : Math.random() * 1000 + 500;
          await new Promise(resolve => setTimeout(resolve, delay));

          const result = await this.sendMessage(userId, contact.phone, contact.message);

          return {
            contactId: contact.contactId,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
          };

        } catch (error) {
          return {
            contactId: contact.contactId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            contactId: batch[index].contactId,
            success: false,
            error: result.reason?.message || 'Batch processing failed',
          });
        }
      });

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  getConnectionStatus(userId: string): { isConnected: boolean; state: string } {
    const connection = this.connections.get(userId);

    if (!connection) {
      return { isConnected: false, state: 'not_connected' };
    }

    // Return the actual connection state from our internal tracking
    return {
      isConnected: connection.isConnected,
      state: connection.connectionState,
    };
  }

  hasActiveConnection(userId: string): boolean {
    return this.connections.has(userId);
  }

  async disconnect(userId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(userId);

      if (connection) {
        await connection.client.destroy();
        this.connections.delete(userId);
        this.connectionAttempts.delete(userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      return false;
    }
  }

  isConnected(userId: string): boolean {
    const connection = this.connections.get(userId);
    if (!connection) return false;
    
    return connection.isConnected;
  }

  getQRCode(userId: string): string | null {
    const connection = this.connections.get(userId);
    if (connection && connection.qr && !connection.isConnected) {
      return connection.qr;
    }
    return null;
  }

  async waitForQRCode(userId: string, timeoutMs: number = 30000): Promise<string | null> {
    const connection = this.connections.get(userId);
    if (!connection) {
      return null;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (connection.qr && !connection.isConnected) {
        return connection.qr;
      }

      if (connection.isConnected) {
        return null; // Already connected, no QR needed
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
  }

  async waitForConnection(userId: string, timeoutMs: number = 60000): Promise<boolean> {
    const connection = this.connections.get(userId);
    if (!connection) {
      return false;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (connection.isConnected && connection.connectionState === 'open') {
        console.log('Connection established successfully');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('Connection timeout - QR may not have been scanned');
    return false;
  }
}

export default new WhatsAppService();