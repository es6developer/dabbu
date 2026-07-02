import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function NetWorthWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { netWorth } = data || {};
  const assets = Number(netWorth?.assets || 0);
  const liabilities = Number(netWorth?.liabilities || 0);
  const total = Number(netWorth?.total ?? (assets - liabilities));
  const snapshots = netWorth?.snapshots;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="wallet" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Net Worth</Text>
      </View>
      <Text style={[styles.netWorth, { color: total >= 0 ? '#16A34A' : '#DC2626' }]}>
        ₹{(total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Assets</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(assets || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Liabilities</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>₹{(liabilities || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      {snapshots && snapshots.length > 0 && (
        <View style={[styles.trendBadge, { backgroundColor: colors.bg.tertiary }]}>
          <AntDesign name="caretup" size={12} color={colors.accent.primary}  />
          <Text style={[styles.trendText, { color: colors.text.secondary }]}>
            Last 6 months trend
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  netWorth: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, height: 32, marginHorizontal: 14 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 30 },
  trendText: { fontSize: 11, fontWeight: '600' },
});
