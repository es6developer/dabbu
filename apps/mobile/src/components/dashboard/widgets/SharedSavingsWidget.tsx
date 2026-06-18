import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function SharedSavingsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { sharedSavings } = data || {};
  const current = Number(sharedSavings?.current || 0);
  const target = Number(sharedSavings?.target || 1);
  const progress = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const expectedCompletion = sharedSavings?.expectedCompletion || '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="save" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Shared Savings</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Current</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>₹{(current || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Target</Text>
          <Text style={[styles.value, { color: colors.accent.primary }]}>₹{(target || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent.primary }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Remaining</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>₹{(remaining || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Expected Completion</Text>
          <Text style={[styles.valueSmall, { color: colors.text.secondary }]}>{expectedCompletion || '-'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '700' },
  valueSmall: { fontSize: 12, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
