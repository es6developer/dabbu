import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const typeColor: Record<string, string> = {
  income: '#4ADE80',
  expense: '#F87171',
};

const typeIcon: Record<string, string> = {
  income: '+',
  expense: '-',
};

export function RecentTransactionsWidget({ data }: { data: any }) {
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Recent Transactions</Text>
      {data.slice(0, 5).map((txn: any) => (
        <View key={txn.id} style={styles.txnRow}>
          <View style={[styles.dot, { backgroundColor: typeColor[txn.type] || '#9CA3AF' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || txn.category || 'Transaction'}</Text>
            <Text style={styles.txnDate}>{new Date(txn.date).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.txnAmount, { color: typeColor[txn.type] || '#F9FAFB' }]}>
            {typeIcon[txn.type] || ''}₹{(txn.amount || 0).toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  txnDesc: { fontSize: 14, color: '#F9FAFB' },
  txnDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '700' },
});
