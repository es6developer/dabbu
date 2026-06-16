import React from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';

interface SurfaceCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  padding?: string;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  onPress,
  className = '',
  padding = 'p-5',
}) => {
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
    default: {},
  });

  const card = (
    <View
      className={`bg-dark-surface ${padding} rounded-xl ${className}`}
      style={shadowStyle}
    >
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
