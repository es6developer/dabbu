import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function CombinedWealthWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { combinedWealth } = data || {};
  const totalAssets = Number(combinedWealth?.totalAssets || 0);
  const savings = Number(combinedWealth?.savings || 0);
  const investments = Number(combinedWealth?.investments || 0);
  const netWorth = Number(combinedWealth?.netWorth || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Combined Wealth</Text>
      </View>
      <Text style={[styles.netWorth, { color: netWorth >= 0 ? '#16A34A' : '#DC2626' }]}>
        ₹{(netWorth || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Total Assets</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>₹{(totalAssets || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Savings</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(savings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Investments</Text>
          <Text style={[styles.value, { color: colors.accent.primary }]}>₹{(investments || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Net Worth</Text>
          <Text style={[styles.value, { color: netWorth >= 0 ? '#16A34A' : '#DC2626' }]}>₹{(netWorth || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
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
  divider: { width: 1, height: 32, marginHorizontal: 12 },
});
