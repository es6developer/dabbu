import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categoryIcons';

const { width } = Dimensions.get('window');
const TAB_W = (width - 40 - 8) / 3;

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function pctStr(v: number) {
  return `${Math.round(v)}%`;
}

const PERIODS = ['This Month', 'This Quarter', 'This Year'] as const;
type Period = (typeof PERIODS)[number];

const CAT_COLORS: Record<string, string> = {};
for (const c of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) {
  CAT_COLORS[c.name] = c.color;
}

export function CoupleReportsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('This Month');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const periodQuery =
    period === 'This Month' ? 'month' : period === 'This Quarter' ? 'quarter' : 'year';

  const fetchReports = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) {
        setLoading(true);
      }
      try {
        const groups: any[] = await api.get('/shared-finance/groups');
        const coupleGroup = Array.isArray(groups)
          ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
          : null;
        if (!coupleGroup) {
          setError('No couple space found.');
          setData(null);
          return;
        }
        const reports = await api.get<any>(
          `/shared-finance/groups/${coupleGroup.id}/couple/reports?period=${periodQuery}`,
        );
        setData(reports || {});
        setError('');
      } catch (e: any) {
        setError(e?.message || 'Failed to load reports');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [periodQuery],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const summaryCards = useMemo(() => {
    const d = data || {};
    const totalIncome = d.totalIncome ?? 0;
    const totalExpense = d.totalExpense ?? 0;
    const netSavings = d.netSavings ?? totalIncome - totalExpense;
    return [
      { label: 'Total Income', amount: totalIncome, icon: 'linechart', color: '#34C759' },
      { label: 'Total Expenses', amount: totalExpense, icon: 'shoppingcart', color: '#FF4D4F' },
      { label: 'Net Savings', amount: netSavings, icon: 'save', color: '#14B8A6' },
    ] as const;
  }, [data]);

  const maxAmount = Math.max(summaryCards[0]?.amount || 1, summaryCards[1]?.amount || 1, 1);

  const categoryData = useMemo(() => {
    const cats = data?.categoryBreakdown || [];
    if (!Array.isArray(cats)) {
      return [];
    }
    const total = cats.reduce((s: number, c: any) => s + (c.amount || 0), 0) || 1;
    return cats.map((c: any) => ({
      name: c.category || 'Uncategorized',
      amount: c.amount || 0,
      color: CAT_COLORS[c.category] || colors.accent.primary,
      pct: Math.round((c.amount / total) * 100),
    }));
  }, [data]);

  const partnerData = useMemo(() => {
    const p = data?.partnerContribution || {};
    const p1 = { name: p.partner1Name || 'Partner 1', amount: p.partner1Amount ?? 0 };
    const p2 = { name: p.partner2Name || 'Partner 2', amount: p.partner2Amount ?? 0 };
    const total = p1.amount + p2.amount || 1;
    return {
      p1,
      p2,
      p1Pct: Math.round((p1.amount / total) * 100),
      p2Pct: Math.round((p2.amount / total) * 100),
    };
  }, [data]);

  const budgetStatus = data?.budgetStatus || { status: 'On Track', spent: 0, budget: 0 };
  const budgetPct =
    budgetStatus.budget > 0 ? Math.round((budgetStatus.spent / budgetStatus.budget) * 100) : 0;
  const statusColor =
    budgetStatus.status === 'On Track'
      ? '#34C759'
      : budgetStatus.status === 'Over Budget'
        ? '#FF4D4F'
        : '#14B8A6';
  const statusIcon =
    budgetStatus.status === 'On Track'
      ? 'checkcircle'
      : budgetStatus.status === 'Over Budget'
        ? 'exclamationcircle'
        : 'caretdown';

  if (loading) {
    return <LoadingScreen />;
  }

  if (error && !data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <AntDesign name="barschart" size={48} color={colors.accent.primary}  />
          <Text style={[styles.emptyTitle, { color: colors.text.secondary, marginTop: 12 }]}>
            No Data
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary, textAlign: 'center' }]}>
            {error}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchReports(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <View
            style={[
              styles.periodRow,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                activeOpacity={0.7}
                style={[styles.periodTab, { width: TAB_W }, period === p && styles.periodTabActive]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: colors.text.tertiary },
                    period === p && { color: colors.accent.primary, fontWeight: '700' },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
          >
            {summaryCards.map((card, i) => (
              <View key={i} style={[styles.summaryCard, { borderColor: colors.border.subtle }]}>
                <View style={[styles.summaryIcon, { backgroundColor: `${card.color}15` }]}>
                  <AntDesign name={card.icon as any} size={20} color={card.color} />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                  {card.label}
                </Text>
                <Text style={[styles.summaryAmount, { color: card.color }]}>
                  {fmt(card.amount)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Income vs Expenses
            </Text>
            <View style={styles.incomeExpenseRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ieLabel, { color: colors.text.tertiary }]}>Income</Text>
                <View style={[styles.ieBarOuter, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  <View
                    style={[
                      styles.ieBar,
                      {
                        width: `${(summaryCards[0]?.amount / maxAmount) * 100}%`,
                        backgroundColor: '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.ieAmount, { color: '#10B981' }]}>
                  {fmt(summaryCards[0]?.amount || 0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ieLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                <View style={[styles.ieBarOuter, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  <View
                    style={[
                      styles.ieBar,
                      {
                        width: `${(summaryCards[1]?.amount / maxAmount) * 100}%`,
                        backgroundColor: '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.ieAmount, { color: '#10B981' }]}>
                  {fmt(summaryCards[1]?.amount || 0)}
                </Text>
              </View>
            </View>
          </View>

          {categoryData.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Top Spending Categories
              </Text>
              {categoryData
                .slice(0, 6)
                .map(
                  (
                    cat: { name: string; amount: number; color: string; pct: number },
                    i: number,
                  ) => (
                    <View key={i} style={styles.catRow}>
                      <View style={styles.catLeft}>
                        <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.catName, { color: colors.text.primary }]}>
                          {cat.name}
                        </Text>
                      </View>
                      <View style={styles.catRight}>
                        <View style={[styles.catBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                          <View
                            style={[
                              styles.catBarFill,
                              { width: `${cat.pct}%`, backgroundColor: cat.color },
                            ]}
                          />
                        </View>
                        <Text style={[styles.catAmt, { color: colors.text.secondary }]}>
                          {fmt(cat.amount)}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
            </View>
          )}

          <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Partner Contribution
            </Text>
            <View style={styles.partnerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.partnerName, { color: colors.text.secondary }]}>
                  {partnerData.p1.name}
                </Text>
                <View style={[styles.partnerBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      styles.partnerBar,
                      { width: `${partnerData.p1Pct}%`, backgroundColor: colors.accent.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.partnerAmount, { color: colors.text.primary }]}>
                  {fmt(partnerData.p1.amount)}
                </Text>
              </View>
              <AntDesign
                 name="hearto"
                size={18}
                color="#14B8A6"
                style={{ marginHorizontal: 8, marginTop: 8 }}
              />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text
                  style={[styles.partnerName, { color: colors.text.secondary, textAlign: 'right' }]}
                >
                  {partnerData.p2.name}
                </Text>
                <View style={[styles.partnerBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      styles.partnerBar,
                      { width: `${partnerData.p2Pct}%`, backgroundColor: colors.accent.primary },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.partnerAmount, { color: colors.text.primary, textAlign: 'right' }]}
                >
                  {fmt(partnerData.p2.amount)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.budgetCard, { borderColor: colors.border.subtle }]}>
            <View style={styles.budgetTop}>
              <View style={styles.budgetLabelRow}>
                <AntDesign name={statusIcon as any} size={18} color={statusColor} />
                <Text style={[styles.budgetTitle, { color: colors.text.primary }]}>
                  Budget Performance
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {budgetStatus.status}
                </Text>
              </View>
            </View>
            <View style={[styles.budgetBarOuter, { backgroundColor: colors.bg.tertiary }]}>
              <View
                style={[
                  styles.budgetBarFill,
                  { width: `${Math.min(budgetPct, 100)}%`, backgroundColor: statusColor },
                ]}
              />
            </View>
            <View style={styles.budgetMeta}>
              <Text style={[styles.budgetMetaText, { color: colors.text.tertiary }]}>
                {fmt(budgetStatus.spent)} of {fmt(budgetStatus.budget)} used
              </Text>
              <Text style={[styles.budgetPct, { color: statusColor }]}>{pctStr(budgetPct)}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.exportBtn,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
            onPress={async () => {
              try {
                const res = await api.post<any>('/compliance/export?format=json', { includes: ['transactions', 'goals', 'bills', 'budgets'] });
                Alert.alert('Export Ready', 'Your data has been exported. Check the Data Export section in Settings to download.');
              } catch {
                Alert.alert('Export Failed', 'Please try again or use the Data Export in Settings.');
              }
            }}
          >
            <AntDesign  name="download" size={20} color={colors.accent.primary} />
            <Text style={styles.exportText}>Export Report</Text>
            <AntDesign  name="right" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },


  periodRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  periodTab: {
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: { backgroundColor: '#FFF' },
  periodText: { fontSize: 13, fontWeight: '600' },

  summaryCard: {
    width: 150,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  summaryAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  sectionCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },

  incomeExpenseRow: { flexDirection: 'row', gap: 16 },
  ieLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  ieBarOuter: { height: 8, borderRadius: 9999, overflow: 'hidden' },
  ieBar: { height: '100%', borderRadius: 9999, minWidth: 4 },
  ieAmount: { fontSize: 14, fontWeight: '700', marginTop: 6 },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 90 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: '600' },
  catRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBarOuter: { flex: 1, height: 6, borderRadius: 9999, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 9999 },
  catAmt: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },

  partnerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  partnerName: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  partnerBarOuter: { height: 8, borderRadius: 9999, overflow: 'hidden', width: '100%' },
  partnerBar: { height: '100%', borderRadius: 9999, minWidth: 4 },
  partnerAmount: { fontSize: 15, fontWeight: '700', marginTop: 6 },

  budgetCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetTitle: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  budgetBarOuter: { height: 8, borderRadius: 9999, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 9999, minWidth: 4 },
  budgetMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetMetaText: { fontSize: 12, fontWeight: '500' },
  budgetPct: { fontSize: 14, fontWeight: '800' },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
  },
  exportText: { fontSize: 15, fontWeight: '600', color: '#F97316' },

  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
