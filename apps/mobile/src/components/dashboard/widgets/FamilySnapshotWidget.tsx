import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function FamilySnapshotWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familySnapshot } = data || {};
  const income = Number(familySnapshot?.income || 0);
  const expense = Number(familySnapshot?.expense || 0);
  const savings = Number(familySnapshot?.savings || 0);
  const budgetUtil = Number(familySnapshot?.budgetUtilization ?? 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Family Snapshot</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Income</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(income || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Expenses</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>₹{(expense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Savings</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(savings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Budget Utilization</Text>
          <Text style={[styles.value, { color: budgetUtil > 100 ? '#DC2626' : colors.text.primary }]}>{budgetUtil}%</Text>
        </View>
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
  divider: { width: 1, height: 32, marginHorizontal: 12 },
});
