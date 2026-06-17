import React from 'react';
import { View, Platform, ViewStyle } from 'react-native';

interface ShadowProps {
  children: React.ReactNode;
  radius?: number;
  offset?: { width: number; height: number };
  opacity?: number;
  color?: string;
  blur?: number;
  style?: ViewStyle;
}

export function Shadow({
  children,
  radius = 20,
  offset = { width: 0, height: 1 },
  opacity = 0.04,
  color = '#000',
  blur = 4,
  style,
}: ShadowProps) {
  if (Platform.OS === 'ios') {
    return (
      <View
        style={[
          {
            shadowColor: color,
            shadowOffset: offset,
            shadowOpacity: opacity,
            shadowRadius: blur,
            borderRadius: radius,
          },
          style,
        ]}
      >
        <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: 'transparent',
          elevation: Math.min(Math.round(blur / 4), 2),
          borderRadius: radius,
        },
        style,
      ]}
    >
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}
