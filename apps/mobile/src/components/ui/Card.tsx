import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme, spacing, borderRadius } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'glass' | 'outlined' | 'premium';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'lg',
}) => {
  const { colors } = useTheme();
  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    elevated: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.border.subtle,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderRadius: borderRadius['2xl'],
      borderWidth: 1.5,
      borderColor: colors.border.default,
    },
    premium: {
      backgroundColor: colors.accent.primary + '15',
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.accent.primary + '25',
    },
  };

  const content = (
    <View style={[{ padding: padValue }, variantStyles[variant]].concat(style ? (Array.isArray(style) ? style : [style]) : [])}>
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
