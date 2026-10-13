import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type NotificationKind = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  /** Auto-dismiss after ms. 0 = sticky. Default 5000. */
  duration?: number;
  /** Optional external link rendered as an action (e.g. explorer). */
  action?: { label: string; href: string };
}

export type NotificationInput = Omit<Notification, 'id'>;

interface NotificationContextValue {
  notify: (notification: NotificationInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  notifications: Notification[];
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let counter = 0;
const nextId = () => `n${++counter}-${Date.now().toString(36)}`;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (input: NotificationInput): string => {
      const id = nextId();
      const notification: Notification = { id, duration: 5000, ...input };
      setNotifications((list) => [...list, notification]);
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => dismiss(id), notification.duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const clear = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setNotifications([]);
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({ notify, dismiss, clear, notifications }),
    [notify, dismiss, clear, notifications],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}
