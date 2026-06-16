import React, { ReactNode, useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/design';
import { Shadow } from './Shadow';

interface PremiumCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'hero' | 'compact';
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
  animate?: boolean;
}

const SHADOW_MAP: Record<string, { offset: { width: number; height: number }; blur: number; opacity: number }> = {
  default: { offset: { width: 0, height: 4 }, blur: 12, opacity: 0.06 },
  elevated: { offset: { width: 0, height: 8 }, blur: 24, opacity: 0.08 },
  hero: { offset: { width: 0, height: 8 }, blur: 24, opacity: 0.12 },
  compact: { offset: { width: 0, height: 2 }, blur: 6, opacity: 0.04 },
};

export function PremiumCard({
  children,
  variant = 'default',
  color,
  onPress,
  style,
  animate = false,
}: PremiumCardProps) {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animate ? 20 : 0)).current;
  const s = SHADOW_MAP[variant];

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

  const radii = variant === 'elevated' || variant === 'hero' ? borderRadius.xl : borderRadius.lg;
  const pad = variant === 'hero' ? spacing['3xl'] : variant === 'compact' ? spacing.lg : spacing['2xl'];

  const cardContent = (
    <Animated.View
      style={[
        {
          backgroundColor: color || (variant === 'hero' ? colors.card.balance : colors.bg.card),
          borderRadius: radii,
          padding: pad,
        },
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ] as ViewStyle}
    >
      {children}
    </Animated.View>
  );

  const shadowOpacity = isDark ? Math.min(s.opacity * 5, 0.4) : s.opacity;

  const wrapped = (
    <Shadow
      radius={radii}
      offset={s.offset}
      opacity={shadowOpacity}
      color={isDark ? '#7C3AED' : '#000'}
      blur={s.blur}
    >
      {cardContent}
    </Shadow>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {wrapped}
      </TouchableOpacity>
    );
  }

  return wrapped;
}
