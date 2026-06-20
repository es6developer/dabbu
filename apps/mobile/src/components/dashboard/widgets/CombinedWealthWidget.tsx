import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function CombinedWealthWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { combinedWealth } = data || {};
  const totalAssets = Number(combinedWealth?.totalAssets || 0);
  const totalSavings = Number(combinedWealth?.totalSavings || combinedWealth?.savings || 0);
  const investments = Number(combinedWealth?.totalInvestments || combinedWealth?.investments || 0);
  const netWorth = Number(combinedWealth?.netWorth || 0);
  const cash = Number(combinedWealth?.totalCash || combinedWealth?.cash || 0);
  const isPositive = netWorth >= 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={
          isDark
            ? [colors.accent.primary + '08', 'transparent']
            : [colors.accent.primary + '06', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius['2xl'],
        }}
      />
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent.primary + '15' }]}>
          <AntDesign name="wallet" size={18} color={colors.accent.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Combined Wealth</Text>
        </View>
        <AntDesign name="right" size={14} color={colors.text.tertiary} />
      </View>

      <Text style={[styles.netWorth, { color: isPositive ? '#16A34A' : '#DC2626' }]}>
        {fmt(netWorth)}
      </Text>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

      <View style={styles.grid}>
        <View style={styles.item}>
          <View style={[styles.itemDot, { backgroundColor: colors.accent.primary }]} />
          <Text style={[styles.label, { color: colors.text.tertiary }]}>Assets</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>{fmt(totalAssets)}</Text>
        </View>
        <View style={styles.item}>
          <View style={[styles.itemDot, { backgroundColor: '#16A34A' }]} />
          <Text style={[styles.label, { color: colors.text.tertiary }]}>Savings</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>{fmt(totalSavings)}</Text>
        </View>
        <View style={styles.item}>
          <View style={[styles.itemDot, { backgroundColor: '#6366F1' }]} />
          <Text style={[styles.label, { color: colors.text.tertiary }]}>Investments</Text>
          <Text style={[styles.value, { color: '#6366F1' }]}>{fmt(investments)}</Text>
        </View>
        <View style={styles.item}>
          <View style={[styles.itemDot, { backgroundColor: isPositive ? '#16A34A' : '#DC2626' }]} />
          <Text style={[styles.label, { color: colors.text.tertiary }]}>Cash</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>{fmt(cash)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  netWorth: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginBottom: spacing.sm },
  divider: { height: 1, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { width: '47%', gap: 2, marginBottom: spacing.xs },
  itemDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontSize: 15, fontWeight: '700' },
});
