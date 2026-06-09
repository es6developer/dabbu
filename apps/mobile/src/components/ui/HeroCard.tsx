import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface HeroCardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  variant?: 'default' | 'compact';
}

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function HeroCard({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  variant = 'default',
}: HeroCardProps) {
  const { colors, isDark } = useTheme();
  const isCompact = variant === 'compact';

  return (
    <View
      className="mx-5 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(167, 139, 250, 0.20)' : 'rgba(139, 92, 246, 0.12)',
      }}
    >
      {/* Accent top bar */}
      <View style={{ height: 3, backgroundColor: colors.brand.primary, opacity: 0.5 }} />

      <View className="px-5 py-5">
        <Text
          className="text-[13px] font-medium tracking-wide"
          style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#6D28D9' }}
        >
          TOTAL BALANCE
        </Text>
        <Text
          className="font-bold tracking-tight mt-1"
          style={{
            fontSize: isCompact ? 28 : 36,
            lineHeight: isCompact ? 34 : 44,
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          {fmt(totalBalance)}
        </Text>

        <View className="flex-row mt-5 gap-4">
          <View className="flex-row items-center gap-1.5">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.status.success }}
            />
            <Text
              className="text-[12px] font-medium"
              style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B' }}
            >
              Income: {fmt(monthlyIncome)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.status.error }}
            />
            <Text
              className="text-[12px] font-medium"
              style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B' }}
            >
              Expenses: {fmt(monthlyExpense)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
