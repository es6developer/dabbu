import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function FamilyExpensesWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyExpenses } = data || {};
  const expenses = Array.isArray(familyExpenses) ? familyExpenses : [];

  if (!expenses.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AntDesign name="creditcard" size={18} color={colors.accent.primary}  />
          <Text style={[styles.title, { color: colors.text.primary }]}>Expense Breakdown</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="creditcard" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Expense Breakdown</Text>
      </View>
      {expenses.map((e: any, i: number) => (
        <View key={i} style={styles.expRow}>
          <Text style={[styles.expName, { color: colors.text.primary }]}>{e.category || e.name || '-'}</Text>
          <Text style={[styles.expAmount, { color: '#DC2626' }]}>
            ₹{(Number(e.amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
  expRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expName: { fontSize: 13, fontWeight: '500', flex: 1 },
  expAmount: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 14, fontWeight: '500' },
});
