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
let isRegistering = false;
let lastRegisteredToken: string | null = null;

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

async function setupAndroidChannels(): Promise<void> {
  const channels = [
    {
      id: 'default',
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      color: '#f7892c',
    },
    {
      id: 'expenses',
      name: 'Expenses',
      importance: Notifications.AndroidImportance.HIGH,
      color: '#f7892c',
    },
    {
      id: 'shared',
      name: 'Shared Finance',
      importance: Notifications.AndroidImportance.HIGH,
      color: '#4A90D9',
    },
    {
      id: 'goals',
      name: 'Goals',
      importance: Notifications.AndroidImportance.DEFAULT,
      color: '#34C759',
    },
    {
      id: 'emi',
      name: 'EMI & Payments',
      importance: Notifications.AndroidImportance.HIGH,
      color: '#FF3B30',
    },
    {
      id: 'subscriptions',
      name: 'Subscriptions',
      importance: Notifications.AndroidImportance.DEFAULT,
      color: '#AF52DE',
    },
    {
      id: 'settlements',
      name: 'Settlements',
      importance: Notifications.AndroidImportance.HIGH,
      color: '#F7892C',
    },
    {
      id: 'reports',
      name: 'Reports & Digests',
      importance: Notifications.AndroidImportance.LOW,
      color: '#8E8E93',
    },
    {
      id: 'reminders',
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      color: '#FF9500',
    },
  ];
  for (const ch of channels) {
    try {
      await Notifications.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        importance: ch.importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: ch.color,
      });
    } catch (_e) {
      void _e;
    }
  }
}

export async function registerForPushNotifications(accessToken: string): Promise<void> {
  if (isRegistering || lastRegisteredToken === accessToken) {
    return;
  }
  isRegistering = true;

  try {
    setAccessToken(accessToken);

    if (!Device.isDevice) {
      console.log('Not a physical device, skipping push registration');
      return;
    }

    const perm = await Notifications.getPermissionsAsync();
    const existingStatus: string = perm.status;

    // Treat 'provisional' (iOS silent delivery) as granted
    if (existingStatus === 'granted' || existingStatus === 'provisional') {
      // Permission already OK, proceed to token fetch
    } else {
      const permResult = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: true },
      });
      const status: string = permResult.status;
      if (status !== 'granted' && status !== 'provisional') {
        console.log('Push notification permission denied');
        return;
      }
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
    const deviceName = Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android');

    try {
      await api.post('/devices/register', {
        deviceId: storedId,
        platform: Platform.OS,
        token: pushToken,
        deviceName,
      });
      lastRegisteredToken = accessToken;
    } catch (e) {
      console.warn('Push notification registration failed:', e);
    }

    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }
  } finally {
    isRegistering = false;
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
