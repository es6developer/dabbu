import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function NetWorthWidget({ data }: { data: any }) {
  if (!data) return null;
  const nw = data.netWorth || 0;
  const change = data.trend?.length > 1 ? data.trend[data.trend.length - 1].netWorth - data.trend[data.trend.length - 2].netWorth : 0;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Net Worth</Text>
      <Text style={[styles.value, { color: nw >= 0 ? '#4ADE80' : '#F87171' }]}>
        ₹{nw.toLocaleString()}
      </Text>
      {change !== 0 && (
        <View style={styles.changeRow}>
          <Ionicons name={change > 0 ? 'trending-up' : 'trending-down'} size={14} color={change > 0 ? '#4ADE80' : '#F87171'} />
          <Text style={[styles.change, { color: change > 0 ? '#4ADE80' : '#F87171' }]}>
            ₹{Math.abs(change).toLocaleString()} this month
          </Text>
        </View>
      )}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Assets: ₹{(data.totalAssets || 0).toLocaleString()}</Text>
        <Text style={styles.meta}>Liabilities: ₹{(data.totalLiabilities || 0).toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  change: { fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272A' },
  meta: { fontSize: 12, color: '#6B7280' },
});
