import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { useSharedFinanceRealtime } from '../../hooks/useSharedFinanceRealtime';

interface Summary {
  totalExpenses: number;
  totalExpensesCount: number;
  memberCount: number;
  currency: string;
}

interface MemberContribution {
  memberId: string;
  name: string;
  avatarUrl?: string;
  expense: number;
  net: number;
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  amount: number;
}

interface DashboardData {
  summary: Summary;
  memberContributions: MemberContribution[];
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Food: 'fast-food-outline',
  Travel: 'airplane-outline',
  Shopping: 'cart-outline',
  Entertainment: 'film-outline',
  Bills: 'document-text-outline',
  Groceries: 'basket-outline',
  Transport: 'car-outline',
  Accommodation: 'bed-outline',
  Utilities: 'flash-outline',
  Healthcare: 'medkit-outline',
  Education: 'school-outline',
  Other: 'ellipsis-horizontal-outline',
};

const CATEGORY_COLORS = [
  '#f7892c',
  '#7c3aed',
  '#06b6d4',
  '#10b981',
  '#f43f5e',
  '#eab308',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#64748b',
];

const formatAmount = (amount: number, currency: string = 'INR') => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(safeAmount));
};

export function GroupDashboardScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string } }, 'params'>>();
  const { groupId } = route.params;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSharedFinanceRealtime({
    groupId,
    onExpenseCreated: () => {
      if (data) {
        fetchDashboard(true);
      }
    },
    onExpenseUpdated: () => {
      if (data) {
        fetchDashboard(true);
      }
    },
    onExpenseDeleted: () => {
      if (data) {
        fetchDashboard(true);
      }
    },
    onSettlementCreated: () => {
      if (data) {
        fetchDashboard(true);
      }
    },
    onSettlementUpdated: () => {
      if (data) {
        fetchDashboard(true);
      }
    },
  });

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const res = await api.get<any>(`/shared-finance/groups/${groupId}/dashboard`);
        setData({
          summary: res.summary || {
            totalExpenses: 0,
            totalExpensesCount: 0,
            memberCount: 0,
            currency: 'INR',
          },
          memberContributions: res.memberContributions || [],
          categoryBreakdown: (res.categoryBreakdown || []).map((c: any, i: number) => ({
            ...c,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          })),
          monthlyTrend: res.monthlyTrend || [],
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard]),
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text
            style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchDashboard()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currency = data?.summary?.currency || 'INR';
  const totalExpenses = data?.summary?.totalExpenses || 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Financial Overview Card */}
        <Card variant="premium" padding="2xl" style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: colors.status.error + '20' }]}>
                <Ionicons name="trending-down" size={18} color={colors.status.error} />
              </View>
              <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 8 }]}>
                Total Spent
              </Text>
              <Text style={[styles.overviewAmount, { color: colors.status.error }]}>
                {formatAmount(totalExpenses, currency)}
              </Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <View
                style={[styles.overviewIcon, { backgroundColor: colors.accent.primary + '20' }]}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.accent.primary} />
              </View>
              <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 8 }]}>
                Expenses
              </Text>
              <Text style={[styles.overviewAmount, { color: colors.accent.primary }]}>
                {data?.summary?.totalExpensesCount || 0}
              </Text>
            </View>
          </View>
        </Card>

        {/* Member Contributions */}
        {data?.memberContributions && data.memberContributions.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>
              Member Contributions
            </Text>
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              {data.memberContributions.map((mc, idx) => (
                <View key={mc.memberId}>
                  <View style={styles.memberContributionRow}>
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: colors.accent.primary + '25' },
                      ]}
                    >
                      <Text style={[styles.memberAvatarText, { color: colors.accent.primary }]}>
                        {(mc.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberContributionInfo}>
                      <Text style={[typography.callout, { color: colors.text.primary }]}>
                        {mc.name}
                      </Text>
                      <View style={styles.memberContributionMeta}>
                        <Text style={[typography.subhead, { color: colors.status.error }]}>
                          Paid: {formatAmount(mc.expense, currency)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        typography.calloutBold,
                        { color: mc.net >= 0 ? colors.status.success : colors.status.error },
                      ]}
                    >
                      {mc.net >= 0 ? '+' : ''}
                      {formatAmount(mc.net, currency)}
                    </Text>
                  </View>
                  {idx < data.memberContributions.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border.subtle, marginVertical: 10 },
                      ]}
                    />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Category Breakdown */}
        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>
              Spending by Category
            </Text>
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              {data.categoryBreakdown.map((cat, index) => (
                <View key={cat.name}>
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryLabel}>
                      <Ionicons
                        name={CATEGORY_ICONS[cat.name] || 'ellipsis-horizontal-outline'}
                        size={14}
                        color={cat.color}
                      />
                      <Text
                        style={[typography.callout, { color: colors.text.primary, marginLeft: 8 }]}
                      >
                        {cat.name}
                      </Text>
                    </View>
                    <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                      {formatAmount(cat.amount, currency)}
                    </Text>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max((cat.amount / totalExpenses) * 100, 2)}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                  {index < data.categoryBreakdown.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border.subtle, marginVertical: 10 },
                      ]}
                    />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Income Monthly Trend */}
        {data?.monthlyTrend && data.monthlyTrend.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Monthly Spending</Text>
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.trendTable}>
                  <View style={[styles.trendHeader, { borderBottomColor: colors.border.subtle }]}>
                    <Text style={[styles.trendHeaderText, { color: colors.text.tertiary }]}>
                      Month
                    </Text>
                    <Text style={[styles.trendHeaderText, { color: colors.text.tertiary }]}>
                      Spent
                    </Text>
                  </View>
                  {data.monthlyTrend.map((trend, idx) => (
                    <View
                      key={trend.month}
                      style={[
                        styles.trendRow,
                        idx < data.monthlyTrend.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border.subtle,
                        },
                      ]}
                    >
                      <Text style={[typography.callout, { color: colors.text.primary }]}>
                        {trend.month}
                      </Text>
                      <Text style={[typography.calloutBold, { color: colors.status.error }]}>
                        {formatAmount(trend.amount, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.accent.primary + '15' }]}
              onPress={() => navigation.navigate('CreateGroupExpense', { groupId })}
            >
              <Ionicons name="receipt-outline" size={22} color={colors.accent.primary} />
              <Text style={[styles.quickActionText, { color: colors.accent.primary }]}>
                Add Expense
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  overviewCard: { marginHorizontal: 20, marginTop: 8, borderRadius: 24 },
  overviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewAmount: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  overviewDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 8,
  },
  spentBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  spentFill: { height: '100%', borderRadius: 3 },
  overviewFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionCard: { marginTop: 12 },
  memberContributionRow: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '700' },
  memberContributionInfo: { flex: 1, marginLeft: 10 },
  memberContributionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: { flexDirection: 'row', alignItems: 'center' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  trendTable: { minWidth: width - 80 },
  trendHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, gap: 20 },
  trendHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendRow: { flexDirection: 'row', paddingVertical: 12, gap: 20 },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  quickActionText: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1 },
});
