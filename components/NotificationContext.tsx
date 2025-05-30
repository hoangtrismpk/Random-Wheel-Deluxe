
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Notification {
  id: string;
  message: ReactNode;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: ReactNode, type: Notification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  const addNotification = useCallback(
    (message: ReactNode, type: Notification['type'], duration: number = 3000) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newNotification: Notification = { id, message, type, duration };
      
      setNotifications(prevNotifications => {
        // Prevent duplicate messages shown simultaneously if message is simple string
        if (typeof message === 'string') {
            const existing = prevNotifications.find(n => n.message === message && n.type === type);
            if (existing) {
                // Optionally, restart its timer or just ignore adding
                // For now, we'll prevent adding exact same string message if one is already visible
                return prevNotifications;
            }
        }
        return [newNotification, ...prevNotifications]; // Add to the top of the list
      });

      if (duration > 0) { // duration 0 or less means persistent until manually closed (if close button added)
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
