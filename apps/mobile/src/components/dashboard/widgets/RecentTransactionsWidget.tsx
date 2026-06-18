import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function RecentTransactionsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { recentTransactions } = data || {};
  const txs = Array.isArray(recentTransactions) ? recentTransactions : [];

  if (!txs.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AntDesign name="swap" size={18} color={colors.accent.primary}  />
          <Text style={[styles.title, { color: colors.text.primary }]}>Recent Transactions</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="swap" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Recent Transactions</Text>
      </View>
      {txs.slice(0, 5).map((tx: any, i: number) => {
        const isIncome = tx.type === 'arrowdown' || tx.type === 'credit';
        const color = isIncome ? '#16A34A' : '#DC2626';
        const sign = isIncome ? '+' : '-';
        return (
          <View key={i} style={styles.txRow}>
            <View style={styles.txLeft}>
              <Text style={[styles.txName, { color: colors.text.primary }]}>{tx.description || tx.name || '-'}</Text>
              <Text style={[styles.txDate, { color: colors.text.secondary }]}>{tx.date || ''}</Text>
            </View>
            <Text style={[styles.txAmount, { color }]}>
              {sign}₹{(Number(tx.amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { gap: 1, flex: 1 },
  txName: { fontSize: 13, fontWeight: '500' },
  txDate: { fontSize: 10, fontWeight: '500' },
  txAmount: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 14, fontWeight: '500' },
});
