import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores';
import toast from 'react-hot-toast';
import type { NotificationPayload } from '../hooks/use-realtime';

import { SocketContext } from './SocketContext';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const wsUrl = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3007';

    const socketInstance = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    });

    // Handle global notifications here
    socketInstance.on('notification', (payload: NotificationPayload) => {
      console.log('Received notification:', payload);

      const type = payload.type;

      if (type === 'validation.needs_review') {
        toast('Document needs review', {
          icon: '⚠️',
          style: {
            border: '1px solid var(--color-warning)',
            color: 'var(--color-warning)',
          },
        });
      } else if (type === 'validation.completed') {
        toast.success('Document validation passed!');
      } else if (type === 'extraction.completed') {
        toast.success('Extraction completed successfully');
      } else if (type === 'document.failed') {
        toast.error('Document processing failed');
      } else if (type === 'review.completed') {
        toast.success('Review completed');
      }
    });

    setTimeout(() => {
      setSocket(socketInstance);
    }, 0);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}
