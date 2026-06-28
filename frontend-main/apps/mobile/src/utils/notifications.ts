import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';

type ScheduleLocalNotificationParams = {
  body: string;
  seconds?: number;
  title: string;
};

function canUseExpoNotifications(): boolean {
  if (process.env.JEST_WORKER_ID) {
    return false;
  }

  return !(
    Platform.OS === 'web' ||
    (Platform.OS === 'android' && Constants.appOwnership === 'expo')
  );
}

export async function scheduleLocalNotification({
  body,
  seconds = 5,
  title,
}: ScheduleLocalNotificationParams): Promise<void> {
  if (!canUseExpoNotifications()) {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    return;
  }

  const Notifications = await import('expo-notifications');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      importance: Notifications.AndroidImportance.MAX,
      name: 'Default',
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const finalPermission = existingPermission.granted
    ? existingPermission
    : await Notifications.requestPermissionsAsync();

  if (!finalPermission.granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      body,
      sound: 'default',
      title,
    },
    trigger: {
      channelId: 'default',
      repeats: false,
      seconds,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });
}
