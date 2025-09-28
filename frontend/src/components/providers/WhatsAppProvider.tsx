'use client';

import { useEffect } from 'react';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';

interface WhatsAppProviderProps {
  children: React.ReactNode;
}

export function WhatsAppProvider({ children }: WhatsAppProviderProps) {
  const { fetchStatus, setSocket } = useWhatsAppStore();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const socket = useSocket();

  // Set up socket for real-time updates
  useEffect(() => {
    if (socket) {
      setSocket(socket);
      console.log('🔌 Socket set up for WhatsApp real-time updates');
    }
  }, [socket, setSocket]);

  useEffect(() => {
    // Only fetch WhatsApp status if user is authenticated
    if (isAuthenticated && !authLoading) {
      fetchStatus();

      // Minimal polling since we have real-time updates via WebSocket
      const interval = setInterval(() => {
        if (isAuthenticated) {
          fetchStatus();
        }
      }, 60000); // Poll every 60 seconds as fallback

      return () => clearInterval(interval);
    }
  }, [fetchStatus, isAuthenticated, authLoading]);

  return <>{children}</>;
}
