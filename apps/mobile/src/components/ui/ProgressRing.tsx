import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../../theme';

interface ProgressRingProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function ProgressRing({ pct, size = 60, strokeWidth = 5, color }: ProgressRingProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const accentColor = color || colors.accent.primary;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(pct, 100),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const half = size / 2;

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: colors.border.subtle,
          position: 'absolute',
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: accentColor,
          position: 'absolute',
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        }}
      />
    </View>
  );
}
