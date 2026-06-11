import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme, spacing, borderRadius } from '../../theme';
import { Shadow } from './Shadow';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'glass' | 'outlined' | 'premium' | 'dark' | 'highlight';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
}

const CARD_RADIUS = 20;
const ACCENT = '#8B5CF6';

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'lg',
}) => {
  const { colors, isDark } = useTheme();
  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  const shadowVariant = variant === 'elevated' ? 'lg' : 'md';
  const shadowOpacity = isDark ? 0.35 : 0.06;

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    elevated: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    highlight: {
      backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.20)' : 'rgba(139, 92, 246, 0.12)',
    },
    glass: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.85)',
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderRadius: CARD_RADIUS,
      borderWidth: 1.5,
      borderColor: colors.border.default,
    },
    premium: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: colors.accent.primary + '30',
    },
    dark: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
    },
  };

  const needsShadow = ['default', 'elevated', 'highlight', 'premium', 'dark'].includes(variant);

  const cardContent = (
    <View
      style={[
        { padding: padValue },
        variantStyles[variant],
        ...(style ? (Array.isArray(style) ? style : [style]) : []),
      ]}
    >
      {children}
    </View>
  );

  const content = needsShadow ? (
    <Shadow
      radius={CARD_RADIUS}
      offset={shadowVariant === 'lg' ? { width: 0, height: 8 } : { width: 0, height: 4 }}
      opacity={shadowOpacity}
      color={isDark ? ACCENT : '#000'}
      blur={shadowVariant === 'lg' ? 24 : 12}
    >
      {cardContent}
    </Shadow>
  ) : (
    cardContent
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
