import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, setAccessToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let deviceId: string | null = null;

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined
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
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  try {
    const projectId = getProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const pushToken = tokenData.data;

    const storedId = getStableDeviceId();

    await api.post('/devices/register', {
      deviceId: storedId,
      platform: Platform.OS,
      token: pushToken,
      deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
    });
  } catch (_e) {
    // silent
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f7892c',
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
