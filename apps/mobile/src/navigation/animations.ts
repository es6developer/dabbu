import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Theme } from '../theme';
import { Platform } from 'react-native';

/**
 * Apple-native spring-driven screen transitions.
 * - iOS: slide_from_right with 400ms (Apple default spring duration)
 * - Android: slide_from_right for iOS-consistent feel
 * - gesture back enabled for native iOS-like swipe
 * - 400ms matches Apple's UINavigationController spring transition
 */
export function iosTransitionOptions(theme: Theme): NativeStackNavigationOptions {
  const { colors, typography } = theme;
  return {
    animation: 'slide_from_right',
    animationDuration: 400,
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
