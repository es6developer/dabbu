import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function UpcomingBillsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { upcomingBills } = data || {};
  const bills = Array.isArray(upcomingBills) ? upcomingBills : [];

  if (!bills.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>Upcoming Bills</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Upcoming Bills</Text>
      </View>
      {bills.slice(0, 5).map((bill: any, i: number) => (
        <View key={i} style={styles.billRow}>
          <Text style={[styles.billName, { color: colors.text.primary }]}>{bill.name || '-'}</Text>
          <View style={styles.billRight}>
            <Text style={[styles.billDays, { color: colors.accent.primary }]}>{bill.daysRemaining ?? '-'}d</Text>
            <Text style={[styles.billAmount, { color: colors.text.primary }]}>
              ₹{(Number(bill.amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billName: { fontSize: 13, fontWeight: '500', flex: 1 },
  billRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billDays: { fontSize: 11, fontWeight: '700' },
  billAmount: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 14, fontWeight: '500' },
});
