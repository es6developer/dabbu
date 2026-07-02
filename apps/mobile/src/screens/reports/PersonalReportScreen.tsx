import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { onDataRefresh } from '../../services/dataRefresh';
import { useLens } from '../../hooks/useLens';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

type Period = '1M' | '3M' | '6M' | '1Y' | 'All';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const PERIOD_MAP: Record<Period, number | undefined> = {
  '1M': 1,
  '3M': 3,
  '6M': 6,
  '1Y': 12,
  All: undefined,
};

function Bar({
  height,
  color,
  label,
  value,
}: {
  height: number;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={barStyles.col}>
      <Text style={barStyles.val}>{value}</Text>
      <View style={[barStyles.bar, { height, backgroundColor: color }]} />
      <Text style={barStyles.label}>{label}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  col: { alignItems: 'center', flex: 1 },
  bar: { width: 24, borderRadius: 12, minHeight: 4 },
  val: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
});

function getPeriodMonths(p: Period): number | undefined {
  return PERIOD_MAP[p];
}

export function PersonalReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();
  const { activeLens } = useLens();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('3M');
  const [reportData, setReportData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const months = getPeriodMonths(period);
        const lensParam = `&lens=${activeLens}`;

        const [reportRes, catRes, aiRes] = await Promise.all([
          api
            .get(
              `/reports/monthly${months ? `?months=${months}${lensParam}` : `?months=6${lensParam}`}`,
            )
            .catch(() => null),
          api.get(`/reports/categories?lens=${activeLens}`).catch(() => null),
          api.get('/ai/insights').catch(() => null),
        ]);

        const report = (reportRes as any)?.data || reportRes || null;
        const cat = (catRes as any)?.data || catRes || null;
        const ai = (aiRes as any)?.data || aiRes || [];

        setReportData(report);
        setCategoryData(cat);
        setAiInsights(Array.isArray(ai) ? ai : []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, period],
  );

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  useEffect(() => {
    const unsub = onDataRefresh(() => loadData(true));
    return unsub;
  }, [loadData]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      const blob = await api.post<any>('/reports/export', {
        type: 'monthly',
        format,
        lens: activeLens,
        months: getPeriodMonths(period) || 6,
        startDate: reportData?.monthly?.[0]?.month
          ? new Date(reportData.monthly[0].month + '-01').toISOString()
          : undefined,
        endDate: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    } finally {
      setExporting(null);
    }
  };

  const summary = reportData?.summary || {};
  const monthly = reportData?.monthly || [];
  const categories = categoryData?.categories || reportData?.categoryBreakdown || [];
  const topExpense = summary.totalExpense || 0;
  const topIncome = summary.totalIncome || 0;
  const savings = summary.savings || 0;
  const savingsRate = summary.savingsRate || 0;
  const maxMonthly = Math.max(...monthly.map((m: any) => Math.max(m.income, m.expense)), 1);

  if (loading && !reportData) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.bg.primary, paddingTop: insets.top },
          styles.center,
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Personal Reports</Text>
        <View style={styles.headerActions}>
          {(['pdf', 'excel', 'csv'] as const).map((fmt) => (
            <TouchableOpacity
              key={fmt}
              style={[styles.exportBtn, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handleExport(fmt)}
              disabled={exporting === fmt}
            >
              {exporting === fmt ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <AntDesign
                  name={fmt === 'pdf' ? 'filetext1' : fmt === 'excel' ? 'table' : 'export'}
                  size={16}
                  color={colors.accent.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['1M', '3M', '6M', '1Y', 'All'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.filterTab,
              {
                backgroundColor: period === p ? colors.accent.primary : colors.bg.secondary,
              },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.filterText,
                { color: period === p ? '#FFFFFF' : colors.text.tertiary },
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(false, true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Income"
            value={fmt(topIncome)}
            icon="arrowdown"
            color={colors.status.success}
            colors={colors}
          />
          <SummaryCard
            label="Expense"
            value={fmt(topExpense)}
            icon="arrowup"
            color={colors.status.error}
            colors={colors}
          />
          <SummaryCard
            label="Savings"
            value={fmt(savings)}
            icon={savings >= 0 ? 'caretup' : 'caretdown'}
            color={savings >= 0 ? colors.status.success : colors.status.error}
            colors={colors}
          />
          <SummaryCard
            label="Rate"
            value={`${savingsRate}%`}
            icon="heart"
            color={colors.accent.secondary}
            colors={colors}
          />
        </View>

        {monthly.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Monthly Trend</Text>
            <View style={styles.chartRow}>
              {monthly.map((m: any, i: number) => {
                const expH = Math.max((m.expense / maxMonthly) * 100, 4);
                const incH = Math.max((m.income / maxMonthly) * 100, 4);
                return (
                  <View key={i} style={styles.chartCol}>
                    <Bar
                      height={incH}
                      color={colors.status.success}
                      label=""
                      value={fmt(m.income)}
                    />
                    <Text style={[styles.monthLabel, { color: colors.text.tertiary }]}>
                      {m.month.split('-')[1] || m.month}
                    </Text>
                    <Bar
                      height={expH}
                      color={colors.status.error}
                      label=""
                      value={fmt(m.expense)}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {categories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Category Breakdown
            </Text>
            {categories.slice(0, 8).map((cat: any, i: number) => {
              const pct = cat.percentage || (topExpense > 0 ? (cat.amount / topExpense) * 100 : 0);
              return (
                <View key={i} style={styles.catRow}>
                  <View style={styles.catInfo}>
                    <Text
                      style={[styles.catName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    <Text style={[styles.catAmount, { color: colors.text.secondary }]}>
                      {fmt(cat.amount)}
                    </Text>
                  </View>
                  <View style={styles.catBarBg}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: colors.accent.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catPct, { color: colors.text.tertiary }]}>
                    {Math.round(pct)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {aiInsights.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.aiHeader}>
              <AntDesign name="star" size={18} color="#F59E0B" />
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>AI Insights</Text>
            </View>
            {aiInsights.slice(0, 5).map((insight: any, i: number) => (
              <View key={i} style={styles.insightRow}>
                <View style={[styles.insightDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.insightText, { color: colors.text.secondary }]}>
                  {insight.title || insight.message || insight.text || ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.bg.secondary }]}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
        <AntDesign name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 28,
  },
  filterText: { fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 44 },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 28,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  card: {
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  chartCol: { alignItems: 'center', flex: 1, gap: 4 },
  monthLabel: { fontSize: 9, fontWeight: '500' },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  catInfo: { width: 100 },
  catName: { fontSize: 16, fontWeight: '600' },
  catAmount: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  catBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  catBarFill: { height: '100%', borderRadius: 8 },
  catPct: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  insightDot: { width: 6, height: 6, borderRadius: 6, marginTop: 6 },
  insightText: { fontSize: 16, flex: 1, lineHeight: 18 },
});
