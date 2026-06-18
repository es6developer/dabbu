import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function CoupleSnapshotWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { coupleSnapshot } = data || {};
  const your = coupleSnapshot?.yourContribution || {};
  const partner = coupleSnapshot?.partnerContribution || {};
  const combinedIncome = Number(coupleSnapshot?.combinedIncome || 0);
  const combinedExpense = Number(coupleSnapshot?.combinedExpense || 0);
  const combinedSavings = Number(coupleSnapshot?.combinedSavings || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Couple Snapshot</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Your Contribution</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>₹{(Number(your.amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Partner Contribution</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>₹{(Number(partner.amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Combined Income</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(combinedIncome || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Combined Expense</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>₹{(combinedExpense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Combined Savings</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(combinedSavings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.item} />
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
