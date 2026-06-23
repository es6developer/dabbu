import { AppState, Platform, NativeModules } from 'react-native';

const { RNDynamicAppIcon, DynamicAppIcon } = NativeModules;

export type AppIconName = 'Default' | 'Personal' | 'Couple' | 'Family' | 'Full';

const ICON_MAP: Record<string, AppIconName> = {
  PERSONAL: 'Personal',
  PARTNERED: 'Couple',
  FAMILY: 'Family',
  FULL: 'Full',
};

let lastRequestedIcon: AppIconName | null = null;
let cleanupListenerStarted = false;

export function lensToIconName(lens: string): AppIconName {
  return ICON_MAP[lens] || 'Personal';
}

export async function setAppIcon(name: AppIconName | null): Promise<void> {
  try {
    const target = name || 'Default';
    if (lastRequestedIcon === target) {
      return;
    }
    lastRequestedIcon = target;

    if (Platform.OS === 'ios') {
      if (RNDynamicAppIcon?.setAppIcon) {
        RNDynamicAppIcon.setAppIcon(name);
      }
    } else if (Platform.OS === 'android') {
      if (DynamicAppIcon?.setAppIcon) {
        DynamicAppIcon.setAppIcon(target);
      }
    }
  } catch (e) {
    console.warn('Failed to set app icon:', e);
  }
}

export function cleanupStaleAppIcons(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    DynamicAppIcon?.cleanupStaleIcons?.();
  } catch (e) {
    console.warn('Failed to cleanup stale app icons:', e);
  }
}

export function startDynamicAppIconCleanupListener(): void {
  if (cleanupListenerStarted || Platform.OS !== 'android') {
    return;
  }
  cleanupListenerStarted = true;
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background') {
      cleanupStaleAppIcons();
    }
  });
}

export async function supportsDynamicAppIcon(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      if (RNDynamicAppIcon?.supportsDynamicAppIcon) {
        return await RNDynamicAppIcon.supportsDynamicAppIcon();
      }
      return false;
    }
    if (Platform.OS === 'android') {
      if (DynamicAppIcon?.supportsDynamicAppIcon) {
        return await DynamicAppIcon.supportsDynamicAppIcon();
      }
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

export function getDynamicAppIconName(): Promise<string> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios' && RNDynamicAppIcon?.getIconName) {
      RNDynamicAppIcon.getIconName((result: { iconName: string }) => {
        resolve(result.iconName);
      });
    } else if (Platform.OS === 'android' && DynamicAppIcon?.getIconName) {
      DynamicAppIcon.getIconName((name: string) => {
        resolve(name);
      });
    } else {
      resolve('Default');
    }
  });
}
