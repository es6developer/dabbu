import React, { useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '../../theme';

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
  fullWidth = false,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 40,
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
        borderRadius: 12,
      },
      text: { color: '#FFFFFF' },
    },
    secondary: {
      container: {
        backgroundColor: colors.bg.tertiary,
        borderRadius: 12,
      },
      text: { color: colors.text.primary },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.accent.primary,
      },
      text: { color: colors.accent.primary },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 12,
      },
      text: { color: colors.accent.primary },
    },
    danger: {
      container: {
        backgroundColor: colors.status.error,
        borderRadius: 12,
      },
      text: { color: '#FFFFFF' },
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={onPress}
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
      >
        {loading ? (
          <ActivityIndicator size="small" color={currentVariant.text.color as string} />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <Text
              style={[
                currentSize.text,
                currentVariant.text,
                icon && iconPosition === 'left' ? { marginLeft: spacing.sm } : undefined,
                icon && iconPosition === 'right' ? { marginRight: spacing.sm } : undefined,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && icon}
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
