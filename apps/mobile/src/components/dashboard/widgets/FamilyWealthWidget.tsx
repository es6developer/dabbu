import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function FamilyWealthWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyWealth } = data || {};
  const assets = Number(familyWealth?.totalAssets || 0);
  const savings = Number(familyWealth?.savings || 0);
  const investments = Number(familyWealth?.investments || 0);
  const properties = Number(familyWealth?.properties || 0);
  const loans = Number(familyWealth?.loans || 0);
  const netWorth = Number(familyWealth?.netWorth || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="wallet" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Family Wealth</Text>
      </View>
      <Text style={[styles.netWorth, { color: netWorth >= 0 ? '#16A34A' : '#DC2626' }]}>
        ₹{(netWorth || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Assets</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>₹{(assets || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Savings</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>₹{(savings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Investments</Text>
          <Text style={[styles.value, { color: colors.accent.primary }]}>₹{(investments || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Properties</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>₹{(properties || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Loans</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>₹{(loans || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
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
  netWorth: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, height: 32, marginHorizontal: 14 },
});
