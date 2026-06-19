import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface HeroCardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  variant?: 'default' | 'compact' | 'premium';
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
  const isPremium = variant === 'premium';

  if (isPremium) {
    return (
      <LinearGradient
        colors={isDark ? ['#2E1065', '#4C1D95', '#1E1B4B'] : ['#7C3AED', '#6D28D9', '#5B21B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumContainer}
      >
        <View style={styles.premiumGlow} />
        <Text style={styles.premiumLabel}>TOTAL BALANCE</Text>
        <Text style={[styles.premiumAmount, isCompact && styles.premiumAmountCompact]}>
          {fmt(totalBalance)}
        </Text>
        <View style={styles.premiumStats}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#4ADE80' }]} />
            <Text style={styles.statText}>Income: {fmt(monthlyIncome)}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#F87171' }]} />
            <Text style={styles.statText}>Expenses: {fmt(monthlyExpense)}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
          borderColor: isDark ? 'rgba(124, 58, 237, 0.20)' : 'rgba(124, 58, 237, 0.12)',
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.brand.primary }]} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: isDark ? 'rgba(255,255,255,0.65)' : '#6D28D9' }]}>
          TOTAL BALANCE
        </Text>
        <Text
          style={[
            styles.amount,
            { color: isDark ? '#FFFFFF' : '#0F172A' },
            isCompact && styles.amountCompact,
          ]}
        >
          {fmt(totalBalance)}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statsItemRow}>
            <View style={[styles.dot, { backgroundColor: colors.status.success }]} />
            <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B' }]}>
              Income: {fmt(monthlyIncome)}
            </Text>
          </View>
          <View style={styles.statsItemRow}>
            <View style={[styles.dot, { backgroundColor: colors.status.error }]} />
            <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B' }]}>
              Expenses: {fmt(monthlyExpense)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  accentBar: {
    height: 3,
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  amountCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  statsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  premiumContainer: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    overflow: 'hidden',
  },
  premiumGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  premiumLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  premiumAmount: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -2,
    color: '#FFFFFF',
    marginTop: 6,
  },
  premiumAmountCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
  premiumStats: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
});
