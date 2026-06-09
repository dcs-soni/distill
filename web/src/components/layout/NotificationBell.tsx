import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useSocket } from '@/app/SocketContext';
import type { NotificationPayload } from '../../hooks/use-realtime';

interface AppNotification {
  id: string;
  type: string;
  timestamp: string;
  read: boolean;
}

export function NotificationBell() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (payload: NotificationPayload) => {
      setNotifications((prev) => [
        {
          id: payload.eventId || Date.now().toString(),
          type: payload.type,
          timestamp: new Date(payload.timestamp || Date.now()).toISOString(),
          read: false,
        },
        ...prev,
      ]);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatType = (type: string) => {
    switch (type) {
      case 'validation.needs_review':
        return 'Document Needs Review';
      case 'validation.completed':
        return 'Validation Completed';
      case 'extraction.completed':
        return 'Extraction Completed';
      case 'document.failed':
        return 'Document Failed';
      case 'review.completed':
        return 'Review Completed';
      default:
        return type;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (open) markAllRead();
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-white/10"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 overflow-hidden rounded-xl border p-2 shadow-xl backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(9, 9, 11, 0.95)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="mb-2 flex items-center justify-between px-2 pb-2 pt-1 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p
                className="p-4 text-center text-sm"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                No notifications
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`mb-1 rounded-lg p-3 text-sm transition-colors ${
                    n.read ? 'opacity-70' : 'bg-white/5'
                  }`}
                  onClick={() => {
                    setNotifications((prev) =>
                      prev.map((notif) => (notif.id === n.id ? { ...notif, read: true } : notif))
                    );
                  }}
                >
                  <p className="font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {formatType(n.type)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
