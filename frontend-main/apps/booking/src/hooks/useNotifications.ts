import { useNotificationCenter } from '../context/NotificationCenterContext';

export const useNotifications = () => {
  const { notifications, markAsSeen, loading, fetchNotifications } = useNotificationCenter();
  return { notifications, markAsSeen, loading, fetchNotifications };
};
