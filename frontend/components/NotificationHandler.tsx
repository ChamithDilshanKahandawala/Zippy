import React, { useEffect, useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import NotificationToast from './NotificationToast';

export default function NotificationHandler() {
  const { notification } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!visible || !notification) return null;

  return (
    <NotificationToast
      title={notification.request.content.title || 'New Notification'}
      message={notification.request.content.body || ''}
      onPress={() => {
        setVisible(false);
        // Additional handling if needed, e.g. navigation is already handled by the hook's subscription
      }}
      onClose={() => setVisible(false)}
    />
  );
}
