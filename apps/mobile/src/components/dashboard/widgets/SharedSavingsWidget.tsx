import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function SharedSavingsWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { sharedSavings } = data || {};
  const current = Number(sharedSavings?.current || sharedSavings?.total || 0);
  const target = Number(sharedSavings?.target || 1);
  const progress = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={isDark ? ['#6366F108', 'transparent'] : ['#6366F106', 'transparent']}
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
        <View style={[styles.iconBox, { backgroundColor: '#6366F115' }]}>
          <AntDesign name="save" size={18} color="#6366F1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Shared Savings</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#6366F115' }]}
          onPress={onPress}
        >
          <AntDesign name="plus" size={14} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Saved</Text>
          <Text style={[styles.amountValue, { color: colors.text.primary }]}>{fmt(current)}</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Target</Text>
          <Text style={[styles.amountValue, { color: '#6366F1' }]}>{fmt(target)}</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Left</Text>
          <Text style={[styles.amountValue, { color: '#DC2626' }]}>{fmt(remaining)}</Text>
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
        <View
          style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#6366F1' }]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.text.tertiary }]}>
        {progress}% of target achieved
      </Text>

      {!target && !current ? (
        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#6366F1' }]} onPress={onPress}>
          <AntDesign name="pluscircleo" size={14} color="#FFF" />
          <Text style={styles.ctaText}>Start Saving Together</Text>
        </TouchableOpacity>
      ) : null}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  amountItem: { flex: 1, gap: 2 },
  amountLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  amountValue: { fontSize: 16, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 10, fontWeight: '500', textAlign: 'right', marginBottom: spacing.sm },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
