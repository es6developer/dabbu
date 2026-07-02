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
const ACCENT_PURPLE = '#7C3AED';
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
    handleNotification: async (notification) => {
      const { title, body, data } = notification.request.content;
      const notifTitle = title || (data?.title as string) || 'Dabbu';
      const notifBody = body || (data?.body as string) || (data?.message as string) || '';
      console.log(
        `[PUSH] title="${notifTitle}" body="${notifBody.substring(0, 100)}" type=${data?.type ?? ''}`,
      );
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
} catch (_e) {
  void _e;
}

let deviceId: string | null = null;
let isRegistering = false;
let registerStartedAt = 0;
let lastRegisteredToken: string | null = null;
let lastFailedAt = 0;
let consecutiveFailures = 0;
const REGISTER_TIMEOUT_MS = 15_000;

export function resetPushRegistration(): void {
  lastRegisteredToken = null;
  isRegistering = false;
}

export function clearPushRegistrationState(): void {
  lastRegisteredToken = null;
  isRegistering = false;
  consecutiveFailures = 0;
  lastFailedAt = 0;
  lastAttemptAt = 0;
  permanentFailure = false;
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
      id: 'default',
      name: 'General',
      description: 'General notifications',
      importance: Notifications.AndroidImportance.HIGH,
      color: BRAND_COLOR,
      vibration: true,
    },
    {
      id: 'transactions',
      name: 'Expenses & Payments',
      description: 'Personal expenses, shared expenses & payment confirmations',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_ORANGE,
      vibration: true,
    },
    {
      id: 'settlements',
      name: 'Settlements',
      description: 'Settlement requests, payments & receipts',
      importance: Notifications.AndroidImportance.HIGH,
      color: BRAND_COLOR,
      vibration: true,
    },
    {
      id: 'groups',
      name: 'Groups & Social',
      description: 'Group invitations, member activity & shared finance',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_BLUE,
      vibration: true,
    },
    {
      id: 'goals',
      name: 'Goals & Milestones',
      description: 'Goal progress, milestones & achievements',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_GREEN,
      vibration: false,
    },
    {
      id: 'budgets',
      name: 'Budgets & Alerts',
      description: 'Budget thresholds, spending alerts & warnings',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_RED,
      vibration: true,
    },
    {
      id: 'reminders',
      name: 'Reminders & Due Dates',
      description: 'EMI, subscription & bill reminders',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_PURPLE,
      vibration: true,
    },
    {
      id: 'insights',
      name: 'AI Insights & Reports',
      description: 'Daily AI insights, weekly digests & monthly reports',
      importance: Notifications.AndroidImportance.HIGH,
      color: ACCENT_TEAL,
      vibration: false,
    },
    {
      id: 'social',
      name: 'Friends & Family',
      description: 'Friend requests, family invites & referrals',
      importance: Notifications.AndroidImportance.HIGH,
      color: BRAND_COLOR,
      vibration: false,
    },
    {
      id: 'system',
      name: 'System Updates',
      description: 'App updates, account changes & security alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      color: ACCENT_GRAY,
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
        bypassDnd: ch.importance === Notifications.AndroidImportance.HIGH,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (_e) {
      void _e;
    }
  }
}

export { setupAndroidChannels };

let lastAttemptAt = 0;
let permanentFailure = false;
const MIN_THROTTLE_MS = 60_000;
const INITIAL_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 300_000;
const MAX_RETRIES = 3;

export async function registerForPushNotifications(accessToken: string): Promise<void> {
  const now = Date.now();

  if (permanentFailure) {
    return;
  }

  if (isRegistering) {
    if (now - registerStartedAt > REGISTER_TIMEOUT_MS) {
      isRegistering = false;
    } else {
      return;
    }
  }
  if (lastRegisteredToken === accessToken) {
    return;
  }
  if (now - lastAttemptAt < MIN_THROTTLE_MS) {
    return;
  }
  if (consecutiveFailures >= MAX_RETRIES) {
    console.log(`Push registration max retries (${consecutiveFailures}) reached, skipping`);
    return;
  }
  const backoffMs = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, consecutiveFailures), MAX_BACKOFF_MS);
  if (lastFailedAt > 0 && now - lastFailedAt < backoffMs) {
    console.log(`Push registration backoff: ${backoffMs}ms, skipping`);
    return;
  }
  isRegistering = true;
  registerStartedAt = now;
  lastAttemptAt = now;

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
          console.warn('Android Expo push token also failed:', e2);
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
      consecutiveFailures = 0;
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        lastFailedAt = Date.now();
        consecutiveFailures++;
        const errMsg = (e as any)?.message || '';
        if (
          errMsg.includes('Session expired') ||
          errMsg.includes('401') ||
          errMsg.includes('Unauthorized')
        ) {
          permanentFailure = true;
          lastRegisteredToken = accessToken;
        }
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

export function addPushTokenListener(
  handler: (token: Notifications.DevicePushToken) => any,
): Notifications.Subscription {
  return Notifications.addPushTokenListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

const NOTIF_TYPE_ICONS: Record<string, string> = {
  expense: 'ic_expense',
  shared_finance: 'ic_group',
  group_expense: 'ic_group',
  goal: 'ic_goal',
  emi: 'ic_bill',
  subscription: 'ic_subscription',
  settlement: 'ic_settlement',
  system: 'ic_system',
  reminder: 'ic_reminder',
  monthly_report: 'ic_report',
  weekly_digest: 'ic_insight',
  daily_digest: 'ic_insight',
};

export async function presentLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
): Promise<string | undefined> {
  try {
    const type = data?.type || 'system';
    const icon = NOTIF_TYPE_ICONS[type] || undefined;
    const notificationId = await Notifications.presentNotificationAsync({
      title,
      body,
      data,
      sound: true,
      ...(Platform.OS === 'android' && icon ? { icon } : {}),
      ...(Platform.OS === 'android' ? { color: BRAND_COLOR } : {}),
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
    const type = data?.type || 'system';
    const icon = NOTIF_TYPE_ICONS[type] || undefined;
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' && icon ? { icon } : {}),
        ...(Platform.OS === 'android' ? { color: BRAND_COLOR } : {}),
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
