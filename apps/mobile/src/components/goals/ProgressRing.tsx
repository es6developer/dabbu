import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#7C3AED',
  trackColor = '#E5E7EB',
  animated = true,
}: ProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const halfSize = size / 2;
  const radius = halfSize - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: clampedProgress,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    } else {
      animatedValue.setValue(clampedProgress);
    }
  }, [clampedProgress, animated]);

  const isDark = trackColor === '#E5E7EB';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderLeftColor: color,
            borderTopColor: color,
            transform: [{ rotate: `${-90 + (clampedProgress / 100) * 360}deg` }],
          },
        ]}
      />
      <View style={[styles.center, { width: size - strokeWidth * 4, height: size - strokeWidth * 4 }]}>
        <AnimatedText
          style={{ fontSize: size * 0.28, fontWeight: '700', color }}
          value={Math.round(clampedProgress)}
        />
      </View>
    </View>
  );
}

function AnimatedText({ style, value }: { style: any; value: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <Animated.Text style={style}>
      {value}%
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
