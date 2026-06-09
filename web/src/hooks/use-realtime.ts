import { useEffect } from 'react';
import { useSocket } from '../app/SocketContext';
import { useQueryClient } from '@tanstack/react-query';

export interface NotificationPayload {
  type: string;
  eventId: string;
  timestamp: string;
  data?: unknown;
}
export function useDocumentUpdates(documentId?: string) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !documentId) return;

    socket.emit('join_document', documentId);

    const handleUpdate = () => {
      // Invalidate relevant queries when a document updates
      void queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    };

    socket.on('document_update', handleUpdate);

    return () => {
      socket.off('document_update', handleUpdate);
      socket.emit('leave_document', documentId);
    };
  }, [socket, documentId, queryClient]);
}

export function useDashboardUpdates() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      // Invalidate dashboard metrics
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    socket.on('notification', handleUpdate);

    return () => {
      socket.off('notification', handleUpdate);
    };
  }, [socket, queryClient]);
}

export function useReviewQueueUpdates() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload: NotificationPayload) => {
      if (payload.type === 'validation.needs_review' || payload.type === 'review.completed') {
        void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      }
    };

    socket.on('notification', handleUpdate);

    return () => {
      socket.off('notification', handleUpdate);
    };
  }, [socket, queryClient]);
}
