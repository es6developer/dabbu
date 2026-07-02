import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function CoupleSnapshotWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { coupleSnapshot } = data || {};
  const userContribution = Number(coupleSnapshot?.yourContribution?.amount ?? coupleSnapshot?.userContribution ?? 0);
  const partnerContribution = Number(coupleSnapshot?.partnerContribution?.amount ?? coupleSnapshot?.partnerContribution ?? 0);
  const combinedIncome = Number(coupleSnapshot?.combinedIncome || 0);
  const combinedExpense = Number(coupleSnapshot?.combinedExpense || 0);
  const combinedSavings = Number(coupleSnapshot?.savings || coupleSnapshot?.combinedSavings || 0);
  const savingsRate = combinedIncome > 0 ? Math.round((combinedSavings / combinedIncome) * 100) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={isDark ? ['#16A34A08', 'transparent'] : ['#16A34A06', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius['2xl'],
        }}
      />
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: '#16A34A15' }]}>
          <AntDesign name="team" size={18} color="#16A34A" />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Couple Snapshot</Text>
      </View>

      <View style={styles.barRow}>
        <View style={styles.barItem}>
          <Text style={[styles.barLabel, { color: colors.text.tertiary }]}>Your Income</Text>
          <Text style={[styles.barValue, { color: colors.text.primary }]}>
            {fmt(userContribution)}
          </Text>
        </View>
        <View style={[styles.barDivider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.barItem}>
          <Text style={[styles.barLabel, { color: colors.text.tertiary }]}>Partner Income</Text>
          <Text style={[styles.barValue, { color: colors.text.primary }]}>
            {fmt(partnerContribution)}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <AntDesign name="arrowdown" size={14} color="#16A34A" />
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Income</Text>
          <Text style={[styles.statValue, { color: '#16A34A' }]}>{fmt(combinedIncome)}</Text>
        </View>
        <View style={styles.statItem}>
          <AntDesign name="arrowup" size={14} color="#DC2626" />
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Expenses</Text>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{fmt(combinedExpense)}</Text>
        </View>
        <View style={styles.statItem}>
          <AntDesign name="save" size={14} color="#16A34A" />
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Savings</Text>
          <Text style={[styles.statValue, { color: '#16A34A' }]}>{fmt(combinedSavings)}</Text>
        </View>
      </View>

      {savingsRate > 0 && (
        <View style={styles.savingsBar}>
          <View style={[styles.savingsBg, { backgroundColor: colors.bg.tertiary }]}>
            <View
              style={[
                styles.savingsFill,
                {
                  width: `${savingsRate}%`,
                  backgroundColor:
                    savingsRate >= 30 ? '#16A34A' : savingsRate >= 15 ? '#EAB308' : '#DC2626',
                },
              ]}
            />
          </View>
          <Text style={[styles.savingsRateLabel, { color: colors.text.tertiary }]}>
            {savingsRate}% savings rate
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barItem: { flex: 1, gap: 2 },
  barLabel: { fontSize: 11, fontWeight: '500' },
  barValue: { fontSize: 16, fontWeight: '700' },
  barDivider: { width: 1, height: 32, marginHorizontal: 20 },
  divider: { height: 1, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  statItem: { flex: 1, gap: 3, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '700' },
  savingsBar: { gap: 4 },
  savingsBg: { height: 6, borderRadius: 12, overflow: 'hidden' },
  savingsFill: { height: '100%', borderRadius: 12 },
  savingsRateLabel: { fontSize: 10, fontWeight: '500', textAlign: 'right' },
});
