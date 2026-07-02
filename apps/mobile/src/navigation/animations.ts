import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Theme } from '../theme';
import { Platform } from 'react-native';

/**
 * One UI 8.5-inspired screen transitions.
 * - slide_from_right for horizontal push (native iOS-like)
 * - 350ms for responsive premium feel
 * - cross-fade on replace for smoother context switches
 */
export function iosTransitionOptions(theme: Theme): NativeStackNavigationOptions {
  const { colors, typography } = theme;
  return {
    animation: 'slide_from_right',
    animationDuration: 350,
    animationTypeForReplace: 'push',
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    headerStyle: { backgroundColor: colors.bg.primary },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontSize: typography.headline.fontSize,
      fontWeight: typography.headline.fontWeight as any,
    },
    contentStyle: { backgroundColor: colors.bg.primary },
    headerShadowVisible: false,
  };
}

/**
 * Modal presentation with smooth upward slide.
 */
export function iosModalOptions(theme: Theme): NativeStackNavigationOptions {
  return {
    ...iosTransitionOptions(theme),
    presentation: 'modal',
    animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'slide_from_bottom',
  };
}

/**
 * No animation for tab switches or screens where instant transitions are desired.
 */
export function noAnimationOptions(theme: Theme): NativeStackNavigationOptions {
  const { colors } = theme;
  return {
    animation: 'none',
    gestureEnabled: false,
    headerStyle: { backgroundColor: colors.bg.primary },
    contentStyle: { backgroundColor: colors.bg.primary },
    headerShadowVisible: false,
  };
}

/**
 * Apple-style spring animation config for Animated API.
 * tension: 150 (responsive)
 * friction: 12 (smooth settle, less bounce)
 * useNativeDriver: true
 */
export const APPLE_SPRING = {
  tension: 150,
  friction: 12,
  useNativeDriver: true,
} as const;

/**
 * Softer spring for cards/UI elements appearing.
 */
export const CARD_SPRING = {
  tension: 100,
  friction: 14,
  useNativeDriver: true,
} as const;

/**
 * Snappy press feedback spring.
 */
export const PRESS_SPRING = {
  tension: 200,
  friction: 16,
  useNativeDriver: true,
} as const;

/**
 * Smooth spring for tab content transitions (page moves on tab switch).
 * tension: 120 (responsive but not too bouncy)
 * friction: 14 (smooth settle)
 * useNativeDriver: true
 */
export const TAB_SPRING = {
  tension: 120,
  friction: 14,
  useNativeDriver: true,
} as const;

/**
 * Entry spring for screens/content appearing on mount.
 * tension: 80 (soft and smooth)
 * friction: 16 (very little bounce)
 * useNativeDriver: true
 */
export const ENTRY_SPRING = {
  tension: 80,
  friction: 16,
  useNativeDriver: true,
} as const;
