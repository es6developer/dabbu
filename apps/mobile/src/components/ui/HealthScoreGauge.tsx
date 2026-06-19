import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';

interface HealthScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const DIMENSIONS = { sm: 60, md: 80, lg: 100 };
const FONT_SIZES = { sm: 18, md: 26, lg: 34 };

function getScoreColor(score: number): string {
  if (score < 50) return '#EF4444';
  if (score < 70) return '#F97316';
  if (score < 90) return '#EAB308';
  return '#22C55E';
}

export function HealthScoreGauge({ score, size = 'md' }: HealthScoreGaugeProps) {
  const { colors } = useTheme();
  const dim = DIMENSIONS[size];
  const fontSize = FONT_SIZES[size];
  const color = getScoreColor(score);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: `${color}15`,
          borderWidth: 4,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize, fontWeight: '800', color }}>{score}</Text>
      </View>
    </View>
  );
}
