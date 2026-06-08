import React, { ReactNode, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { borderRadius, shadows, spacing } from '../../theme/design';

interface PremiumCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'hero' | 'compact';
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
  animate?: boolean;
}

export function PremiumCard({
  children,
  variant = 'default',
  color,
  onPress,
  style,
  animate = false,
}: PremiumCardProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animate ? 20 : 0)).current;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animate]);

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius.lg,
      padding: spacing['2xl'],
      ...shadows.md,
    },
    elevated: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius.xl,
      padding: spacing['2xl'],
      ...shadows.lg,
    },
    hero: {
      backgroundColor: color || colors.card.balance,
      borderRadius: borderRadius['2xl'],
      padding: spacing['3xl'],
      ...shadows.lg,
    },
    compact: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.sm,
    },
  };

  const cardStyle = {
    ...variantStyles[variant],
    ...(color && !['hero'].includes(variant) ? { backgroundColor: color } : {}),
    ...style,
  };

  const content = (
    <Animated.View
      style={
        [cardStyle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }] as ViewStyle
      }
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
