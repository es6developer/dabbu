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
  offset = { width: 0, height: 4 },
  opacity = 0.15,
  color = '#000',
  blur = 12,
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

  const spread = blur * 0.35;
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View
        style={{
          position: 'absolute',
          top: offset.height - spread * 0.5,
          left: -spread * 0.5,
          right: -spread * 0.5,
          bottom: -offset.height - spread * 0.5,
          borderRadius: radius + spread,
          backgroundColor: color,
          opacity: Math.min(opacity * 1.5, 0.35),
        }}
        pointerEvents="none"
      />
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}
