import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useApiGet } from '../../hooks/useApi';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const CAT_COLORS: Record<string, string> = {
  Food: '#FF6B6B',
  Rent: '#60A5FA',
  Travel: '#34C759',
  Shopping: '#F3D28F',
  Bills: '#F59E0B',
  Fuel: '#FF4D4F',
  Medical: '#FF4D4F',
  Entertainment: '#F3D28F',
  Groceries: '#F3D28F',
  Utilities: '#60A5FA',
  Transport: '#34C759',
  Education: '#F3D28F',
  Healthcare: '#FF4D4F',
  Insurance: '#F59E0B',
  Salary: '#34C759',
  Investment: '#F3D28F',
};

export function ReportsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    data: stats,
    loading,
    refreshing,
    refresh,
  } = useApiGet<any>('/transactions/stats?months=6');

  const monthlyData = useMemo(() => {
    if (!stats?.monthlyTrend) {
      return [] as { label: string; amount: number }[];
    }
    return (stats.monthlyTrend as any[]).map((d: any) => {
      const parts = (d.month || '').split('-');
      const label = parts.length === 2 ? MONTH_NAMES[parseInt(parts[1]) - 1] || d.month : d.month;
      return { label, amount: d.expense || 0 };
    });
  }, [stats]);

  const categoryData = useMemo(() => {
    if (!stats?.categoryBreakdown) {
      return [] as { name: string; amount: number; color: string; pct: number }[];
    }
    const total =
      (stats.categoryBreakdown as any[]).reduce((s: number, c: any) => s + (c.amount || 0), 0) || 1;
    return (stats.categoryBreakdown as any[]).map((c: any) => ({
      name: c.name || 'Uncategorized',
      amount: c.amount || 0,
      color: CAT_COLORS[c.name] || colors.accent.primary,
      pct: Math.round((c.amount / total) * 100),
    }));
  }, [stats]);

  const summary = stats?.summary || {};
  const monthlySpend = summary.totalExpense ?? 0;
  const income = summary.totalIncome ?? 0;
  const savings = summary.netSavings ?? 0;

  const maxAmount = monthlyData.length > 0 ? Math.max(...monthlyData.map((d: any) => d.amount)) : 1;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reports</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderColor: colors.border.subtle }]}>
              <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>
                Monthly Spend
              </Text>
              <Text style={[styles.metricValue, { color: '#FF4D4F' }]}>{fmt(monthlySpend)}</Text>
            </View>
            <View style={[styles.metricCard, { borderColor: colors.border.subtle }]}>
              <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>Income</Text>
              <Text style={[styles.metricValue, { color: '#34C759' }]}>{fmt(income)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderColor: colors.border.subtle }]}>
              <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>Savings</Text>
              <Text style={[styles.metricValue, { color: '#F3D28F' }]}>{fmt(savings)}</Text>
            </View>
            <View style={[styles.metricCard, { borderColor: colors.border.subtle }]}>
              <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>Expense</Text>
              <Text style={[styles.metricValue, { color: colors.accent.primary }]}>
                {fmt(monthlySpend)}
              </Text>
            </View>
          </View>

          {monthlyData.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Monthly Trend
              </Text>
              <View style={styles.chartRow}>
                {monthlyData.map((d: { label: string; amount: number }, i: number) => (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${(d.amount / maxAmount) * 100}%`,
                            backgroundColor: colors.accent.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.text.tertiary }]}>
                      {d.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {categoryData.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Category Breakdown
              </Text>
              {categoryData.map(
                (cat: { name: string; amount: number; color: string; pct: number }, i: number) => (
                  <View key={i} style={styles.catRow}>
                    <View style={styles.catInfo}>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.catName, { color: colors.text.primary }]}>
                        {cat.name}
                      </Text>
                    </View>
                    <View style={[styles.catBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                      <View
                        style={[
                          styles.catBar,
                          { width: `${cat.pct}%`, backgroundColor: cat.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.catAmount, { color: colors.text.secondary }]}>
                      {fmt(cat.amount)}
                    </Text>
                  </View>
                ),
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricLabel: { fontSize: 12, fontWeight: '500' },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 8,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barContainer: { flex: 1, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, fontWeight: '500' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: '600' },
  catBarOuter: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catBar: { height: '100%', borderRadius: 3 },
  catAmount: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
});
