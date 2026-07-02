import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'outlined' | 'highlight' | 'premium' | 'glass' | 'gradient';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
  gradientColors?: string[];
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'xl',
  gradientColors,
}) => {
  const { colors, isDark } = useTheme();
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
      borderWidth: 1.5,
      borderColor: colors.border.subtle,
    },
    highlight: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['3xl'],
      borderLeftWidth: 4,
      borderLeftColor: colors.accent.primary,
      ...shadows.md,
    },
    premium: {
      backgroundColor: colors.bg.card,
      borderRadius: borderRadius['4xl'],
      ...shadows.premium,
      borderWidth: 1.5,
      borderColor: colors.accent.primary + '20',
    },
    glass: {
      backgroundColor: colors.bg.glass,
      borderRadius: borderRadius['4xl'],
      ...shadows.glass,
      borderWidth: 1.5,
      borderColor: colors.border.subtle,
    },
    gradient: {
      borderRadius: borderRadius['4xl'],
      ...shadows.premium,
      overflow: 'hidden',
    },
  };

  const cardContent = (
    <View style={[{ padding: padValue }, variantStyles[variant], ...(style ? (Array.isArray(style) ? style : [style]) : [])]}>
      {children}
    </View>
  );

  const renderCard = () => {
    if (variant === 'gradient') {
      const gColors = gradientColors || (isDark
        ? [colors.accent.primary, colors.accent.secondary, colors.bg.card]
        : [colors.accent.primary, colors.accent.tertiary, colors.bg.card + '80']);
      return (
        <LinearGradient
          colors={gColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ padding: padValue, borderRadius: borderRadius['4xl'] }, style as ViewStyle]}
        >
          {children}
        </LinearGradient>
      );
    }

    if (variant === 'glass') {
      return (
        <View style={[{ borderRadius: borderRadius['4xl'], overflow: 'hidden' }, shadows.glass, style as ViewStyle]}>
          <BlurView intensity={isDark ? 20 : 30} tint={isDark ? 'dark' : 'light'} style={{ padding: padValue }}>
            {children}
          </BlurView>
        </View>
      );
    }

    return cardContent;
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {renderCard()}
      </TouchableOpacity>
    );
  }

  return renderCard();
};

export { AppCard as Card };
