import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { AnalyticsSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { API_URL } from '../../config/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

type Period = 'month' | 'quarter' | 'year' | 'custom';

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  return `${v >= 0 ? '+' : ''}${Math.round(v)}%`;
}

export function AnalyticsScreen() {
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [dashData, setDashData] = useState<any>(null);
  const [catData, setCatData] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [expenseReport, setExpenseReport] = useState<any>(null);
  const [incomeReport, setIncomeReport] = useState<any>(null);
  const [savingsReport, setSavingsReport] = useState<any>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [reportTab, setReportTab] = useState<'expense' | 'income' | 'savings'>('expense');

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.bg.secondary,
    backgroundGradientTo: colors.bg.secondary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: () => 'rgba(255,255,255,0.4)',
    propsForBackgroundLines: { stroke: 'transparent' },
    propsForLabels: { fontSize: 10, fontWeight: '500' },
    fillShadowGradientFrom: '#10B981',
    fillShadowGradientTo: '#10B981',
    fillShadowGradientFromOpacity: 0.9,
    fillShadowGradientToOpacity: 0.9,
    barPercentage: 0.6,
  };

  const getDateRange = useCallback(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;
    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
    }
    return { startDate: start, endDate: end };
  }, [period]);

  const loadData = useCallback(async () => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    const range = getDateRange();
    try {
      const results = await Promise.allSettled([
        api.get<any>(`/analytics/dashboard?startDate=${range.startDate}&endDate=${range.endDate}`),
        api.get<any>(
          `/analytics/category-breakdown?startDate=${range.startDate}&endDate=${range.endDate}`,
        ),
        api.get<any>(`/analytics/cash-flow?startDate=${range.startDate}&endDate=${range.endDate}`),
        api.get<any>(
          `/analytics/reports/expense?startDate=${range.startDate}&endDate=${range.endDate}`,
        ),
        api.get<any>(
          `/analytics/reports/income?startDate=${range.startDate}&endDate=${range.endDate}`,
        ),
        api.get<any>(
          `/analytics/reports/savings?startDate=${range.startDate}&endDate=${range.endDate}`,
        ),
      ]);
      if (results[0].status === 'fulfilled') {
        setDashData(results[0].value?.data || results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setCatData(results[1].value?.data || results[1].value || []);
      }
      if (results[2].status === 'fulfilled') {
        setCashFlow(results[2].value?.data || results[2].value || []);
      }
      if (results[3].status === 'fulfilled') {
        setExpenseReport(results[3].value?.data || results[3].value);
      }
      if (results[4].status === 'fulfilled') {
        setIncomeReport(results[4].value?.data || results[4].value);
      }
      if (results[5].status === 'fulfilled') {
        setSavingsReport(results[5].value?.data || results[5].value);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(type);
    try {
      const range = getDateRange();
      const res = await fetch(`${API_URL}/analytics/export/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...range,
          reportType:
            reportTab === 'expense' ? 'Expense' : reportTab === 'income' ? 'Income' : 'Savings',
        }),
      });
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      // On mobile, we'd use expo-file-system + expo-sharing
      // For now, show success
    } catch (e: any) {
      console.warn('Export error:', e.message);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <AnalyticsSkeleton />
      </View>
    );
  }

  const mi = dashData?.monthlyIncome || 0;
  const me = dashData?.monthlyExpense || 0;
  const savings = mi - me;
  const savingsRate = mi > 0 ? (savings / mi) * 100 : 0;
  const prevMi = incomeReport?.totalIncome || 0;
  const prevMe = expenseReport?.totalExpense || 0;
  const incomeTrend = prevMi > 0 ? ((mi - prevMi) / prevMi) * 100 : 0;
  const expenseTrend = prevMe > 0 ? ((me - prevMe) / prevMe) * 100 : 0;

  const lineData = {
    labels: cashFlow.slice(-7).map((m: any) => m.period?.slice(-2) || ''),
    datasets: [
      {
        data: cashFlow.slice(-7).map((m: any) => m.expense || 0),
        color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: cashFlow.slice(-7).map((m: any) => m.income || 0),
        color: (opacity = 1) => `rgba(0, 184, 148, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Expense', 'Income'],
  };

  const barData = {
    labels: cashFlow.slice(-6).map((m: any) => m.period?.slice(-2) || ''),
    datasets: [
      { data: cashFlow.slice(-6).map((m: any) => Math.max(m.income || 0, m.expense || 0, 1)) },
    ],
  };

  const pieData = (catData || []).slice(0, 6).map((c: any, i: number) => ({
    name: c.name,
    amount: c.amount || 0,
    color:
      c.color ||
      [colors.accent.primary, '#00B894', '#FF6B6B', '#FDCB6E', '#74B9FF', '#14B8A6'][i % 6],
    legendFontColor: colors.text.secondary,
    legendFontSize: 12,
  }));

  const savingsTrend = savingsReport?.savingsTrend || [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.text.primary }]}>Reports & Analytics</Text>
        <View style={styles.tabRow}>
          {(['overview', 'reports'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && {
                  borderBottomColor: colors.accent.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.accent.primary : colors.text.tertiary },
                ]}
              >
                {tab === 'overview' ? 'Overview' : 'Reports'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Period filter */}
        <View style={styles.periodRow}>
          {(['month', 'quarter', 'year'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && { backgroundColor: colors.accent.primary }]}
              onPress={() => {
                setPeriod(p);
                setLoading(true);
              }}
            >
              <Text
                style={[styles.periodText, { color: period === p ? '#FFF' : colors.text.tertiary }]}
              >
                {p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' ? (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              {[
                { label: 'Income', value: mi, color: colors.status.success, icon: 'linechart' },
                { label: 'Expenses', value: me, color: colors.status.error, icon: 'arrowdown' },
              ].map((item, i) => (
                <View
                  key={i}
                  style={[styles.summaryCard, { backgroundColor: colors.bg.secondary }]}
                >
                  <View style={[styles.summaryIcon, { backgroundColor: `${item.color}18` }]}>
                    <AntDesign name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.text.primary }]}>
                    {fmt(item.value)}
                  </Text>
                  <View style={styles.trendRow}>
                    <AntDesign
                      name={(
                        i === 0
                          ? incomeTrend >= 0
                            ? 'arrow-up'
                            : 'arrow-down'
                          : expenseTrend <= 0
                            ? 'arrow-down'
                            : 'arrow-up'
                      ) as any}
                      size={12}
                      color={
                        i === 0
                          ? incomeTrend >= 0
                            ? colors.status.success
                            : colors.status.error
                          : expenseTrend <= 0
                            ? colors.status.success
                            : colors.status.error
                      }
                    />
                    <Text
                      style={[
                        styles.trendText,
                        {
                          color:
                            i === 0
                              ? incomeTrend >= 0
                                ? colors.status.success
                                : colors.status.error
                              : expenseTrend <= 0
                                ? colors.status.success
                                : colors.status.error,
                        },
                      ]}
                    >
                      {i === 0 ? fmtPct(incomeTrend) : fmtPct(expenseTrend)} vs last
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.summaryRow}>
              {[
                {
                  label: 'Savings',
                  value: savings,
                  color: savings >= 0 ? colors.status.success : colors.status.error,
                  icon: 'wallet',
                },
                {
                  label: 'Savings Rate',
                  value: `${Math.round(savingsRate)}%`,
                  color: colors.accent.primary,
                  icon: 'piechart',
                },
              ].map((item, i) => (
                <View
                  key={i}
                  style={[styles.summaryCard, { backgroundColor: colors.bg.secondary }]}
                >
                  <View style={[styles.summaryIcon, { backgroundColor: `${item.color}18` }]}>
                    <AntDesign name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: item.color }]}>
                    {typeof item.value === 'number' ? fmt(item.value) : item.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Income vs Expense Trend (Line Chart) */}
            {cashFlow.length > 1 && (
              <View style={[styles.chartCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.chartTitle, { color: colors.text.primary }]}>
                  Income vs Expense Trend
                </Text>
                <LineChart
                  data={lineData}
                  width={CHART_W}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  fromZero
                />
              </View>
            )}

            {/* Monthly Cash Flow (Bar Chart) */}
            {cashFlow.length > 1 && (
              <View style={[styles.chartCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.chartTitle, { color: colors.text.primary }]}>
                  Monthly Cash Flow
                </Text>
                <BarChart
                  data={barData}
                  width={CHART_W}
                  height={180}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars={false}
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </View>
            )}

            {/* Category Pie */}
            {pieData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.chartTitle, { color: colors.text.primary }]}>
                  Spending by Category
                </Text>
                <PieChart
                  data={pieData}
                  width={CHART_W}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}

            {/* Savings Trend */}
            {savingsTrend.length > 1 && (
              <View style={[styles.chartCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.chartTitle, { color: colors.text.primary }]}>
                  Savings Trend
                </Text>
                <LineChart
                  data={{
                    labels: savingsTrend.slice(-7).map((m: any) => m.period?.slice(-2) || ''),
                    datasets: [{ data: savingsTrend.slice(-7).map((m: any) => m.savings || 0) }],
                  }}
                  width={CHART_W}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  fromZero
                />
              </View>
            )}

            {/* Category breakdown list */}
            {catData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.chartTitle, { color: colors.text.primary }]}>
                  Category Breakdown
                </Text>
                {catData.map((c: any, i: number) => (
                  <View key={i} style={styles.catRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catName, { color: colors.text.primary }]}>{c.name}</Text>
                      <Text style={[styles.catCount, { color: colors.text.tertiary }]}>
                        {c.count || 0} txns
                      </Text>
                    </View>
                    <View style={styles.catRight}>
                      <Text style={[styles.catAmt, { color: colors.text.primary }]}>
                        {fmt(c.amount || 0)}
                      </Text>
                      <View style={[styles.pctBar, { backgroundColor: colors.bg.tertiary }]}>
                        <View
                          style={[
                            styles.pctFill,
                            {
                              width: `${Math.min(c.percentage || 0, 100)}%`,
                              backgroundColor: c.color || colors.accent.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {!mi && !me && catData.length === 0 && (
              <View style={styles.emptyState}>
                <AntDesign name="barchart" size={48} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No analytics data yet
                </Text>
                <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>
                  Start adding transactions to see your financial insights.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Report tabs */}
            <View style={styles.reportTabRow}>
              {(['expense', 'income', 'savings'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.reportTab,
                    reportTab === t && { backgroundColor: colors.accent.primary },
                  ]}
                  onPress={() => setReportTab(t)}
                >
                  <Text
                    style={[
                      styles.reportTabText,
                      { color: reportTab === t ? '#FFF' : colors.text.tertiary },
                    ]}
                  >
                    {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Savings'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Export buttons */}
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: colors.status.errorLight }]}
                onPress={() => handleExport('pdf')}
                disabled={exporting !== null}
              >
                {exporting === 'pdf' ? (
                  <ActivityIndicator size="small" color={colors.status.error} />
                ) : (
                  <>
                    <AntDesign  name="filetext1" size={16} color={colors.status.error} />
                    <Text style={[styles.exportText, { color: colors.status.error }]}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: colors.status.successLight }]}
                onPress={() => handleExport('excel')}
                disabled={exporting !== null}
              >
                {exporting === 'excel' ? (
                  <ActivityIndicator size="small" color={colors.status.success} />
                ) : (
                  <>
                    <AntDesign  name="appstore1" size={16} color={colors.status.success} />
                    <Text style={[styles.exportText, { color: colors.status.success }]}>Excel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Expense Report */}
            {reportTab === 'expense' && expenseReport && (
              <View style={[styles.reportCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.reportTitle, { color: colors.text.primary }]}>
                  Expense Report
                </Text>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>Total</Text>
                  <Text style={[styles.reportValue, { color: colors.status.error }]}>
                    {fmt(expenseReport.totalExpense || 0)}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                    Transactions
                  </Text>
                  <Text style={[styles.reportValue, { color: colors.text.primary }]}>
                    {expenseReport.transactionCount || 0}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>Average</Text>
                  <Text style={[styles.reportValue, { color: colors.text.primary }]}>
                    {fmt(expenseReport.averageTransaction || 0)}
                  </Text>
                </View>
                {expenseReport.topCategory && (
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                      Top Category
                    </Text>
                    <Text style={[styles.reportValue, { color: colors.accent.primary }]}>
                      {expenseReport.topCategory.name} ({fmt(expenseReport.topCategory.amount)})
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Income Report */}
            {reportTab === 'income' && incomeReport && (
              <View style={[styles.reportCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.reportTitle, { color: colors.text.primary }]}>
                  Income Report
                </Text>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>Total</Text>
                  <Text style={[styles.reportValue, { color: colors.status.success }]}>
                    {fmt(incomeReport.totalIncome || 0)}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                    Transactions
                  </Text>
                  <Text style={[styles.reportValue, { color: colors.text.primary }]}>
                    {incomeReport.transactionCount || 0}
                  </Text>
                </View>
                {(incomeReport.sources || []).map((s: any, i: number) => (
                  <View key={i} style={styles.reportRow}>
                    <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.reportValue, { color: colors.text.primary }]}>
                      {fmt(s.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Savings Report */}
            {reportTab === 'savings' && savingsReport && (
              <View style={[styles.reportCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.reportTitle, { color: colors.text.primary }]}>
                  Savings Report
                </Text>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[styles.reportValue, { color: colors.status.success }]}>
                    {fmt(savingsReport.totalIncome || 0)}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                    Expenses
                  </Text>
                  <Text style={[styles.reportValue, { color: colors.status.error }]}>
                    {fmt(savingsReport.totalExpense || 0)}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                    Total Savings
                  </Text>
                  <Text
                    style={[
                      styles.reportValue,
                      {
                        color:
                          (savingsReport.totalSavings || 0) >= 0
                            ? colors.status.success
                            : colors.status.error,
                      },
                    ]}
                  >
                    {fmt(savingsReport.totalSavings || 0)}
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, { color: colors.text.tertiary }]}>
                    Savings Rate
                  </Text>
                  <Text style={[styles.reportValue, { color: colors.accent.primary }]}>
                    {Math.round(savingsReport.savingsRate || 0)}%
                  </Text>
                </View>

                {/* Savings Trend mini chart */}
                {savingsTrend.length > 1 && (
                  <>
                    <View style={{ height: 12 }} />
                    <LineChart
                      data={{
                        labels: savingsTrend.slice(-7).map((m: any) => m.period?.slice(-2) || ''),
                        datasets: [
                          { data: savingsTrend.slice(-7).map((m: any) => m.savingsRate || 0) },
                        ],
                      }}
                      width={CHART_W - 32}
                      height={140}
                      chartConfig={{
                        ...chartConfig,
                        fillShadowGradientFromOpacity: 0.2,
                        fillShadowGradientToOpacity: 0,
                      }}
                      bezier
                      style={styles.chart}
                      withInnerLines={false}
                      fromZero
                    />
                  </>
                )}
              </View>
            )}

            {/* Empty reports */}
            {reportTab === 'expense' && !expenseReport && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No expense data for this period
                </Text>
              </View>
            )}
            {reportTab === 'income' && !incomeReport && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No income data for this period
                </Text>
              </View>
            )}
            {reportTab === 'savings' && !savingsReport && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No savings data for this period
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 24 },
  tab: { paddingBottom: 8 },
  tabText: { fontSize: 15, fontWeight: '600' },

  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  periodText: { fontSize: 13, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 18 },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  trendText: { fontSize: 10, fontWeight: '600' },

  chartCard: { marginHorizontal: 20, marginTop: 12, padding: 18, borderRadius: 20 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -8 },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  catName: { fontSize: 13, fontWeight: '500' },
  catCount: { fontSize: 10, marginTop: 2 },
  catRight: { alignItems: 'flex-end' },
  catAmt: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  pctBar: { width: 80, height: 4, borderRadius: 2, overflow: 'hidden' },
  pctFill: { height: '100%', borderRadius: 2 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  reportTabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  reportTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  reportTabText: { fontSize: 13, fontWeight: '600' },

  exportRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exportText: { fontSize: 13, fontWeight: '700' },

  reportCard: { marginHorizontal: 20, marginTop: 12, padding: 18, borderRadius: 20 },
  reportTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reportLabel: { fontSize: 13, fontWeight: '500' },
  reportValue: { fontSize: 14, fontWeight: '700' },
});
