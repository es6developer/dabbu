import React, { useCallback, useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, Animated, AccessibilityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends AccessibilityProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  haptic = true,
  fullWidth = false,
  ...accessibilityProps
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (disabled || loading) {return;}
    if (haptic) {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}
    onPress();
  }, [disabled, loading, haptic, onPress]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
      text: { ...typography.buttonSmall },
    },
    md: {
      container: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl },
      text: { ...typography.button },
    },
    lg: {
      container: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'] },
      text: { ...typography.button, fontSize: 18, lineHeight: 24 },
    },
  };

  const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
      },
      text: { color: '#FFFFFF' },
    },
    secondary: {
      container: {
        backgroundColor: colors.bg.glassLight,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.default,
      },
      text: { color: colors.text.primary },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderColor: colors.accent.primary,
      },
      text: { color: colors.accent.primary },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: borderRadius.lg,
      },
      text: { color: colors.accent.primary },
    },
    danger: {
      container: {
        backgroundColor: colors.status.error,
        borderRadius: borderRadius.lg,
      },
      text: { color: '#FFFFFF' },
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.container,
          currentSize.container,
          currentVariant.container,
          fullWidth && styles.fullWidth,
          disabled && { opacity: 0.5 },
          style,
        ]}
        {...accessibilityProps}
      >
        {loading ? (
          <ActivityIndicator size="small" color={currentVariant.text.color as string} />
        ) : (
          <>
            {icon && iconPosition === 'left' && <>{icon}</>}
            <Text
              style={[
                currentSize.text,
                currentVariant.text,
                (icon && iconPosition === 'left' ? { marginLeft: spacing.sm } : undefined),
                (icon && iconPosition === 'right' ? { marginRight: spacing.sm } : undefined),
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <>{icon}</>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});
