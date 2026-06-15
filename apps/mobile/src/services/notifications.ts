import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, setAccessToken } from './api';

const BRAND_COLOR = '#4F46E5';
const ACCENT_ORANGE = '#F7892C';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';
const ACCENT_BLUE = '#3B82F6';
const ACCENT_PURPLE = '#8B5CF6';
const ACCENT_TEAL = '#14B8A6';
const ACCENT_GRAY = '#6B7280';

const CHANNEL_GROUPS: Record<string, { name: string; description?: string }> = {
  transactions: { name: 'Transactions', description: 'Expenses, payments & settlements' },
  social: { name: 'Social', description: 'Groups, family & friends activity' },
  goals: { name: 'Goals & Savings', description: 'Goal progress & savings insights' },
  reminders: { name: 'Reminders & Alerts', description: 'Payment reminders & budget alerts' },
  insights: { name: 'Insights', description: 'AI-powered insights & reports' },
};

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

export function resetPushRegistration(): void {
  lastRegisteredToken = null;
  isRegistering = false;
}

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
      id: 'transactions',
      name: 'Expenses & Payments',
      description: 'Personal expenses, shared expenses & payment confirmations',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_ORANGE,
      sound: 'default',
      vibration: true,
    },
    {
      id: 'settlements',
      name: 'Settlements',
      description: 'Settlement requests, payments & receipts',
      importance: Notifications.AndroidImportance.HIGH,
      color: BRAND_COLOR,
      sound: 'default',
      vibration: true,
    },
    {
      id: 'groups',
      name: 'Groups & Social',
      description: 'Group invitations, member activity & shared finance',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_BLUE,
      sound: 'default',
      vibration: true,
    },
    {
      id: 'goals',
      name: 'Goals & Milestones',
      description: 'Goal progress, milestones & achievements',
      importance: Notifications.AndroidImportance.DEFAULT,
      color: ACCENT_GREEN,
      sound: 'default',
      vibration: false,
    },
    {
      id: 'budgets',
      name: 'Budgets & Alerts',
      description: 'Budget thresholds, spending alerts & warnings',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_RED,
      sound: 'default',
      vibration: true,
    },
    {
      id: 'reminders',
      name: 'Reminders & Due Dates',
      description: 'EMI, subscription & bill reminders',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_PURPLE,
      sound: 'default',
      vibration: true,
    },
    {
      id: 'insights',
      name: 'AI Insights & Reports',
      description: 'Daily AI insights, weekly digests & monthly reports',
      importance: Notifications.AndroidImportance.DEFAULT,
      color: ACCENT_TEAL,
      sound: 'default',
      vibration: false,
    },
    {
      id: 'social',
      name: 'Friends & Family',
      description: 'Friend requests, family invites & referrals',
      importance: Notifications.AndroidImportance.DEFAULT,
      color: BRAND_COLOR,
      sound: 'default',
      vibration: false,
    },
    {
      id: 'system',
      name: 'System Updates',
      description: 'App updates, account changes & security alerts',
      importance: Notifications.AndroidImportance.LOW,
      color: ACCENT_GRAY,
      sound: 'default',
      vibration: false,
    },
  ];
  for (const ch of channels) {
    try {
      await Notifications.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        vibrationPattern: ch.vibration ? [0, 200, 150, 200] : undefined,
        lightColor: ch.color,
        sound: ch.sound,
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
    if (Platform.OS === 'android') {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        pushToken = deviceToken.data;
      } catch (e) {
        console.warn('Android native FCM token failed, falling back to Expo push token:', e);
        try {
          const projectId = getProjectId();
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          pushToken = tokenData.data;
        } catch (e2) {
          console.warn('Expo push token also failed:', e2);
          return;
        }
      }
    } else {
      try {
        const projectId = getProjectId();
        console.log('iOS: fetching Expo push token with projectId:', projectId);
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        pushToken = tokenData.data;
        console.log('iOS: got Expo push token:', pushToken.substring(0, 40) + '...');
      } catch (e) {
        console.warn('iOS Expo push token failed, falling back to native APNs token:', e);
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          pushToken = deviceToken.data;
          console.log('iOS: got native APNs token:', pushToken.substring(0, 40) + '...');
        } catch (e2) {
          console.warn('iOS native APNs token also failed:', e2);
          return;
        }
      }
    }

    const storedId = getStableDeviceId();
    const deviceName = Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android');

    try {
      await api.post(
        '/devices/register',
        {
          deviceId: storedId,
          platform: Platform.OS,
          token: pushToken,
          deviceName,
        },
        undefined,
        5000,
      );
      lastRegisteredToken = accessToken;
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.warn('Push notification registration failed:', e);
      }
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
