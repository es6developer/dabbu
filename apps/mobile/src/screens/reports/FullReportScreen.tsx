import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { PremiumGate } from '../../components/ui/PremiumGate';

const { width: SCREEN_W } = Dimensions.get('window');

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

function getPeriodMonths(p: Period): number | undefined {
  return PERIOD_MAP[p];
}

export function FullReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();
  const { activeLens } = useLens();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('3M');
  const [reportData, setReportData] = useState<any>(null);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  const groupIdRef = useRef<string | null>(null);
  const familyIdRef = useRef<string | null>(null);
  const idsFetchedRef = useRef(false);

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

        if (!idsFetchedRef.current) {
          await Promise.all([
            (async () => {
              try {
                const groups: any[] = await api.get('/shared-finance/groups', undefined, 8000);
                if (Array.isArray(groups)) {
                  const coupleGroup = groups.find(
                    (g: any) => g.type === 'couple' && g.status === 'ACTIVE',
                  );
                  if (coupleGroup) {
                    groupIdRef.current = coupleGroup.id;
                  }
                }
              } catch {
                /* ignore */
              }
            })(),
            (async () => {
              try {
                const families: any[] = await api.get('/family', undefined, 8000);
                if (Array.isArray(families) && families.length > 0) {
                  familyIdRef.current = families[0].id;
                }
              } catch {
                /* ignore */
              }
            })(),
          ]);
          idsFetchedRef.current = true;
        }

        const groupId = groupIdRef.current;
        const familyId = familyIdRef.current;
        const lensParam = `&lens=${activeLens}`;

        const monthlyPath = `/reports/monthly?months=${months || 6}${lensParam}`;
        const catPath = `/reports/categories?lens=${activeLens}`;

        const calls: Promise<any>[] = [
          api.get(monthlyPath).catch(() => null),
          api.get(catPath).catch(() => null),
          api.get('/ai/insights').catch(() => null),
        ];

        if (groupId) {
          calls.push(api.get(`${monthlyPath}&groupId=${groupId}`).catch(() => null));
          calls.push(api.get(`${catPath}&groupId=${groupId}`).catch(() => null));
          calls.push(api.get('/couple/dashboard').catch(() => null));
          calls.push(api.get('/couple/ai-review').catch(() => null));
        }

        if (familyId) {
          calls.push(api.get(`/family/dashboard?familyId=${familyId}`).catch(() => null));
          calls.push(api.get(`/family/members?familyId=${familyId}`).catch(() => null));
          calls.push(api.get(`/family/ai-review?familyId=${familyId}`).catch(() => null));
        }

        const results = await Promise.all(calls);

        setReportData((results[0] as any)?.data || results[0] || null);
        setCategoryData((results[1] as any)?.data || results[1] || null);
        const ai = (results[2] as any)?.data || results[2] || [];
        setAiInsights(Array.isArray(ai) ? ai : []);

        if (groupId) {
          const coupleMonthly = (results[3] as any)?.data || results[3] || null;
          const coupleCat = (results[4] as any)?.data || results[4] || null;
          setCoupleData({
            monthly: coupleMonthly?.monthly || [],
            categories: coupleCat?.categories || [],
            summary: (results[5] as any)?.data?.summary || (results[5] as any)?.summary || null,
            partner: (results[5] as any)?.data?.partner || (results[5] as any)?.partner || null,
          });
          const coupleAi = (results[6] as any)?.data || results[6] || [];
          if (Array.isArray(coupleAi) && coupleAi.length > 0) {
            setAiInsights((prev) => [...prev, ...coupleAi]);
          }
        }

        if (familyId) {
          const famOffset = groupId ? 7 : 3;
          setFamilyData((results[famOffset] as any)?.data || results[famOffset] || null);
          const members = (results[famOffset + 1] as any)?.data || results[famOffset + 1] || null;
          setFamilyMembers(Array.isArray(members) ? members : members?.members || []);
          const famAi = (results[famOffset + 2] as any)?.data || results[famOffset + 2] || [];
          const famAiArr = Array.isArray(famAi) ? famAi : famAi?.insights || [];
          if (famAiArr.length > 0) {
            setAiInsights((prev) => [...prev, ...famAiArr]);
          }
        }
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

  useEffect(() => {
    idsFetchedRef.current = false;
  }, []);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      await api.post<any>('/reports/export', {
        type: 'full',
        format,
        lens: activeLens,
        months: getPeriodMonths(period) || 6,
        groupId: groupIdRef.current || familyIdRef.current || undefined,
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

  const familySummary = familyData?.summary || {};
  const familyExpenses = familySummary.totalExpense || 0;
  const familyIncome = familySummary.totalIncome || 0;
  const familyName = familyData?.name || familyData?.familyName || 'Family';

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
    <PremiumGate featureKey="advanced_reports">
    <View
      style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Full Reports</Text>
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
              { backgroundColor: period === p ? colors.accent.primary : colors.bg.secondary },
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
            onRefresh={() => {
              idsFetchedRef.current = false;
              loadData(false, true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Overall Financial Summary
        </Text>
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

        {coupleData?.summary && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Couple Overview
            </Text>
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Combined Inc."
                value={fmt(coupleData.summary.totalIncome || 0)}
                icon="arrowdown"
                color="#10B981"
                colors={colors}
              />
              <SummaryCard
                label="Combined Exp."
                value={fmt(coupleData.summary.totalExpense || 0)}
                icon="arrowup"
                color="#EF4444"
                colors={colors}
              />
              <SummaryCard
                label="Shared Savings"
                value={fmt(
                  (coupleData.summary.totalIncome || 0) - (coupleData.summary.totalExpense || 0),
                )}
                icon="balance"
                color="#8B5CF6"
                colors={colors}
              />
              <SummaryCard
                label="Partner"
                value={coupleData.partner?.name || 'Partner'}
                icon="team"
                color="#F59E0B"
                colors={colors}
              />
            </View>
          </>
        )}

        {familyData && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {familyName} Summary
            </Text>
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Income"
                value={fmt(familyIncome)}
                icon="team"
                color="#8B5CF6"
                colors={colors}
              />
              <SummaryCard
                label="Expense"
                value={fmt(familyExpenses)}
                icon="team"
                color="#F43F5E"
                colors={colors}
              />
              <SummaryCard
                label="Members"
                value={`${familyMembers.length}`}
                icon="user"
                color="#3B82F6"
                colors={colors}
              />
              <SummaryCard
                label="Savings"
                value={fmt(familyIncome - familyExpenses)}
                icon="balance"
                color={familyIncome - familyExpenses >= 0 ? '#10B981' : '#EF4444'}
                colors={colors}
              />
            </View>
          </>
        )}

        {familyMembers.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Member Overview</Text>
            {familyMembers.slice(0, 6).map((member: any, i: number) => (
              <View key={i} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={[styles.memberInitial, { color: '#FFFFFF' }]}>
                    {(member.name || member.firstName || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text.primary }]}>
                    {member.name || member.firstName || 'Member'}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.text.tertiary }]}>
                    {member.role || 'Member'}
                  </Text>
                </View>
                <View style={styles.memberFinance}>
                  <Text style={[styles.memberIncome, { color: colors.status.success }]}>
                    {fmt(member.income || 0)}
                  </Text>
                  <Text style={[styles.memberExpense, { color: colors.status.error }]}>
                    {fmt(member.expense || 0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {monthly.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Monthly Trend</Text>
            <View style={styles.chartRow}>
              {monthly.map((m: any, i: number) => {
                const expH = Math.max((m.expense / maxMonthly) * 100, 4);
                const incH = Math.max((m.income / maxMonthly) * 100, 4);
                return (
                  <View key={i} style={[styles.chartCol, { height: 140 }]}>
                    <View style={styles.barGroup}>
                      <View
                        style={[
                          styles.bar,
                          { height: incH, backgroundColor: '#10B981', minWidth: 8 },
                        ]}
                      />
                      <View
                        style={[
                          styles.bar,
                          { height: expH, backgroundColor: '#EF4444', minWidth: 8 },
                        ]}
                      />
                    </View>
                    <Text style={[styles.monthLabel, { color: colors.text.tertiary }]}>
                      {m.month.split('-')[1] || m.month}
                    </Text>
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
                        { width: `${Math.min(pct, 100)}%`, backgroundColor: '#0EA5E9' },
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
            {aiInsights.slice(0, 6).map((insight: any, i: number) => (
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
    </PremiumGate>
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
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14, marginTop: 4 },
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
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  chartCol: { alignItems: 'center', flex: 1, gap: 4 },
  barGroup: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { borderRadius: 8 },
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 26,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberRole: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  memberFinance: { alignItems: 'flex-end' },
  memberIncome: { fontSize: 12, fontWeight: '600' },
  memberExpense: { fontSize: 12, fontWeight: '500' },
});
