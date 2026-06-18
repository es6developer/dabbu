import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function FamilyBillsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyBills } = data || {};
  const bills = Array.isArray(familyBills) ? familyBills : [];

  if (!bills.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AntDesign name="filetext1" size={18} color={colors.accent.primary}  />
          <Text style={[styles.title, { color: colors.text.primary }]}>Family Bills</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="filetext1" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Family Bills</Text>
      </View>
      {bills.slice(0, 6).map((bill: any, i: number) => (
        <View key={i} style={styles.billRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.billName, { color: colors.text.primary }]}>{bill.name || bill.category || '-'}</Text>
            {bill.daysRemaining !== undefined && (
              <Text style={[styles.daysBadge, { color: colors.accent.primary }]}>
                {bill.daysRemaining === 0 ? 'Due today' : `${bill.daysRemaining}d left`}
              </Text>
            )}
          </View>
          <Text style={[styles.billAmount, { color: colors.text.primary }]}>
            ₹{(Number(bill.amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
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
  billName: { fontSize: 13, fontWeight: '500' },
  daysBadge: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  billAmount: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 14, fontWeight: '500' },
});
