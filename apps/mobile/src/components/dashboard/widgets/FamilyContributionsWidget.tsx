import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function FamilyContributionsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyContributions } = data || {};
  const contributions = Array.isArray(familyContributions) ? familyContributions : [];
  const maxVal = contributions.length ? Math.max(...contributions.map((c: any) => Number(c.amount || 0)), 1) : 1;

  if (!contributions.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="people-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>Contributions</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Contributions</Text>
      </View>
      {contributions.map((c: any, i: number) => {
        const amt = Number(c.amount || 0);
        const pct = Math.round((amt / maxVal) * 100);
        return (
          <View key={i} style={styles.contribRow}>
            <Text style={[styles.contribName, { color: colors.text.primary }]}>{c.name || c.member || '-'}</Text>
            <View style={styles.barWrap}>
              <View style={[styles.barBg, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.accent.primary }]} />
              </View>
              <Text style={[styles.contribAmt, { color: colors.text.secondary }]}>
                ₹{(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
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
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contribName: { fontSize: 12, fontWeight: '600', width: 60 },
  barWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  contribAmt: { fontSize: 11, fontWeight: '600', width: 70, textAlign: 'right' },
  empty: { fontSize: 14, fontWeight: '500' },
});
