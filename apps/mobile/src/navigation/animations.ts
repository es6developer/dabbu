import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Theme } from '../theme';

/**
 * iOS-style smooth screen transitions for both platforms.
 * - slide_from_right: mimics iOS push transition
 * - spring animation for smooth card-style feel
 * - gesture back enabled for iOS-like swipe
 * - 350ms matches iOS default transition duration
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
    animation: 'slide_from_bottom',
  };
}
