import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme, spacing, borderRadius } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'glass' | 'outlined' | 'premium' | 'dark' | 'highlight';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
}

const CARD_RADIUS = 20;

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'lg',
}) => {
  const { colors, isDark } = useTheme();
  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  const shadow: ViewStyle = isDark
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
      }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
      };

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadow,
    },
    elevated: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      ...shadow,
    },
    highlight: {
      backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.20)' : 'rgba(139, 92, 246, 0.12)',
      ...shadow,
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
      ...shadow,
    },
    dark: {
      backgroundColor: colors.bg.card,
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
      ...shadow,
    },
  };

  const content = (
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

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
