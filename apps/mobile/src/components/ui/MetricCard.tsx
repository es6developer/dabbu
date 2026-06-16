import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FinCard } from './FinCard';

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: { value: string; positive: boolean };
  color?: string;
  cardBg?: string;
  onPress?: () => void;
}

export function MetricCard({ label, value, icon, trend, color, cardBg, onPress }: MetricCardProps) {
  const { colors } = useTheme();
  const accentColor = color || colors.accent.primary;

  return (
    <FinCard
      onPress={onPress}
      style={{ flex: 1, ...(cardBg ? { backgroundColor: cardBg } : {}) }}
      padding={20}
      elevation="sm"
      radius={22}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: `${accentColor}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AntDesign name={icon as any} size={18} color={accentColor} />
        </View>
        {trend && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: trend.positive
                ? `${colors.status.success}15`
                : `${colors.status.error}15`,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              marginLeft: 'auto',
            }}
          >
            <AntDesign
              name={(trend.positive ? 'trending-up' : 'trending-down') as any}
              size={12}
              color={trend.positive ? colors.status.success : colors.status.error}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: trend.positive ? colors.status.success : colors.status.error,
              }}
            >
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          color: colors.text.tertiary,
          fontSize: 12,
          fontWeight: '500',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text.primary,
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: -0.8,
        }}
      >
        {value}
      </Text>
    </FinCard>
  );
}
