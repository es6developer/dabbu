import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { LineChart, PieChart } from 'react-native-chart-kit';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

type Period = 'month' | 'quarter' | 'year';
type Tab = 'overview' | 'reports' | 'ai';

function fmt(v: number) {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v >= 0 ? '+' : ''}${Math.round(v)}%`;
}

export function FinancialCenterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashData, setDashData] = useState<any>(null);
  const [catData, setCatData] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.bg.card,
    backgroundGradientTo: colors.bg.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
    propsForBackgroundLines: { stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    propsForLabels: { fontSize: 10, fontWeight: '500' },
    barPercentage: 0.6,
  };

  const getRange = useCallback(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;
    switch (period) {
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
      case 'quarter': start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]; break;
      case 'year': start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; break;
      default: start = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
    }
    return { startDate: start, endDate: end };
  }, [period]);

  const loadData = useCallback(async () => {
    const range = getRange();
    try {
      const results = await Promise.allSettled([
        api.get<any>(`/analytics/dashboard?startDate=${range.startDate}&endDate=${range.endDate}`),
        api.get<any>(`/analytics/category-breakdown?startDate=${range.startDate}&endDate=${range.endDate}`),
        api.get<any>(`/analytics/cash-flow?startDate=${range.startDate}&endDate=${range.endDate}`),
        api.get<any>(`/ai/insights`),
      ]);
      if (results[0].status === 'fulfilled') setDashData((results[0].value as any)?.data || results[0].value);
      if (results[1].status === 'fulfilled') setCatData((results[1].value as any)?.data || []);
      if (results[2].status === 'fulfilled') setCashFlow((results[2].value as any)?.data || []);
      if (results[3].status === 'fulfilled') setInsights((results[3].value as any)?.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'eye-outline' },
    { key: 'reports', label: 'Reports', icon: 'filetext1' },
    { key: 'ai', label: 'AI Insights', icon: 'bulb1' },
  ];

  const renderOverview = () => {
    const inc = dashData?.totalIncome || 0;
    const exp = dashData?.totalExpenses || 0;
    const sav = inc - exp;
    const rate = inc > 0 ? (sav / inc) * 100 : 0;

    const pieData = (catData || []).slice(0, 6).map((c: any, i: number) => ({
      name: c.category || c.name || '',
      amount: c.amount || c.total || 0,
      color: c.color || [colors.accent.primary, colors.status.success, colors.status.warning, colors.status.error, colors.status.info, '#EC4899'][i],
      legendFontColor: colors.text.secondary,
      legendFontSize: 12,
    }));

    const flowLabels = (cashFlow || []).map((m: any) => {
      const d = new Date(m.month || m.date);
      return d.toLocaleString('en-US', { month: 'short' });
    });
    const flowIncome = (cashFlow || []).map((m: any) => Number(m.income || m.totalIncome || 0));
    const flowExpense = (cashFlow || []).map((m: any) => Number(m.expense || m.totalExpenses || 0));

    return (
      <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.summaryRow}>
          {[
            { label: 'Income', value: fmt(inc), color: '#22C55E', icon: 'caretup' },
            { label: 'Expenses', value: fmt(exp), color: '#EF4444', icon: 'caretdown' },
            { label: 'Savings', value: fmt(Math.max(sav, 0)), color: colors.accent.primary, icon: 'wallet' },
          ].map(s => (
            <View key={s.label} style={[styles.summaryCard, { backgroundColor: colors.bg.card }]}>
              <AntDesign name={s.icon as any} size={18} color={s.color} />
              <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{s.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
        {dashData?.savingsRate !== undefined && (
          <View style={[styles.rateCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.rateTitle, { color: colors.text.secondary }]}>Savings Rate</Text>
            <Text style={[styles.rateValue, { color: rate >= 20 ? '#22C55E' : rate >= 10 ? '#F59E0B' : '#EF4444' }]}>
              {fmtPct(rate)}
            </Text>
            <View style={[styles.rateBar, { backgroundColor: colors.bg.tertiary }]}>
              <View style={[styles.rateFill, { width: `${Math.min(rate, 100)}%`, backgroundColor: rate >= 20 ? '#22C55E' : rate >= 10 ? '#F59E0B' : '#EF4444' }]} />
            </View>
          </View>
        )}
        {pieData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.chartTitle, { color: colors.text.primary }]}>Spending by Category</Text>
            <PieChart data={pieData} width={CHART_W} height={180} chartConfig={chartConfig} accessor="amount" backgroundColor="transparent" paddingLeft="10" absolute />
          </View>
        )}
        {flowIncome.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.chartTitle, { color: colors.text.primary }]}>Income vs Expenses</Text>
            <LineChart
              data={{ labels: flowLabels, datasets: [{ data: flowIncome, color: () => '#22C55E', strokeWidth: 2 }, { data: flowExpense, color: () => '#EF4444', strokeWidth: 2 }] }}
              width={CHART_W} height={200} chartConfig={chartConfig} bezier style={{ borderRadius: 16 }}
            />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={[styles.legendText, { color: colors.text.tertiary }]}>Income</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={[styles.legendText, { color: colors.text.tertiary }]}>Expenses</Text></View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderReports = () => {
    const inc = dashData?.totalIncome || 0;
    const exp = dashData?.totalExpenses || 0;
    const sav = inc - exp;
    const txnCount = dashData?.transactionCount || 0;
    const avgTxn = txnCount > 0 ? (inc + exp) / txnCount : 0;

    return (
      <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={[styles.reportCard, { backgroundColor: colors.bg.card }]}>
          <Text style={[styles.reportSectionTitle, { color: colors.text.primary }]}>Income Summary</Text>
          <Text style={[styles.reportAmount, { color: '#22C55E' }]}>{fmt(inc)}</Text>
          <View style={styles.reportMetaRow}>
            <Text style={[styles.reportMeta, { color: colors.text.tertiary }]}>Total Income</Text>
            <Text style={[styles.reportMeta, { color: colors.text.tertiary }]}>Avg {fmt(inc / (period === 'month' ? 1 : period === 'quarter' ? 3 : 12))}/mo</Text>
          </View>
        </View>
        <View style={[styles.reportCard, { backgroundColor: colors.bg.card }]}>
          <Text style={[styles.reportSectionTitle, { color: colors.text.primary }]}>Expense Summary</Text>
          <Text style={[styles.reportAmount, { color: '#EF4444' }]}>{fmt(exp)}</Text>
          <View style={styles.reportMetaRow}>
            <Text style={[styles.reportMeta, { color: colors.text.tertiary }]}>Total Expenses</Text>
            <Text style={[styles.reportMeta, { color: colors.text.tertiary }]}>Avg {fmt(exp / (period === 'month' ? 1 : period === 'quarter' ? 3 : 12))}/mo</Text>
          </View>
        </View>
        <View style={[styles.reportCard, { backgroundColor: colors.bg.card }]}>
          <Text style={[styles.reportSectionTitle, { color: colors.text.primary }]}>Savings Summary</Text>
          <Text style={[styles.reportAmount, { color: sav >= 0 ? '#22C55E' : '#EF4444' }]}>{fmt(Math.max(sav, 0))}</Text>
          <View style={styles.reportMetaRow}>
            <Text style={[styles.reportMeta, { color: colors.text.tertiary }]}>Net Savings</Text>
            <Text style={[styles.reportMeta, { color: colors.text.tertiary }]}>{txnCount > 0 ? `${txnCount} transactions` : ''}</Text>
          </View>
        </View>
        {dashData?.topCategories && (
          <View style={[styles.reportCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.reportSectionTitle, { color: colors.text.primary }]}>Top Spending</Text>
            {(dashData.topCategories as any[]).slice(0, 5).map((cat: any, i: number) => {
              const pct = exp > 0 ? (cat.amount / exp) * 100 : 0;
              return (
                <View key={i} style={styles.categoryRow}>
                  <Text style={[styles.categoryName, { color: colors.text.primary }]}>{cat.name}</Text>
                  <View style={styles.categoryRight}>
                    <Text style={[styles.categoryAmount, { color: colors.text.secondary }]}>{fmt(cat.amount)}</Text>
                    <Text style={[styles.categoryPct, { color: colors.text.tertiary }]}>{Math.round(pct)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAIInsights = () => {
    const items = insights?.length > 0 ? insights : [];
    return (
      <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>\uD83E\uDD16</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No insights yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Add more transactions to get personalized AI insights</Text>
          </View>
        )}
        {items.map((insight: any, i: number) => {
          const severity = insight.severity || 'info';
          const color = severity === 'critical' ? '#EF4444' : severity === 'warning' ? '#F59E0B' : severity === 'success' ? '#22C55E' : colors.accent.primary;
          return (
            <View key={i} style={[styles.insightCard, { backgroundColor: colors.bg.card, borderLeftColor: color }]}>
              <View style={styles.insightHeader}>
                <Text style={{ fontSize: 20 }}>{insight.icon || '\uD83D\uDCA1'}</Text>
                <Text style={[styles.insightTitle, { color: colors.text.primary }]}>{insight.title}</Text>
                {insight.confidence && (
                  <View style={[styles.confidenceBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.confidenceText, { color }]}>{Math.round(insight.confidence)}%</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.insightDesc, { color: colors.text.secondary }]}>{insight.description || insight.message}</Text>
              {insight.suggestedAction && (
                <TouchableOpacity style={[styles.insightAction, { backgroundColor: color + '15' }]}>
                  <Text style={[styles.insightActionText, { color }]}>{insight.suggestedAction}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={24} color={colors.text.primary}  />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Financial Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.bg.secondary }]}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, t.key === tab && { borderBottomColor: colors.accent.primary, borderBottomWidth: 2 }]} onPress={() => setTab(t.key)}>
            <AntDesign name={t.icon as any} size={16} color={t.key === tab ? colors.accent.primary : colors.text.tertiary} />
            <Text style={[styles.tabLabel, { color: t.key === tab ? colors.accent.primary : colors.text.tertiary, fontWeight: t.key === tab ? '700' : '500' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.periodRow}>
        {(['month', 'quarter', 'year'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[styles.periodPill, { backgroundColor: period === p ? colors.accent.primary : colors.bg.tertiary }]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, { color: period === p ? '#FFF' : colors.text.secondary }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 32 }}>\u23F3</Text>
        </View>
      ) : tab === 'overview' ? renderOverview() : tab === 'reports' ? renderReports() : renderAIInsights()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  tabBar: { flexDirection: 'row', marginHorizontal: spacing.lg, borderRadius: 12, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  tabLabel: { fontSize: 12 },
  periodRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  periodPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  periodText: { fontSize: 12, fontWeight: '600' },
  tabContent: { padding: spacing.lg, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, borderRadius: 20, padding: spacing.md, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  rateCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md },
  rateTitle: { fontSize: 12, fontWeight: '600' },
  rateValue: { fontSize: 28, fontWeight: '800', marginVertical: spacing.xs },
  rateBar: { height: 6, borderRadius: 3 },
  rateFill: { height: '100%', borderRadius: 3 },
  chartCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center' },
  chartTitle: { fontSize: 15, fontWeight: '600', marginBottom: spacing.md, alignSelf: 'flex-start' },
  legendRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500' },
  reportCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md },
  reportSectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: spacing.xs },
  reportAmount: { fontSize: 28, fontWeight: '800' },
  reportMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  reportMeta: { fontSize: 11 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  categoryName: { fontSize: 14, fontWeight: '500', flex: 1 },
  categoryRight: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  categoryAmount: { fontSize: 14, fontWeight: '600' },
  categoryPct: { fontSize: 12, fontWeight: '500', width: 36, textAlign: 'right' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  insightCard: { borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md, borderLeftWidth: 3 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  insightTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  confidenceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  confidenceText: { fontSize: 10, fontWeight: '700' },
  insightDesc: { fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  insightAction: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, alignSelf: 'flex-start', marginTop: spacing.sm },
  insightActionText: { fontSize: 12, fontWeight: '700' },
});
