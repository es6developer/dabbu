import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'outlined' | 'highlight';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'xl',
}) => {
  const { colors } = useTheme();
  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['3xl'],
      ...shadows.md,
    },
    elevated: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['4xl'],
      ...shadows.lg,
    },
    outlined: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['3xl'],
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    highlight: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['3xl'],
      borderLeftWidth: 4,
      borderLeftColor: colors.accent.primary,
      ...shadows.md,
    },
  };

  const card = (
    <View style={[{ padding: padValue }, variantStyles[variant], ...(style ? (Array.isArray(style) ? style : [style]) : [])]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {card}
      </TouchableOpacity>
    );
  }

  return card;
};

export { AppCard as Card };
