import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface BalanceCardProps {
  totalBalance: number;
  monthlySpending: number;
  monthlyBudget: number;
}

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function BalanceCard({ totalBalance, monthlySpending, monthlyBudget }: BalanceCardProps) {
  const { colors } = useTheme();
  const spendPct = monthlyBudget > 0 ? Math.min((monthlySpending / monthlyBudget) * 100, 100) : 0;
  const remaining = monthlyBudget - monthlySpending;

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.card, { backgroundColor: colors.accent.primary }]}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.label}>Total Balance</Text>
            <Text style={styles.balance}>{fmt(totalBalance)}</Text>
          </View>
          <View style={styles.goldBadge}>
            <Ionicons name="wallet" size={14} color="#FFFFFF" />
            <Text style={styles.goldText}>Premium</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Monthly Spending</Text>
            <Text style={styles.statValue}>{fmt(monthlySpending)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Monthly Budget</Text>
            <Text style={styles.statValue}>{fmt(monthlyBudget)}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{spendPct.toFixed(0)}% used</Text>
            <Text style={[styles.progressLabel, remaining >= 0 ? { color: 'rgba(255,255,255,0.7)' } : { color: '#FF4D4F' }]}>
              {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#FF6B00', '#FF914D']}
              style={[styles.progressFill, { width: `${Math.min(spendPct, 100)}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: -24,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
  },
  card: {
    borderRadius: 20,
    padding: 22,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 4,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  goldText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  progressSection: {
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#242427',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
