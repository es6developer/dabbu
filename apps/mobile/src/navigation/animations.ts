import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Theme } from '../theme';
import { Platform } from 'react-native';

/**
 * Smooth screen transitions for both platforms.
 * - iOS: slide_from_right (native iOS push transition)
 * - Android: fade + slide combination for smoother feel
 * - gesture back enabled for iOS-like swipe
 * - 350ms matches iOS default transition duration
 */
export function iosTransitionOptions(theme: Theme): NativeStackNavigationOptions {
  const { colors, typography } = theme;
  return {
    animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'slide_from_right',
    animationDuration: Platform.OS === 'android' ? 280 : 350,
    animationTypeForReplace: 'push',
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    headerStyle: { backgroundColor: colors.bg.primary },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontFamily: typography.calloutBold.fontFamily,
      fontSize: typography.calloutBold.fontSize,
      fontWeight: typography.calloutBold.fontWeight,
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
