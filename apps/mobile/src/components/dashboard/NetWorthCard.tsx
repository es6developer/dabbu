import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';

interface NetWorthCardProps {
  netWorth: number;
  totalBalance: number;
  monthlyIncome: number;
  monthlySpent: number;
  savings: number;
  savingsRate: number;
  upcomingBillsTotal: number;
  subscriptionTotal: number;
  safeToSpend: number;
  healthScore: number;
}

export function NetWorthCard({
  netWorth,
  totalBalance,
  monthlyIncome,
  monthlySpent,
  savings,
  savingsRate,
  upcomingBillsTotal,
  subscriptionTotal,
  safeToSpend,
  healthScore,
}: NetWorthCardProps) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[cardStyles.container, { backgroundColor: colors.bg.card }]}
      onPress={() => navigation.navigate('NetWorth')}
      activeOpacity={0.85}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: colors.text.secondary,
          letterSpacing: 0.3,
        }}
      >
        Net Worth
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>₹</Text>
        <Text
          style={{
            fontSize: 36,
            fontWeight: '800',
            color: colors.text.primary,
            letterSpacing: -1.5,
          }}
        >
          {(netWorth ?? totalBalance ?? 0).toLocaleString('en-IN')}
        </Text>
      </View>

      {monthlyIncome > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <AntDesign
            name={(savings > 0 ? 'caretup' : 'caretdown') as any}
            size={14}
            color={savings > 0 ? '#10B981' : '#EF4444'}
          />
          <Text
            style={{ fontSize: 13, fontWeight: '700', color: savings > 0 ? '#10B981' : '#EF4444' }}
          >
            {savings > 0 ? '+' : ''}
            {(monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0).toFixed(1)}% this month
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>
            · Saved {fmtShort(savings)}
          </Text>
        </View>
      )}

      <View style={[cardStyles.monthRow, { backgroundColor: colors.bg.primary }]}>
        <MonthRow
          label="Income"
          value={fmtShort(monthlyIncome)}
          color="#10B981"
          pct={monthlyIncome > 0 ? 100 : 0}
        />
        <MonthRow
          label="Spent"
          value={fmtShort(monthlySpent)}
          color="#EF4444"
          pct={monthlyIncome > 0 ? (monthlySpent / monthlyIncome) * 100 : 0}
        />
        <MonthRow
          label="Saved"
          value={fmtShort(savings)}
          color="#10B981"
          pct={monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0}
          badge={savingsRate > 0 ? `${savingsRate.toFixed(0)}%` : undefined}
        />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 14 }} />

      <View style={{ gap: 8 }}>
        <ObligationRow
          icon="filetext1"
          label="Upcoming Bills"
          value={fmt(upcomingBillsTotal)}
          valueColor={colors.text.primary}
        />
        <ObligationRow
          icon="creditcard"
          label="Subscriptions"
          value={fmt(subscriptionTotal)}
          valueColor={colors.text.primary}
        />
      </View>

      {totalBalance !== null && (
        <View style={[cardStyles.pill, { backgroundColor: `${colors.accent.primary}12` }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
              Safe to Spend
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.accent.primary,
                letterSpacing: -0.5,
                marginTop: 1,
              }}
            >
              {fmt(safeToSpend)}
            </Text>
          </View>
          <AntDesign name="checkcircle" size={22} color={colors.accent.primary} />
        </View>
      )}

      <TouchableOpacity
        style={[cardStyles.pill, { backgroundColor: `${colors.accent.primary}08`, marginTop: 14 }]}
        onPress={() => navigation.navigate('HealthScore')}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
            Health Score
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: colors.accent.primary,
              letterSpacing: -0.5,
              marginTop: 1,
            }}
          >
            {healthScore}/100
          </Text>
        </View>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${colors.accent.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent.primary }}>
            {healthScore}
          </Text>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function MonthRow({
  label,
  value,
  color,
  pct,
  badge,
}: {
  label: string;
  value: string;
  color: string;
  pct: number;
  badge?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color, marginTop: 1 }}>{value}</Text>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: `${color}20`, marginTop: 4 }}>
        <View
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: 3,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
      {badge && (
        <Text style={{ fontSize: 9, fontWeight: '700', color, marginTop: 1 }}>{badge}</Text>
      )}
    </View>
  );
}

function ObligationRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AntDesign name={icon as any} size={16} color={colors.text.tertiary} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.text.secondary }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: valueColor }}>{value}</Text>
    </View>
  );
}

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) {
    return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  }
  if (v >= 100000) {
    return '₹' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '₹' + (v / 1000).toFixed(1) + 'K';
  }
  return fmt(v);
}

const cardStyles = {
  container: {
    borderRadius: 20,
    padding: 20,
  } as const,
  monthRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
  },
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 14,
  },
};
