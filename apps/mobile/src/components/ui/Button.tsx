import React, { useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, borderRadius, buttonHeight, animation } from '../../theme/design';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
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
  fullWidth?: boolean;
}

export const AppButton: React.FC<ButtonProps> = ({
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
  fullWidth = false,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const sizeMap: Record<ButtonSize, number> = {
    sm: buttonHeight.sm,
    md: buttonHeight.md,
    lg: buttonHeight.lg,
  };

  const fontSizeMap: Record<ButtonSize, number> = {
    sm: 15,
    md: 17,
    lg: 17,
  };

  const variantStyles = {
    primary: { bg: colors.accent.primary, text: '#FFFFFF', border: colors.accent.primary },
    secondary: { bg: colors.bg.tertiary, text: colors.text.primary, border: colors.border.default },
    outline: { bg: 'transparent', text: colors.accent.primary, border: colors.accent.primary },
    ghost: { bg: 'transparent', text: colors.accent.primary, border: 'transparent' },
    danger: { bg: colors.status.error, text: '#FFFFFF', border: colors.status.error },
  } as const;

  const v = variantStyles[variant];
  const height = sizeMap[size];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          {
            height,
            borderRadius: borderRadius['2xl'],
            backgroundColor: v.bg,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            borderColor: v.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing['2xl'],
            gap: spacing.sm,
            opacity: disabled ? 0.4 : 1,
          },
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <Text style={[{ fontSize: fontSizeMap[size], fontWeight: '600', color: v.text, letterSpacing: -0.05 }, textStyle]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export { AppButton as Button };
