import React from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';

interface SurfaceCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  borderRadius?: number;
  padding?: string;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  onPress,
  className = '',
  borderRadius = 24,
  padding = 'p-5',
}) => {
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
    default: {},
  });

  const card = (
    <View className={`bg-white ${padding} ${className}`} style={[{ borderRadius }, shadowStyle]}>
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
