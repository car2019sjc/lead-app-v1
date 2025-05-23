import React from 'react';
import { Notification as NotificationType } from '../types';

interface NotificationProps {
  notification: NotificationType;
}

const Notification: React.FC<NotificationProps> = ({ notification }) => {
  if (!notification.show) return null;

  const bgColor = notification.type === 'error' 
    ? 'bg-red-100 text-red-800' 
    : notification.type === 'warning' 
      ? 'bg-yellow-100 text-yellow-800' 
      : 'bg-green-100 text-green-800';

  return (
    <div className={`mb-4 p-3 rounded-md ${bgColor} transition-opacity duration-300 opacity-100`}>
      {notification.message}
    </div>
  );
};

export default Notification;