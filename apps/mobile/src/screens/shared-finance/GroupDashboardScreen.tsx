import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MemberBalance {
  from: string;
  to: string;
  amount: number;
}

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: { id: string; name: string };
  date: string;
}

interface PendingSettlement {
  id: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
  status: string;
}

interface Insight {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'success';
}

interface DashboardData {
  totalSpent: number;
  thisMonthSpent: number;
  lastMonthSpent: number;
  categoryBreakdown: CategoryBreakdown[];
  memberBalances: MemberBalance[];
  recentActivity: RecentExpense[];
  pendingSettlements: PendingSettlement[];
  insights: Insight[];
  currency: string;
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

const INSIGHT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: 'bulb-outline',
  warning: 'alert-circle-outline',
  success: 'checkmark-circle-outline',
};

const formatAmount = (amount: number, currency: string = 'INR') => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(safeAmount));
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<DashboardData>(`/shared-finance/groups/${groupId}/dashboard`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
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
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
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

  const currency = data?.currency || 'INR';
  const spentPercentage = data && data.lastMonthSpent > 0
    ? (Number(data.thisMonthSpent ?? 0) - Number(data.lastMonthSpent ?? 0)) / Number(data.lastMonthSpent ?? 1) * 100
    : 0;
  const isUp = spentPercentage > 0;

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

        <Card variant="elevated" padding="2xl" style={styles.totalSpentCard}>
          <Text style={[typography.callout, { color: colors.text.secondary, textAlign: 'center' }]}>
            Total Spent
          </Text>
          <Text style={[typography.amountLarge, { color: colors.text.primary, textAlign: 'center', marginTop: spacing.sm }]}>
            {formatAmount(data?.totalSpent ?? 0, currency)}
          </Text>
          <View style={[styles.monthRow, { backgroundColor: colors.bg.glass, borderRadius: br.lg, padding: spacing.md, marginTop: spacing.xl }]}>
            <View style={styles.monthItem}>
              <Text style={[typography.subhead, { color: colors.text.tertiary }]}>This Month</Text>
              <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 2 }]}>
                {formatAmount(data?.thisMonthSpent ?? 0, currency)}
              </Text>
            </View>
            <View style={[styles.monthDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.monthItem}>
              <Text style={[typography.subhead, { color: colors.text.tertiary }]}>vs Last Month</Text>
              <View style={styles.monthChange}>
                <Ionicons
                  name={isUp ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={isUp ? colors.status.error : colors.status.success}
                />
                <Text
                  style={[
                    typography.bodyBold,
                    { color: isUp ? colors.status.error : colors.status.success, marginLeft: 4 },
                  ]}
                >
                  {isUp ? '+' : ''}{spentPercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Category Breakdown</Text>
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              {data.categoryBreakdown.map((cat, index) => (
                <View key={cat.category}>
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryLabel}>
                      <Ionicons
                        name={CATEGORY_ICONS[cat.category] || 'ellipsis-horizontal-outline'}
                        size={16}
                        color={cat.color}
                      />
                      <Text style={[typography.callout, { color: colors.text.primary, marginLeft: 8 }]}>
                        {cat.category}
                      </Text>
                    </View>
                    <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                      {formatAmount(cat.amount, currency)}
                    </Text>
                  </View>
                  <View style={[styles.barBackground, { backgroundColor: colors.bg.tertiary, borderRadius: br.sm }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(cat.percentage, 3)}%`,
                          backgroundColor: cat.color,
                          borderRadius: br.sm,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 4, textAlign: 'right' }]}>
                    {cat.percentage.toFixed(1)}%
                  </Text>
                  {index < data.categoryBreakdown.length - 1 && (
                    <View style={[styles.catDivider, { backgroundColor: colors.border.subtle }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {data?.memberBalances && data.memberBalances.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Who Owes Whom</Text>
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.balancesTable}>
                  <View style={[styles.balancesHeader, { borderBottomColor: colors.border.subtle }]}>
                    <Text style={[styles.tableHeaderText, { color: colors.text.tertiary, flex: 1 }]}>From</Text>
                    <Text style={[styles.tableHeaderText, { color: colors.text.tertiary, flex: 1, textAlign: 'center' }]}>To</Text>
                    <Text style={[styles.tableHeaderText, { color: colors.text.tertiary, flex: 1, textAlign: 'right' }]}>Amount</Text>
                  </View>
                  {data.memberBalances.map((mb, index) => (
                    <View
                      key={`${mb.from}-${mb.to}-${index}`}
                      style={[styles.balanceRow, index < data.memberBalances.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle }]}
                    >
                      <Text style={[typography.callout, { color: colors.text.primary, flex: 1 }]}>
                        {mb.from}
                      </Text>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Ionicons name="arrow-forward" size={16} color={colors.text.tertiary} />
                      </View>
                      <Text style={[typography.callout, { color: colors.text.primary, flex: 1, textAlign: 'center' }]}>
                        {mb.to}
                      </Text>
                      <Text style={[typography.calloutBold, { color: colors.status.success, flex: 1, textAlign: 'right' }]}>
                        {formatAmount(mb.amount, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          </View>
        )}

        {data?.pendingSettlements && data.pendingSettlements.length > 0 && (
          <View style={styles.section}>
            <Card variant="outlined" padding="lg" style={[styles.pendingCard, { borderColor: colors.status.warning + '30' }]}>
              <View style={styles.pendingHeader}>
                <View style={styles.pendingTitleRow}>
                  <Ionicons name="timer-outline" size={20} color={colors.status.warning} />
                  <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
                    Pending Settlements
                  </Text>
                </View>
                <Text style={[typography.subheadBold, { color: colors.status.warning }]}>
                  {data.pendingSettlements.length}
                </Text>
              </View>
              {data.pendingSettlements.map((ps) => (
                <View key={ps.id} style={[styles.pendingItem, { borderTopColor: colors.border.subtle }]}>
                  <Text style={[typography.callout, { color: colors.text.primary, flex: 1 }]}>
                    {ps.from.name} → {ps.to.name}
                  </Text>
                  <Text style={[typography.calloutBold, { color: colors.status.warning }]}>
                    {formatAmount(ps.amount, currency)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {data?.recentActivity && data.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Recent Activity</Text>
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              {data.recentActivity.map((expense, index) => (
                <TouchableOpacity
                  key={expense.id}
                  style={[
                    styles.activityItem,
                    index < data.recentActivity.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
                  ]}
                  onPress={() => navigation.navigate('GroupExpenseDetail', { groupId, expenseId: expense.id })}
                >
                  <View style={[styles.activityIcon, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name="receipt-outline" size={18} color={colors.accent.primary} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={[typography.callout, { color: colors.text.primary }]} numberOfLines={1}>
                      {expense.description}
                    </Text>
                    <Text style={[typography.subhead, { color: colors.text.tertiary }]}>
                      {expense.paidBy.name} · {formatDate(expense.date)}
                    </Text>
                  </View>
                  <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                    {formatAmount(expense.amount, currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {data?.insights && data.insights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.insightsHeader}>
              <Ionicons name="sparkles" size={20} color={colors.accent.primary} />
              <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
                AI Insights
              </Text>
            </View>
            {data.insights.map((insight) => {
              const insightColor = insight.type === 'warning' ? colors.status.warning
                : insight.type === 'success' ? colors.status.success
                : colors.status.info;
              const insightBg = insight.type === 'warning' ? colors.status.warningLight
                : insight.type === 'success' ? colors.status.successLight
                : colors.status.infoLight;

              return (
                <Card key={insight.id} variant="elevated" padding="lg" style={[styles.insightCard]}>
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIcon, { backgroundColor: insightBg }]}>
                      <Ionicons name={INSIGHT_ICONS[insight.type]} size={20} color={insightColor} />
                    </View>
                    <Text style={[typography.callout, { color: colors.text.primary, flex: 1, marginLeft: spacing.md, lineHeight: 22 }]}>
                      {insight.text}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  totalSpentCard: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  monthChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionCard: {
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barBackground: {
    height: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  catDivider: {
    height: 1,
    marginVertical: 14,
  },
  balancesTable: {
    minWidth: width - 80,
  },
  balancesHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pendingCard: {
    marginTop: 0,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightCard: {
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
