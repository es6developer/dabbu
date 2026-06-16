import React, { ReactNode } from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/design';
import { Shadow } from './Shadow';

const SHADOW_MAP: Record<string, { offset: { width: number; height: number }; blur: number; opacity: number }> = {
  sm: { offset: { width: 0, height: 2 }, blur: 6, opacity: 0.04 },
  md: { offset: { width: 0, height: 4 }, blur: 12, opacity: 0.06 },
  lg: { offset: { width: 0, height: 8 }, blur: 24, opacity: 0.08 },
};

interface FinCardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  radius?: number;
  elevation?: 'sm' | 'md' | 'lg';
  noPadding?: boolean;
}

export function FinCard({
  children,
  onPress,
  style,
  padding = spacing['2xl'],
  radius = borderRadius.lg,
  elevation = 'md',
  noPadding = false,
}: FinCardProps) {
  const { colors, isDark } = useTheme();
  const s = SHADOW_MAP[elevation];

  const cardContent = (
    <View
      style={[
        { backgroundColor: colors.bg.card, borderRadius: radius },
        !noPadding && { padding },
        style,
      ] as ViewStyle}
    >
      {children}
    </View>
  );

  const wrapped = (
    <Shadow
      radius={radius}
      offset={s.offset}
      opacity={isDark ? s.opacity * 5 : s.opacity}
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
