import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme';
import { borderRadius } from '../../theme/design';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
}

export function GlassCard({ children, intensity = 30, tint = 'default', style }: GlassCardProps) {
  const { isDark } = useTheme();
  const actualTint = tint === 'default' ? (isDark ? 'dark' : 'light') : tint;

  return (
    <BlurView intensity={intensity} tint={actualTint} style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
