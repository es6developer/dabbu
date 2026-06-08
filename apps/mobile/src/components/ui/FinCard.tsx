import React, { ReactNode } from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { borderRadius, shadows, spacing } from '../../theme/design';

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
  const { colors } = useTheme();
  const shadow = shadows[elevation];

  const cardStyle = {
    backgroundColor: colors.bg.card,
    borderRadius: radius,
    ...shadow,
  };

  const content = (
    <View style={[cardStyle, !noPadding && { padding }, style] as ViewStyle}>{children}</View>
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
