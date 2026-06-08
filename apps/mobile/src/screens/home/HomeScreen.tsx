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
import { PADDING, CARD_GAP, borderRadius, shadows, fabShadow } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';
import { getCategoryColor } from '../../config/categoryIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_WIDTH = (SCREEN_WIDTH - PADDING * 2 - 12 * 3) / 4;

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

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
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
  Dining: 'restaurant',
  Other: 'ellipsis-horizontal',
};

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

function fmtDate(d: string | null) {
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

function getIcon(cat: string): keyof typeof Ionicons.glyphMap {
  return categoryIcons[cat] || 'ellipsis-horizontal';
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

  const savings = Math.max(0, data.monthlyIncome - data.monthlySpending);
  const savingsRate = data.monthlyIncome > 0 ? (savings / data.monthlyIncome) * 100 : 0;
  const spendPct =
    data.monthlyBudget > 0 ? Math.min((data.monthlySpending / data.monthlyBudget) * 100, 100) : 0;
  const spendLabel =
    data.monthlyBudget > 0
      ? data.monthlyBudget - data.monthlySpending >= 0
        ? `${fmt(data.monthlyBudget - data.monthlySpending)} left`
        : `${fmt(Math.abs(data.monthlyBudget - data.monthlySpending))} over`
      : 'No budget set';

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
          /* ignore */
        }
      }

      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [balRes, spendRes, txRes, catRes, groupsRes] = await Promise.allSettled([
          api.get<any>('/accounts/balance/summary', ctrl.signal),
          api.get<any>('/transactions/summary', ctrl.signal),
          api.get<any>('/transactions?limit=10', ctrl.signal),
          api.get<any>('/transactions/categories-summary', ctrl.signal),
          api.get<any>('/shared-finance/groups', ctrl.signal),
        ]);

        if (ctrl.signal.aborted) {
          return;
        }

        const balance = balRes.status === 'fulfilled' ? balRes.value?.totalBalance || 0 : 0;
        const summary = spendRes.status === 'fulfilled' ? spendRes.value || {} : {};
        const txs = txRes.status === 'fulfilled' ? txRes.value || [] : [];
        const cats = catRes.status === 'fulfilled' ? catRes.value || [] : [];
        const groups = groupsRes.status === 'fulfilled' ? groupsRes.value || [] : [];

        const dashboardData: DashboardData = {
          totalBalance: balance,
          monthlySpending: summary.monthlySpending || 0,
          monthlyBudget: summary.monthlyBudget || 0,
          monthlyIncome: summary.monthlyIncome || 0,
          recentTransactions: Array.isArray(txs) ? txs.slice(0, 10) : [],
          categories: Array.isArray(cats) ? cats : [],
          sharedGroups: Array.isArray(groups) ? groups : [],
          reminders: [],
          goals: [],
        };

        setData(dashboardData);
        AsyncStorage.setItem(
          `home_cache_${user?.id || 'anon'}`,
          JSON.stringify(dashboardData),
        ).catch(() => {});
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      } catch {
        /* ignore */
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
        label: 'Income',
        color: colors.status.success,
        route: 'AddIncome',
      },
      {
        icon: 'remove-circle' as const,
        label: 'Expense',
        color: colors.status.error,
        route: 'AddExpense',
      },
      { icon: 'send' as const, label: 'Transfer', color: colors.accent.primary, route: 'Transfer' },
      { icon: 'card' as const, label: 'Pay', color: '#F59E0B', route: 'Payments' },
    ],
    [colors],
  );

  const overviewCards = useMemo(
    () => [
      {
        label: 'Income',
        value: fmt(data.monthlyIncome),
        icon: 'trending-up' as const,
        color: colors.status.success,
        bg: colors.card.income,
      },
      {
        label: 'Expenses',
        value: fmt(data.monthlySpending),
        icon: 'trending-down' as const,
        color: colors.status.error,
        bg: colors.card.expense,
      },
      {
        label: 'Savings',
        value: fmt(savings),
        icon: 'save-outline' as const,
        color: colors.status.success,
        bg: colors.card.savings,
        sub: `${savingsRate.toFixed(0)}%`,
      },
      {
        label: 'Shared',
        value: `0`,
        icon: 'people' as const,
        color: colors.accent.primary,
        bg: colors.card.balance,
        sub: `${data.sharedGroups.length} groups`,
      },
    ],
    [data, savings, savingsRate, colors],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading && !data.totalBalance) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <LoadingScreen />
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
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
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.greeting, { color: colors.text.tertiary }]}>{greeting}</Text>
            <Text style={[s.userName, { color: colors.text.primary }]}>
              {user?.firstName || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={[s.iconBtn, { backgroundColor: `${colors.accent.primary}10` }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={[s.avatarBtn, { backgroundColor: `${colors.accent.primary}15` }]}
          >
            <Text style={[s.avatarText, { color: colors.accent.primary }]}>
              {(user?.firstName?.[0] || 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero Balance Card */}
        <View style={{ paddingHorizontal: PADDING, marginTop: 8 }}>
          <PremiumCard variant="hero" color={colors.card.balance}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.text.secondary,
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  Total Balance
                </Text>
                <Text
                  style={{
                    fontSize: 44,
                    fontWeight: '800',
                    color: colors.text.primary,
                    letterSpacing: -2,
                    lineHeight: 50,
                  }}
                >
                  {fmt(data.totalBalance)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: `${colors.status.success}15`,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="trending-up" size={14} color={colors.status.success} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.status.success }}>
                  {savingsRate.toFixed(0)}%
                </Text>
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${colors.status.success}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="arrow-down" size={18} color={colors.status.success} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: colors.text.tertiary,
                      letterSpacing: 0.3,
                    }}
                  >
                    INCOME
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.text.primary,
                      marginTop: 1,
                    }}
                  >
                    {fmt(data.monthlyIncome)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: 1,
                  height: 36,
                  backgroundColor: colors.border.subtle,
                  marginHorizontal: 12,
                }}
              />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${colors.status.error}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="arrow-up" size={18} color={colors.status.error} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: colors.text.tertiary,
                      letterSpacing: 0.3,
                    }}
                  >
                    SPENT
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.text.primary,
                      marginTop: 1,
                    }}
                  >
                    {fmt(data.monthlySpending)}
                  </Text>
                </View>
              </View>
            </View>
          </PremiumCard>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', paddingHorizontal: PADDING, marginTop: 20, gap: 12 }}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => navigation.navigate(a.route)}
              style={{ flex: 1, alignItems: 'center', gap: 8 }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: `${a.color}12`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary }}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Cards Grid */}
        <View style={{ paddingHorizontal: PADDING, marginTop: 28 }}>
          <SectionHeader title="Overview" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {overviewCards.map((card, i) => (
              <TouchableOpacity
                key={card.label}
                activeOpacity={0.85}
                onPress={() => {
                  const routes: Record<string, string> = {
                    Income: 'AddIncome',
                    Expenses: 'Transactions',
                    Savings: 'Goals',
                    Shared: 'SharedFinance',
                  };
                  navigation.navigate(routes[card.label] || 'Dashboard');
                }}
                style={{
                  width: (SCREEN_WIDTH - PADDING * 2 - 12) / 2,
                  backgroundColor: card.bg || colors.bg.card,
                  borderRadius: borderRadius.xl,
                  padding: 20,
                  ...shadows.sm,
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: `${card.color}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={card.icon} size={16} color={card.color} />
                  </View>
                  {card.sub && (
                    <View
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: `${card.color}15`,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: card.color }}>
                        {card.sub}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginBottom: 4,
                  }}
                >
                  {card.label}
                </Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '800',
                    color: colors.text.primary,
                    letterSpacing: -0.5,
                  }}
                >
                  {card.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Budget Progress */}
        {data.monthlyBudget > 0 && (
          <View style={{ paddingHorizontal: PADDING, marginTop: 28 }}>
            <SectionHeader
              title="Budget"
              action="Details"
              onAction={() => navigation.navigate('Budgets')}
              icon="wallet"
            />
            <PremiumCard variant="default">
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                    Monthly Budget
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: colors.text.tertiary,
                      marginTop: 2,
                    }}
                  >
                    {fmt(data.monthlyBudget)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor:
                      spendPct > 85 ? `${colors.status.error}15` : `${colors.accent.primary}15`,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: spendPct > 85 ? colors.status.error : colors.accent.primary,
                    }}
                  >
                    {spendPct.toFixed(0)}% used
                  </Text>
                </View>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: colors.bg.tertiary,
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${Math.min(spendPct, 100)}%`,
                    backgroundColor: spendPct > 85 ? colors.status.error : colors.accent.primary,
                  }}
                />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                {spendLabel}
              </Text>
            </PremiumCard>
          </View>
        )}

        {/* Spending by Category */}
        {data.categories.length > 0 && (
          <View style={{ paddingHorizontal: PADDING, marginTop: 28 }}>
            <SectionHeader
              title="Spending by Category"
              action="Reports"
              onAction={() => navigation.navigate('Reports')}
              icon="pie-chart"
            />
            <View style={{ gap: 2 }}>
              {data.categories.slice(0, 5).map((cat: any, i: number) => {
                const name = cat.category || cat.name || 'Other';
                const amount = cat.amount || cat.total || 0;
                const pct = data.monthlySpending > 0 ? (amount / data.monthlySpending) * 100 : 0;
                const catColor = getCategoryColor(name);
                return (
                  <View
                    key={name + i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: colors.bg.card,
                      borderRadius: borderRadius.md,
                      marginBottom: 4,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: `${catColor}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={getIcon(name)} size={18} color={catColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
                        >
                          {name}
                        </Text>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}
                        >
                          {fmtShort(amount)}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 4,
                          backgroundColor: colors.bg.tertiary,
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: catColor,
                          }}
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
        <View style={{ paddingHorizontal: PADDING, marginTop: 28 }}>
          <SectionHeader
            title="Recent Transactions"
            action="View All"
            onAction={() => navigation.navigate('Transactions')}
            icon="receipt"
          />
          {data.recentTransactions.length > 0 ? (
            <View style={{ gap: 4 }}>
              {data.recentTransactions.map((tx: any, i: number) => {
                const isIncome = tx.type === 'income';
                const amount = Number(tx.amount || 0);
                const txColor = isIncome ? colors.status.success : colors.status.error;
                const catName = tx.category || tx.categoryName || 'Other';
                const catColor = getCategoryColor(catName);
                return (
                  <TouchableOpacity
                    key={tx.id || i}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('TransactionDetail', { transactionId: tx.id })
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: colors.bg.card,
                      borderRadius: borderRadius.md,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: `${catColor}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={getIcon(catName)} size={20} color={catColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
                        numberOfLines={1}
                      >
                        {tx.description || tx.note || catName}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                      >
                        <Text
                          style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}
                        >
                          {fmtDate(tx.date || tx.createdAt)}
                        </Text>
                        {tx.paymentMode && (
                          <>
                            <Text style={{ fontSize: 10, color: colors.text.tertiary }}>·</Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '500',
                                color: colors.text.tertiary,
                              }}
                            >
                              {tx.paymentMode}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: txColor }}>
                      {isIncome ? '+' : '-'}
                      {fmt(amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <PremiumEmptyState
              icon="receipt-outline"
              title="No transactions yet"
              message="Add your first expense or income to start tracking your finances"
            />
          )}
        </View>

        {/* Shared Groups */}
        {data.sharedGroups.length > 0 && (
          <View style={{ paddingHorizontal: PADDING, marginTop: 28 }}>
            <SectionHeader
              title="Shared Spaces"
              action="View All"
              onAction={() => navigation.navigate('SharedFinance')}
              icon="people"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {data.sharedGroups.slice(0, 5).map((group: any) => {
                const type = group.type || 'default';
                const config: Record<
                  string,
                  { icon: keyof typeof Ionicons.glyphMap; color: string }
                > = {
                  couple: { icon: 'heart', color: '#FF6B9D' },
                  family: { icon: 'home', color: colors.accent.primary },
                  friends: { icon: 'people', color: '#60A5FA' },
                  trip: { icon: 'airplane', color: '#10B981' },
                  default: { icon: 'people', color: colors.accent.primary },
                };
                const c = config[type] || config.default;
                return (
                  <TouchableOpacity
                    key={group.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('SharedGroupDetail', { groupId: group.id })}
                    style={{
                      backgroundColor: `${c.color}10`,
                      borderRadius: borderRadius.xl,
                      padding: 20,
                      width: 140,
                      gap: 10,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: `${c.color}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={c.icon} size={22} color={c.color} />
                    </View>
                    <Text
                      style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}
                      numberOfLines={1}
                    >
                      {group.name}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.tertiary }}>
                      {group.balance ? fmtShort(group.balance) : 'Settled'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddExpense')}
        style={[s.fab, { backgroundColor: colors.accent.primary }, fabShadow]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: PADDING,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
