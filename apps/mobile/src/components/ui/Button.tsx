import React, { useRef } from 'react';
import { Animated, TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { spacing, borderRadius, buttonHeight, hitSlop } from '../../theme/design';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  accessibilityLabel?: string;
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
  accessibilityLabel,
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
    sm: 14,
    md: 16,
    lg: 17,
  };

  const variantStyles = {
    primary: { bg: colors.accent.primary, text: '#FFFFFF', border: colors.accent.primary },
    secondary: { bg: colors.bg.tertiary, text: colors.text.primary, border: colors.border.default },
    outline: { bg: 'transparent', text: colors.accent.primary, border: colors.accent.primary },
    ghost: { bg: 'transparent', text: colors.accent.primary, border: 'transparent' },
    danger: { bg: colors.status.error, text: '#FFFFFF', border: colors.status.error },
    premium: { bg: colors.accent.primary, text: '#FFFFFF', border: colors.accent.primary },
  };

  const v = variantStyles[variant];
  const height = sizeMap[size];

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={[{ fontSize: fontSizeMap[size], fontWeight: '700', color: v.text, letterSpacing: -0.3 }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </>
  );

  const commonStyle: ViewStyle = {
    height,
    borderRadius: borderRadius['2xl'],
    borderWidth: variant === 'outline' ? 1.5 : 0,
    borderColor: v.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    columnGap: spacing.sm,
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <Animated.View style={[{
      transform: [{ scale: scaleAnim }],
      shadowColor: variant === 'premium' ? colors.accent.primary : '#000',
      shadowOffset: { width: 0, height: variant === 'premium' ? 4 : 0 },
      shadowOpacity: variant === 'premium' ? 0.3 : 0,
      shadowRadius: variant === 'premium' ? 12 : 0,
      elevation: variant === 'premium' ? 6 : 0,
    }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.85}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading }}
        style={[
          commonStyle,
          variant === 'premium' ? { backgroundColor: 'transparent', overflow: 'hidden' } : { backgroundColor: v.bg },
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {variant === 'premium' ? (
          <LinearGradient
            colors={[colors.accent.primary, colors.accent.hover || colors.accent.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, height: '100%', borderRadius: borderRadius['2xl'], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'], columnGap: spacing.sm }}
          >
            {buttonContent}
          </LinearGradient>
        ) : (
          buttonContent
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export { AppButton as Button };
