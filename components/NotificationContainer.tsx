
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNotification, Notification } from './NotificationContext';

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ notification, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let timerId: number;
    if (notification.duration && notification.duration > 0) {
      timerId = window.setTimeout(() => {
        setIsExiting(true);
      }, notification.duration - 300); // Start exit animation slightly before removal
    }
    
    // This effect handles the actual removal after the exit animation.
    // The NotificationContext also has a timeout to remove it from the state.
    // This local exit animation ensures the visual effect.
    if (isExiting) {
        const exitTimer = setTimeout(() => {
            onRemove(notification.id); // This call might be redundant if context already removed it.
                                     // The context's removal is the source of truth.
                                     // This is more for visual consistency if the component sticks around.
        }, 300); // Duration of exit animation
        return () => clearTimeout(exitTimer);
    }


    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [notification, onRemove, isExiting]);


  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[notification.type];

  return (
    <div
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
      className={`relative w-full max-w-sm p-4 rounded-lg shadow-2xl text-white ${bgColor} 
                  ${isExiting ? 'notification-exit' : 'notification-enter'} mb-3 overflow-hidden`}
    >
      <p className="text-sm font-medium">{notification.message}</p>
      <button
        onClick={() => {
          setIsExiting(true);
          // Give animation time to complete before removing from global state
          setTimeout(() => onRemove(notification.id), 300);
        }}
        className="absolute top-1 right-1 p-1 text-white/70 hover:text-white focus:outline-none"
        aria-label="Đóng thông báo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};


const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById('notification-root');
    setPortalRoot(element);
  }, []);

  if (!portalRoot || notifications.length === 0) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="fixed top-4 right-4 z-[1000] w-auto max-w-sm space-y-0">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>,
    portalRoot
  );
};

export default NotificationContainer;
