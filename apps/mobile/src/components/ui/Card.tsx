import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing, borderRadius } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'glass' | 'outlined' | 'premium' | 'glassDark';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
  gradient?: [string, string];
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'lg',
  gradient,
}) => {
  const { colors, isDark } = useTheme();
  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius.xl,
    },
    elevated: {
      backgroundColor: colors.bg.elevated,
      borderRadius: borderRadius.xl,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.12,
      shadowRadius: 16,
      elevation: 10,
    },
    glass: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    glassDark: {
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderRadius: borderRadius.xl,
      borderWidth: 1.5,
      borderColor: colors.border.default,
    },
    premium: {
      backgroundColor: colors.accent.primary + '12',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.accent.primary + '25',
    },
  };

  const content = (
    <View style={[{ padding: padValue }, variantStyles[variant]].concat(style ? (Array.isArray(style) ? style : [style]) : [])}>
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.xl, opacity: isDark ? 0.15 : 0.08 }]}
        />
      ) : null}
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
