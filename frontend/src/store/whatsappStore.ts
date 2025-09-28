import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { whatsappApi } from '@/lib/api';
import { WhatsAppConnection } from '@/types';
import { Socket } from 'socket.io-client';

interface WhatsAppStore {
  status: WhatsAppConnection | null;
  isConnected: boolean;
  isLoading: boolean;
  qrCode: string | null;
  
  // Actions
  setStatus: (status: WhatsAppConnection | null) => void;
  setIsConnected: (connected: boolean) => void;
  setQrCode: (qr: string | null) => void;
  fetchStatus: () => Promise<void>;
  connect: () => Promise<{ success: boolean; message: string; qr?: string }>;
  disconnect: () => Promise<{ success: boolean; message: string }>;
  refreshQR: () => Promise<{ success: boolean; qr?: string }>;
  sendTestMessage: (phoneNumber: string, message: string) => Promise<{ success: boolean; message: string }>;
  setSocket: (socket: Socket | null) => void;
}

export const useWhatsAppStore = create<WhatsAppStore>()(
  persist(
    (set, get) => ({
      status: null,
      isConnected: false,
      isLoading: false,
      qrCode: null,

          setStatus: (status) => {
            // Only log when status actually changes
            if (status?.isConnected !== get().isConnected || status?.qr !== get().qrCode) {
              console.log('WhatsApp Store - Status updated:', { 
                isConnected: status?.isConnected, 
                state: status?.state,
                hasQR: !!status?.qr 
              });
            }
            set({ 
              status,
              isConnected: status?.isConnected || false,
              qrCode: status?.qr || null
            });
          },

      setIsConnected: (connected) => {
        set({ isConnected: connected });
        if (get().status) {
          set({ 
            status: { 
              ...get().status!, 
              isConnected: connected 
            }
          });
        }
      },

      setQrCode: (qr) => {
        set({ qrCode: qr });
      },

      fetchStatus: async () => {
        try {
          // Check if user is authenticated before making API calls
          const token = localStorage.getItem('token');
          if (!token) {
            console.log('No token found, skipping WhatsApp status fetch');
            return;
          }

          // Prevent multiple simultaneous calls
          if ((get() as any).isFetching) {
            console.log('Skipping status fetch - already fetching');
            return;
          }
          (get() as any).isFetching = true;

          // Debounce mechanism to prevent multiple rapid calls
          const now = Date.now();
          if (now - (get() as any).lastFetchTime < 5000) {
            console.log('Skipping status fetch - too soon since last fetch');
            (get() as any).isFetching = false;
            return;
          }
          (get() as any).lastFetchTime = now;

          // Only skip if we have a confirmed connection
          const currentStatus = get().status;
          const hasConfirmedConnection = currentStatus?.state === 'open' && currentStatus?.isConnected;
          
          if (hasConfirmedConnection) {
            console.log('Skipping status fetch - WhatsApp is already connected');
            (get() as any).isFetching = false;
            return;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced timeout to 10 seconds

          try {
            const response = await whatsappApi.getStatus();
            clearTimeout(timeoutId);
            
            if (response.success && response.data) {
              console.log('WhatsApp status fetched from backend:', {
                isConnected: response.data.isConnected,
                state: response.data.state,
                hasQR: !!response.data.qr
              });
              
              get().setStatus(response.data);
            } else {
              console.log('Status API failed, assuming disconnected');
              get().setStatus({ isConnected: false, state: 'not_connected', qr: undefined });
            }
          } catch (timeoutError) {
            clearTimeout(timeoutId);
            throw timeoutError;
          }
        } catch (error: any) {
          console.error('Error fetching WhatsApp status:', error);
          
          // Handle different error types
          if (error.name === 'AbortError') {
            console.log('WhatsApp status request timed out');
            return;
          }
          
          if (error.response?.status === 401) {
            console.log('Token expired, clearing WhatsApp status');
            get().setStatus({ isConnected: false, state: 'not_connected', qr: undefined });
            return;
          }
          
          if (error.response?.status >= 500) {
            console.log('Server error, will retry later');
            return;
          }
        } finally {
          // Reset the fetching flag
          (get() as any).isFetching = false;
        }
      },

          connect: async () => {
            console.log('WhatsApp Store - Starting connection...');
            set({ isLoading: true });
            try {
              const response = await whatsappApi.connect();
              if (response.success && response.data) {
                if (response.data.qr) {
                  console.log('WhatsApp Store - QR code received');
                  get().setQrCode(response.data.qr);
                }
                // Update status immediately with the response data
                get().setStatus({
                  isConnected: response.data.isConnected || false,
                  state: 'connecting',
                  qr: response.data.qr
                });
                // No need to fetch status since we have the current state
              }
              return {
                success: response.success,
                message: response.message || (response.success ? 'Connection successful' : 'Connection failed'),
                qr: response.data?.qr
              };
            } catch (error: any) {
              console.error('WhatsApp Store - Connect error:', error);
              return {
                success: false,
                message: error.response?.data?.message || 'Failed to connect WhatsApp'
              };
            } finally {
              set({ isLoading: false });
            }
          },

      disconnect: async () => {
        set({ isLoading: true });
        try {
          const response = await whatsappApi.disconnect();
          if (response.success) {
            get().setIsConnected(false);
            get().setQrCode(null);
            await get().fetchStatus();
          }
          return {
            success: response.success,
            message: response.message || (response.success ? 'Disconnected successfully' : 'Failed to disconnect')
          };
        } catch (error: any) {
          return {
            success: false,
            message: error.response?.data?.message || 'Failed to disconnect WhatsApp'
          };
        } finally {
          set({ isLoading: false });
        }
      },

      refreshQR: async () => {
        try {
          const response = await whatsappApi.getQR();
          if (response.success && response.data) {
            if (response.data.qr) {
              console.log('WhatsApp Store - QR code refreshed from API');
              get().setQrCode(response.data.qr);
              // Also update the status immediately with the QR code
              get().setStatus({
                isConnected: response.data.isConnected || false,
                state: 'connecting',
                qr: response.data.qr
              });
            }
            return { success: true, qr: response.data.qr };
          }
          return { success: false, qr: undefined };
        } catch (error: any) {
          console.error('WhatsApp Store - Refresh QR error:', error);
          return { success: false, qr: undefined };
        }
      },

      sendTestMessage: async (phoneNumber: string, message: string) => {
        try {
          const response = await whatsappApi.sendTestMessage({ phoneNumber, message });
          return {
            success: response.success,
            message: response.message || (response.success ? 'Message sent successfully' : 'Failed to send message')
          };
        } catch (error: any) {
          return {
            success: false,
            message: error.response?.data?.message || 'Failed to send message'
          };
        }
      },

      setSocket: (socket) => {
        if (socket) {
          console.log('🔌 Setting up socket for WhatsApp real-time updates');
          
          // Listen for real-time WhatsApp status updates
          socket.on('whatsapp-status-update', (status: { isConnected: boolean; state: string; qr?: string | null }) => {
            console.log('📡 Received real-time status update:', status);
            
            // Only update status from WebSocket, don't trigger additional API calls
            get().setStatus({
              isConnected: status.isConnected,
              state: status.state,
              qr: status.qr || undefined
            });
            
            // Log important state changes
            if (status.isConnected && status.state === 'open') {
              console.log('🔒 WebSocket confirms connection established');
            } else if (status.state === 'timeout') {
              console.log('⏰ Connection timeout detected via WebSocket');
            } else if (status.qr) {
              console.log('📱 QR code received via WebSocket');
            }
            
            // Don't call fetchStatus() on every WebSocket update
            // WebSocket updates are already real-time and accurate
          });

          // Add debug listener for all events
          socket.onAny((eventName, ...args) => {
            console.log('🔍 Socket event received:', eventName, args);
          });
        } else {
          console.log('🔌 Socket is null, cannot set up real-time updates');
        }
      }
    }),
    {
      name: 'whatsapp-storage',
      partialize: (state) => ({
        // Don't persist connection status to avoid stale data
        // Always fetch fresh status from backend
        status: null,
        isConnected: false,
      }),
    }
  )
);
