import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const GRADIENT: [string, string] = ['#1A0B2E', '#3D1B6D'];

interface BalanceCardProps {
  totalBalance: number;
  monthlySpending: number;
  monthlyBudget: number;
  onSend?: () => void;
  onDeposit?: () => void;
  onRequest?: () => void;
}

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function BalanceCard({
  totalBalance,
  monthlySpending,
  monthlyBudget,
  onSend,
  onDeposit,
  onRequest,
}: BalanceCardProps) {
  const spendPct = monthlyBudget > 0 ? Math.min((monthlySpending / monthlyBudget) * 100, 100) : 0;
  const remaining = monthlyBudget - monthlySpending;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.2, y: 1.2 }}
        style={styles.card}
      >
        <View style={styles.labelRow}>
          <Text style={styles.label}>Joint Wallet</Text>
          <View style={styles.premiumDot}>
            <Ionicons name="diamond-outline" size={10} color="#FFFFFF" />
            <Text style={styles.premiumDotText}>PREMIUM</Text>
          </View>
        </View>

        <Text style={styles.balance}>{fmt(totalBalance)}</Text>
        <Text style={styles.caption}>Available balance</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.pill} activeOpacity={0.8} onPress={onSend}>
            <Ionicons name="arrow-up-outline" size={14} color="#FFFFFF" />
            <Text style={styles.pillText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} activeOpacity={0.8} onPress={onDeposit}>
            <Ionicons name="arrow-down-outline" size={14} color="#FFFFFF" />
            <Text style={styles.pillText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} activeOpacity={0.8} onPress={onRequest}>
            <Ionicons name="arrow-back-outline" size={14} color="#FFFFFF" />
            <Text style={styles.pillText}>Request</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fmt(monthlySpending)}</Text>
            <Text style={styles.statLabel}>Spent this month</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fmt(monthlyBudget)}</Text>
            <Text style={styles.statLabel}>Monthly budget</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(spendPct, 100)}%` }]} />
        </View>
        <Text
          style={[
            styles.progressLabel,
            { color: remaining >= 0 ? 'rgba(255,255,255,0.6)' : '#FF4D4F' },
          ]}
        >
          {spendPct.toFixed(0)}% used —
          {remaining >= 0 ? ` ${fmt(remaining)} left` : ` ${fmt(Math.abs(remaining))} over`}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginTop: -24,
    shadowColor: '#3D1B6D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 5,
  },
  card: {
    borderRadius: 24,
    padding: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  premiumDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  premiumDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  balance: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 50,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#C084FC',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
});
