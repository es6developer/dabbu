import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function MonthlySnapshotWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { monthlySnapshot } = data || {};
  const income = Number(monthlySnapshot?.income || 0);
  const expense = Number(monthlySnapshot?.expense || 0);
  const saved = Number(monthlySnapshot?.saved ?? (income - expense));
  const savingsRate = Number(monthlySnapshot?.savingsRate ?? (income > 0 ? Math.round(((income - expense) / income) * 100) : 0));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Monthly Snapshot</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Income</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(income || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Expenses</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>₹{(expense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Saved</Text>
          <Text style={[styles.value, { color: saved >= 0 ? '#16A34A' : '#DC2626' }]}>₹{(saved || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Savings Rate</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>{savingsRate}%</Text>
        </View>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
        <View style={[styles.progressFill, { width: `${Math.min(savingsRate, 100)}%`, backgroundColor: '#16A34A' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '700' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
