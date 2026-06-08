import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { fabShadow } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { FinCard } from '../../components/ui/FinCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { getCategoryColor } from '../../config/categoryIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;

interface DashboardData {
  totalBalance: number;
  monthlySpending: number;
  monthlyBudget: number;
  monthlyIncome: number;
  recentTransactions: any[];
  categories: any[];
  sharedGroups: any[];
  reminders: any[];
  goals: any[];
}

const emptyData: DashboardData = {
  totalBalance: 0,
  monthlySpending: 0,
  monthlyBudget: 0,
  monthlyIncome: 0,
  recentTransactions: [],
  categories: [],
  sharedGroups: [],
  reminders: [],
  goals: [],
};

function fmt(v: number) {
  const n = v || 0;
  return `\u20B9${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtShort(v: number) {
  if (v >= 100000) {
    return `\u20B9${(v / 100000).toFixed(1)}L`;
  }
  if (v >= 1000) {
    return `\u20B9${(v / 1000).toFixed(1)}K`;
  }
  return fmt(v);
}

function fdate(d: string | null | undefined): string {
  if (!d) {
    return '';
  }
  const dt = new Date(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (dt.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getCategoryIcon(cat: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Food: 'fast-food',
    Transport: 'car',
    Shopping: 'bag',
    Bills: 'document-text',
    Entertainment: 'film',
    Health: 'fitness',
    Education: 'school',
    Travel: 'airplane',
    Groceries: 'cart',
    Rent: 'home',
    Salary: 'cash',
    Investment: 'trending-up',
    Utilities: 'flash',
    Insurance: 'shield',
    Other: 'ellipsis-horizontal',
  };
  return map[cat] || 'ellipsis-horizontal';
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, accessToken } = useAuth();

  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const savings = data.monthlyIncome - data.monthlySpending;
  const savingsRate = data.monthlyIncome > 0 ? (savings / data.monthlyIncome) * 100 : 0;
  const spendPct =
    data.monthlyBudget > 0 ? Math.min((data.monthlySpending / data.monthlyBudget) * 100, 100) : 0;

  const loadData = useCallback(
    async (isRefresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }

      if (!isRefresh) {
        try {
          const cached = await AsyncStorage.getItem(`home_cache_${user?.id || 'anon'}`);
          if (cached) {
            setData(JSON.parse(cached));
            fadeAnim.setValue(1);
            setLoading(false);
          }
        } catch {
          /* cache miss, continue */
        }
      }

      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [balRes, spendRes, txRes, catRes, groupsRes, remindersRes, goalsRes] =
          await Promise.allSettled([
            api.get<any>('/accounts/balance/summary', ctrl.signal),
            api.get<any>('/transactions/summary', ctrl.signal),
            api.get<any>('/transactions?limit=10', ctrl.signal),
            api.get<any>('/transactions/categories-summary', ctrl.signal),
            api.get<any>('/shared-finance/groups', ctrl.signal),
            api.get<any>('/reminders', ctrl.signal),
            api.get<any>('/goals', ctrl.signal),
          ]);

        if (ctrl.signal.aborted) {
          return;
        }

        const balance = balRes.status === 'fulfilled' ? balRes.value?.totalBalance || 0 : 0;
        const summary = spendRes.status === 'fulfilled' ? spendRes.value : {};
        const txs = txRes.status === 'fulfilled' ? txRes.value : [];
        const cats = catRes.status === 'fulfilled' ? catRes.value : [];
        const groups = groupsRes.status === 'fulfilled' ? groupsRes.value : [];
        const reminders = remindersRes.status === 'fulfilled' ? remindersRes.value : [];
        const goals = goalsRes.status === 'fulfilled' ? goalsRes.value : [];

        const dashboardData: DashboardData = {
          totalBalance: balance,
          monthlySpending: summary.monthlySpending || 0,
          monthlyBudget: summary.monthlyBudget || 0,
          monthlyIncome: summary.monthlyIncome || 0,
          recentTransactions: Array.isArray(txs) ? txs.slice(0, 10) : [],
          categories: Array.isArray(cats) ? cats : [],
          sharedGroups: Array.isArray(groups) ? groups : [],
          reminders: Array.isArray(reminders) ? reminders : [],
          goals: Array.isArray(goals) ? goals : [],
        };

        setData(dashboardData);
        AsyncStorage.setItem(
          `home_cache_${user?.id || 'anon'}`,
          JSON.stringify(dashboardData),
        ).catch(() => {});
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      } catch {
        if (!ctrl.signal.aborted) {
          setData((prev) => prev);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, user?.id, fadeAnim],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const quickActions = useMemo(
    () => [
      {
        icon: 'add-circle' as const,
        label: 'Add Income',
        color: colors.status.success,
        route: 'AddIncome',
      },
      {
        icon: 'remove-circle' as const,
        label: 'Add Expense',
        color: colors.status.error,
        route: 'AddExpense',
      },
      { icon: 'send' as const, label: 'Transfer', color: colors.accent.primary, route: 'Transfer' },
      { icon: 'card' as const, label: 'Pay', color: '#F59E0B', route: 'Payments' },
    ],
    [colors],
  );

  // Show upgrade banner for non-premium users only if needed
  const showUpgradeBanner = false;

  if (loading && !data.totalBalance) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <LoadingScreen />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.text.secondary }]}>
              {new Date().getHours() < 12
                ? 'Good morning'
                : new Date().getHours() < 18
                  ? 'Good afternoon'
                  : 'Good evening'}
            </Text>
            <Text style={[styles.userName, { color: colors.text.primary }]}>
              {user?.firstName || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: `${colors.accent.primary}15` }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={[styles.avatarText, { color: colors.accent.primary }]}>
              {(user?.firstName?.[0] || 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
          <FinCard
            radius={28}
            elevation="lg"
            padding={28}
            style={{ backgroundColor: colors.card.balance }}
          >
            <Text style={[styles.balanceLabel, { color: colors.text.tertiary }]}>
              Total Balance
            </Text>
            <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>
              {fmt(data.totalBalance)}
            </Text>

            <View style={[styles.balanceDivider, { backgroundColor: colors.border.subtle }]} />

            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <View
                  style={[
                    styles.balanceStatIcon,
                    { backgroundColor: `${colors.status.success}15` },
                  ]}
                >
                  <Ionicons name="trending-up" size={14} color={colors.status.success} />
                </View>
                <View>
                  <Text style={[styles.balanceStatLabel, { color: colors.text.tertiary }]}>
                    Income
                  </Text>
                  <Text style={[styles.balanceStatValue, { color: colors.text.primary }]}>
                    {fmt(data.monthlyIncome)}
                  </Text>
                </View>
              </View>
              <View
                style={[styles.balanceStatDivider, { backgroundColor: colors.border.subtle }]}
              />
              <View style={styles.balanceStat}>
                <View
                  style={[styles.balanceStatIcon, { backgroundColor: `${colors.status.error}15` }]}
                >
                  <Ionicons name="trending-down" size={14} color={colors.status.error} />
                </View>
                <View>
                  <Text style={[styles.balanceStatLabel, { color: colors.text.tertiary }]}>
                    Spent
                  </Text>
                  <Text style={[styles.balanceStatValue, { color: colors.text.primary }]}>
                    {fmt(data.monthlySpending)}
                  </Text>
                </View>
              </View>
            </View>
          </FinCard>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickAction, { backgroundColor: `${action.color}12` }]}
              onPress={() => navigation.navigate(action.route)}
              activeOpacity={0.7}
            >
              <Ionicons name={action.icon} size={24} color={action.color} />
              <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric Cards */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Monthly Budget"
            value={fmt(data.monthlyBudget)}
            icon="wallet"
            cardBg={colors.card.budget}
            onPress={() => navigation.navigate('Budgets')}
          />
          <View style={{ width: CARD_GAP }} />
          <MetricCard
            label="Savings"
            value={fmt(savings)}
            icon="save-outline"
            color={colors.status.success}
            cardBg={colors.card.savings}
            trend={{
              value: `${savingsRate.toFixed(0)}%`,
              positive: savingsRate >= 15,
            }}
            onPress={() => {}}
          />
        </View>

        {/* Budget Progress */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <FinCard
            radius={22}
            elevation="sm"
            padding={22}
            style={{ backgroundColor: colors.card.budget }}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Budget Progress
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                <Text style={[styles.viewAll, { color: colors.accent.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.budgetBarContainer}>
              <View style={styles.budgetBarRow}>
                <Text style={[styles.budgetBarLabel, { color: colors.text.secondary }]}>
                  {spendPct.toFixed(0)}% used
                </Text>
                <Text
                  style={[
                    styles.budgetBarLabel,
                    {
                      color: spendPct > 85 ? colors.status.error : colors.text.secondary,
                    },
                  ]}
                >
                  {fmt(data.monthlyBudget - data.monthlySpending)} remaining
                </Text>
              </View>
              <View style={[styles.budgetBar, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[
                    styles.budgetBarFill,
                    {
                      width: `${Math.min(spendPct, 100)}%`,
                      backgroundColor: spendPct > 85 ? colors.status.error : colors.accent.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </FinCard>
        </View>

        {/* Spending by Category */}
        {data.categories.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Spending by Category
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                <Text style={[styles.viewAll, { color: colors.accent.primary }]}>Reports</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginTop: 12 }}>
              {data.categories.slice(0, 5).map((cat: any, i: number) => {
                const catName = cat.category || cat.name || 'Other';
                const catAmount = cat.amount || cat.total || 0;
                const catPct =
                  data.monthlySpending > 0 ? (catAmount / data.monthlySpending) * 100 : 0;
                const catColor = getCategoryColor(catName);

                return (
                  <View key={catName + i} style={styles.categoryRow}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${catColor}18` }]}>
                      <Ionicons name={getCategoryIcon(catName)} size={16} color={catColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.categoryTop}>
                        <Text style={[styles.categoryName, { color: colors.text.primary }]}>
                          {catName}
                        </Text>
                        <Text style={[styles.categoryAmount, { color: colors.text.primary }]}>
                          {fmtShort(catAmount)}
                        </Text>
                      </View>
                      <View style={[styles.categoryBar, { backgroundColor: colors.bg.tertiary }]}>
                        <View
                          style={[
                            styles.categoryBarFill,
                            {
                              width: `${Math.min(catPct, 100)}%`,
                              backgroundColor: catColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[styles.viewAll, { color: colors.accent.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {data.recentTransactions.length > 0 ? (
            <View style={{ marginTop: 12, gap: 2 }}>
              {data.recentTransactions.map((tx: any, i: number) => {
                const isIncome = tx.type === 'income';
                const amount = Number(tx.amount || 0);
                const txColor = isIncome ? colors.status.success : colors.status.error;
                const catName = tx.category || tx.categoryName || 'Other';
                const catColor = getCategoryColor(catName);

                return (
                  <TouchableOpacity
                    key={tx.id || i}
                    style={[styles.txRow, { backgroundColor: colors.bg.secondary }]}
                    onPress={() => navigation.navigate('Transactions', { transactionId: tx.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.txIcon, { backgroundColor: `${catColor}15` }]}>
                      <Ionicons name={getCategoryIcon(catName)} size={18} color={catColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[styles.txName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {tx.description || tx.note || catName}
                      </Text>
                      <Text style={[styles.txMeta, { color: colors.text.tertiary }]}>
                        {fdate(tx.date || tx.createdAt)}{' '}
                        {tx.paymentMode ? `\u00B7 ${tx.paymentMode}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: txColor }]}>
                      {isIncome ? '+' : '-'}
                      {fmt(amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <FinCard
              radius={22}
              elevation="sm"
              padding={28}
              style={{ backgroundColor: colors.card.budget }}
            >
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt-outline" size={36} color={colors.text.tertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                  No transactions yet
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                  Add your first expense or income to get started
                </Text>
              </View>
            </FinCard>
          )}
        </View>

        {/* Shared Groups */}
        {data.sharedGroups.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 12 }]}>
              Shared Spaces
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {data.sharedGroups.slice(0, 5).map((group: any) => {
                const groupType = group.type || 'default';
                const typeConfig: Record<
                  string,
                  { icon: keyof typeof Ionicons.glyphMap; color: string }
                > = {
                  couple: { icon: 'heart', color: '#FF6B9D' },
                  family: { icon: 'home', color: colors.accent.primary },
                  friends: { icon: 'people', color: '#60A5FA' },
                  trip: { icon: 'airplane', color: '#10B981' },
                  default: { icon: 'people', color: colors.accent.primary },
                };
                const cfg = typeConfig[groupType] || typeConfig.default;
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, { backgroundColor: `${cfg.color}12` }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('SharedGroupDetail', { groupId: group.id })}
                  >
                    <View style={[styles.groupIcon, { backgroundColor: cfg.color + '25' }]}>
                      <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                    </View>
                    <Text
                      style={[styles.groupName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {group.name}
                    </Text>
                    <Text style={[styles.groupBalance, { color: colors.text.tertiary }]}>
                      {group.balance ? fmtShort(group.balance) : 'Settled'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Upgrade Banner */}
        {showUpgradeBanner && <UpgradeBanner />}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary }, fabShadow]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  balanceLabel: { fontSize: 13, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' },
  balanceAmount: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginTop: 4 },
  balanceDivider: { height: 1, marginVertical: 20 },
  balanceStats: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  balanceStatValue: { fontSize: 16, fontWeight: '700', marginTop: 1 },
  balanceStatDivider: { width: 1, height: 32, marginHorizontal: 12 },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  quickActionLabel: { fontSize: 11, fontWeight: '700' },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  viewAll: { fontSize: 14, fontWeight: '600' },
  budgetBarContainer: { marginTop: 14 },
  budgetBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetBarLabel: { fontSize: 13, fontWeight: '500' },
  budgetBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 4 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: { fontSize: 14, fontWeight: '600' },
  categoryAmount: { fontSize: 14, fontWeight: '700' },
  categoryBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 2 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: { fontSize: 14, fontWeight: '600' },
  txMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
  groupCard: {
    padding: 18,
    borderRadius: 22,
    width: 130,
    gap: 8,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { fontSize: 14, fontWeight: '700' },
  groupBalance: { fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
