import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface DabbuScoreMiniProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  change?: number;
  showLabel?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
}

const SIZE_MAP = {
  sm: { ring: 36, fontSize: 14, borderWidth: 3 },
  md: { ring: 48, fontSize: 18, borderWidth: 4 },
  lg: { ring: 64, fontSize: 24, borderWidth: 5 },
};

export function DabbuScoreMini({
  score,
  size = 'sm',
  change,
  showLabel = false,
}: DabbuScoreMiniProps) {
  const { colors } = useTheme();
  const dims = SIZE_MAP[size];
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            width: dims.ring,
            height: dims.ring,
            borderRadius: dims.ring / 2,
            borderWidth: dims.borderWidth,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={[
            styles.score,
            {
              fontSize: dims.fontSize,
              color: colors.text.primary,
            },
          ]}
        >
          {score}
        </Text>
      </View>
      {showLabel && (
        <Text
          style={[styles.label, { color: colors.text.tertiary }]}
        >
          {label}
        </Text>
      )}
      {change !== undefined && change !== 0 && (
        <Text
          style={[
            styles.change,
            { color: change > 0 ? '#22C55E' : '#EF4444' },
          ]}
        >
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  ring: { alignItems: 'center', justifyContent: 'center' },
  score: { fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '600' },
  change: { fontSize: 10, fontWeight: '700' },
});
