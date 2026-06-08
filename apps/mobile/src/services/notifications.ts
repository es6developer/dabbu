import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, setAccessToken } from './api';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (_e) {
  void _e;
}

let deviceId: string | null = null;

const EAS_PROJECT_ID = '57a858a9-aa05-47d4-b908-e3d887e07597';

function getProjectId(): string {
  return (
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || EAS_PROJECT_ID
  );
}

function getStableDeviceId(): string {
  if (deviceId) {
    return deviceId;
  }
  const nativeId =
    (Device as any).osBuildId ||
    (Device as any).osInternalBuildId ||
    Device.modelId ||
    Device.modelName ||
    'device';
  deviceId = `${Platform.OS}_${String(nativeId).replace(/\s+/g, '_')}`;
  return deviceId;
}

export async function registerForPushNotifications(accessToken: string): Promise<void> {
  setAccessToken(accessToken);

  if (!Device.isDevice) {
    console.log('Not a physical device, skipping push registration');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (Platform.OS === 'ios') {
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: true },
      });
    }
    return;
  }

  let pushToken: string;
  try {
    const projectId = getProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    pushToken = tokenData.data;
  } catch (e) {
    console.warn('Expo push token failed, falling back to native FCM token:', e);
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      pushToken = deviceToken.data;
    } catch (e2) {
      console.warn('Native FCM token also failed:', e2);
      return;
    }
  }

  const storedId = getStableDeviceId();

  try {
    await api.post('/devices/register', {
      deviceId: storedId,
      platform: Platform.OS,
      token: pushToken,
      deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
    });
  } catch (e) {
    console.warn('Push notification registration failed:', e);
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f7892c',
    });
    await Notifications.setNotificationChannelAsync('expenses', {
      name: 'Expenses',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f7892c',
    });
    await Notifications.setNotificationChannelAsync('shared', {
      name: 'Shared Finance',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90D9',
    });
    await Notifications.setNotificationChannelAsync('goals', {
      name: 'Goals',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
    });
    await Notifications.setNotificationChannelAsync('emi', {
      name: 'EMI & Payments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
    });
    await Notifications.setNotificationChannelAsync('subscriptions', {
      name: 'Subscriptions',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#AF52DE',
    });
    await Notifications.setNotificationChannelAsync('settlements', {
      name: 'Settlements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F7892C',
    });
    await Notifications.setNotificationChannelAsync('reports', {
      name: 'Reports & Digests',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8E8E93',
    });
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9500',
    });
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export async function presentLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
): Promise<string | undefined> {
  try {
    const notificationId = await Notifications.presentNotificationAsync({
      title,
      body,
      data,
      sound: true,
    });
    return notificationId;
  } catch (e) {
    console.warn('Failed to present local notification:', e);
    return undefined;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  date: Date,
  data: Record<string, any> = {},
): Promise<string | undefined> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        date,
        channelId: data?.channelId || 'default',
      } as any,
    });
    return notificationId;
  } catch (e) {
    console.warn('Failed to schedule local notification:', e);
    return undefined;
  }
}

export async function getBadgeCount(): Promise<number> {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (e) {
    console.warn('Failed to get badge count:', e);
    return 0;
  }
}

export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (e) {
    console.warn('Failed to set badge count:', e);
  }
}
