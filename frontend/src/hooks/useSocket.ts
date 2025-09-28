import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user, isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user?.id && token) {
      // Initialize socket connection - use base URL without /api
      const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
      const socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          token: token
        },
        extraHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      socketRef.current = socket;

      // Add connection event listeners
      socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
        socket.emit('join-room', user.id);
        console.log('📡 Joined room for user:', user.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
      });

      socket.on('error', (error) => {
        console.error('🔌 Socket error:', error);
      });

      return () => {
        socket.disconnect();
        console.log('🔌 Socket disconnected');
      };
    }
  }, [isAuthenticated, user?.id, token]);

  return socketRef.current;
}
