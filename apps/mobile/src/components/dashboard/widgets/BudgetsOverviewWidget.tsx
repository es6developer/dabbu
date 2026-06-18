import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function BudgetsOverviewWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { budgetsOverview } = data || {};
  const budgets = Array.isArray(budgetsOverview) ? budgetsOverview : [];

  if (!budgets.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AntDesign name="piechart" size={18} color={colors.accent.primary}  />
          <Text style={[styles.title, { color: colors.text.primary }]}>Budgets</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="piechart" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Budgets</Text>
      </View>
      {budgets.map((b: any, i: number) => {
        const spent = Number(b.spent || 0);
        const limit = Number(b.limit || 1);
        const pct = Math.min(100, Math.round((spent / limit) * 100));
        const over = pct > 100;
        return (
          <View key={i} style={styles.budgetRow}>
            <View style={styles.budgetTop}>
              <Text style={[styles.budgetName, { color: colors.text.primary }]}>{b.category || b.name || '-'}</Text>
              <Text style={[styles.budgetPct, { color: over ? '#DC2626' : colors.text.secondary }]}>{Math.min(pct, 100)}%</Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
              <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: over ? '#DC2626' : colors.accent.primary }]} />
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
  budgetRow: { gap: 3 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetName: { fontSize: 13, fontWeight: '500' },
  budgetPct: { fontSize: 11, fontWeight: '600' },
  progressBg: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2.5 },
  empty: { fontSize: 14, fontWeight: '500' },
});
