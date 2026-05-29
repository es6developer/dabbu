import { Platform, NativeModules, Linking, Alert } from 'react-native';
import type { SmsMessage } from './sms-parser';

function getReadSmsPermission() {
  try {
    const { PermissionsAndroid } = require('react-native');
    return PermissionsAndroid.PERMISSIONS.READ_SMS;
  } catch (_e) {
    return null;
  }
}

export type SmsPermissionStatus = 'granted' | 'denied' | 'never_ask_again' | 'restricted' | 'unavailable';

interface SmsNativeModule {
  list(
    filter: string,
    errorCallback: (error: string) => void,
    successCallback: (count: number, jsonString: string) => void,
  ): void;
}

function getSmsModule(): SmsNativeModule | null {
  const mod = NativeModules.Sms as SmsNativeModule | undefined;
  if (!mod || typeof mod.list !== 'function') return null;
  return mod;
}

export function isSmsModuleAvailable(): boolean {
  return Platform.OS === 'android' && getSmsModule() !== null;
}

export function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') return 0;
  return Platform.Version as number;
}

export function isPermissionRestricted(): boolean {
  const level = getAndroidApiLevel();
  return level >= 30;
}

export function isPermissionBlockedByOs(): boolean {
  const level = getAndroidApiLevel();
  return level >= 30;
}

export async function checkSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS === 'web') return 'unavailable';
  if (Platform.OS !== 'android') return 'unavailable';

  if (!isSmsModuleAvailable()) return 'unavailable';

  try {
    const { PermissionsAndroid } = require('react-native');
    const granted = await PermissionsAndroid.check(getReadSmsPermission());
    if (granted) return 'granted';

    return 'denied';
  } catch (_e) {
    return 'unavailable';
  }
}

export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  if (!isSmsModuleAvailable()) return 'unavailable';

  try {
    const { PermissionsAndroid } = require('react-native');
    const result = await PermissionsAndroid.request(getReadSmsPermission(), {
      title: 'SMS Permission',
      message: 'Dabbu needs SMS access to detect and track your financial transactions automatically.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
      buttonNeutral: 'Ask Later',
    });

    switch (result) {
      case PermissionsAndroid.RESULTS.GRANTED:
        return 'granted';
      case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
        return 'never_ask_again';
      default:
        if (isPermissionRestricted()) {
          return 'restricted';
        }
        return 'denied';
    }
  } catch (_e) {
    return 'unavailable';
  }
}

export function openAppSettings(): void {
  Linking.openSettings();
}

export function getAdbGrantCommand(packageName: string = 'app.dabbu.mobile'): string {
  return `adb shell pm grant ${packageName} android.permission.READ_SMS`;
}

export function getAdbRevokeCommand(packageName: string = 'app.dabbu.mobile'): string {
  return `adb shell pm revoke ${packageName} android.permission.READ_SMS`;
}

export function showPermissionGuidance(permissionStatus: SmsPermissionStatus): void {
  const level = getAndroidApiLevel();

  switch (permissionStatus) {
    case 'never_ask_again':
      Alert.alert(
        'Permission Required',
        `SMS permission was permanently denied. Please enable it in system Settings.\n\n` +
        (level >= 30
          ? 'On Android 10+, SMS permission is restricted. You must manually enable it:\n' +
            'Settings → Apps → Dabbu → Permissions → SMS → Allow'
          : ''),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ],
      );
      break;

    case 'restricted':
      Alert.alert(
        'Restricted Permission',
        `On Android ${level}, SMS access requires manual approval.\n\n` +
        'Option 1: Open Settings to grant permission\n' +
        'Option 2: For development builds, run:\n' +
        `  ${getAdbGrantCommand()}\n\n` +
        'Or paste SMS messages manually below.',
        [
          { text: 'Open Settings', onPress: openAppSettings },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      break;

    case 'denied':
      Alert.alert(
        'Permission Denied',
        'SMS reading needs this permission to detect financial transactions from your messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => requestSmsPermission() },
          { text: 'Open Settings', onPress: openAppSettings },
        ],
      );
      break;

    default:
      break;
  }
}

export async function readSmsSince(timestamp?: number): Promise<SmsMessage[]> {
  if (Platform.OS === 'web' || Platform.OS !== 'android') return [];

  const module = getSmsModule();
  if (!module) return [];

  const permission = await checkSmsPermission();
  if (permission !== 'granted') return [];

  return new Promise<SmsMessage[]>((resolve) => {
    try {
      const filter = JSON.stringify({
        box: 'inbox',
        maxCount: 100,
        minDate: timestamp ?? Date.now() - 30 * 24 * 60 * 60 * 1000,
        sortOrder: 'date DESC',
      });

      module.list(
        filter,
        (_error: string) => {
          resolve([]);
        },
        (_count: number, jsonString: string) => {
          try {
            const raw: any[] = JSON.parse(jsonString);
            const messages: SmsMessage[] = (raw ?? []).map((m: any) => ({
              id: String(m._id ?? m.id ?? Math.random()),
              address: String(m.address ?? m.originatingAddress ?? 'Unknown'),
              body: String(m.body ?? ''),
              date: typeof m.date === 'number' ? m.date : parseInt(String(m.date), 10) || Date.now(),
              read: m.read === true || m.read === 1,
            })            ).filter((m: SmsMessage) =>
              /(?:rs|inr|debited|credited|paid|received|balance|upi|spent|withdrawn|transfer|refund|payment|bill|recharge|emi|trf|amount|ac\b|card|bank|a\/c)/i.test(m.body),
            );
            resolve(messages);
          } catch (_e) {
            resolve([]);
          }
        },
      );
    } catch (_e) {
      resolve([]);
    }
  });
}

export function getAndroidPermissionExplanation(level: number): string {
  if (level >= 33) {
    return (
      'Android 14+ (API 33+) classifies READ_SMS as a "restricted" permission. ' +
      'The system may silently deny the request without showing a dialog. ' +
      'You must manually grant it in Settings, or grant via ADB for development:\n\n' +
      `  ${getAdbGrantCommand()}\n\n` +
      'On Play Store, apps require Google approval to use READ_SMS.'
    );
  }
  if (level >= 30) {
    return (
      'Android 11-13 restricts READ_SMS permission. The dialog may not appear. ' +
      'Enable it in Settings, or use ADB for development:\n\n' +
      `  ${getAdbGrantCommand()}`
    );
  }
  if (level >= 23) {
    return (
      'Android 6-9 shows a permission dialog at runtime. ' +
      'If the dialog does not appear, check Settings or use:\n\n' +
      `  ${getAdbGrantCommand()}`
    );
  }
  return 'Your Android version does not support runtime permission requests.';
}

export async function ensureSmsPermission(): Promise<SmsPermissionStatus> {
  const current = await checkSmsPermission();
  if (current === 'granted') return 'granted';

  const requested = await requestSmsPermission();
  return requested;
}
