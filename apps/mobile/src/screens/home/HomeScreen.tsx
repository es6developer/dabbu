import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { QuickActionSheet } from '../../components/ui/QuickActionSheet';

const SCREEN_WIDTH = Dimensions.get('window').width;

type IconName = keyof typeof Ionicons.glyphMap;

interface DashboardData {
  accountStats: any | null;
  transactionStats: any | null;
  categories: any[];
  expenseGroups: any[];
  reminders: any[];
  goals: any[];
  sharedGroups: any[];
  financialHealth: any | null;
  smartInsights: any[];
  subscriptionIntel: any | null;
  gamification: any | null;
}

const emptyData: DashboardData = {
  accountStats: null,
  transactionStats: null,
  categories: [],
  expenseGroups: [],
  reminders: [],
  goals: [],
  sharedGroups: [],
  financialHealth: null,
  smartInsights: [],
  subscriptionIntel: null,
  gamification: null,
};

function valueFromResult<T>(result: PromiseSettledResult<any>, fallback: T): T {
  return result.status === 'fulfilled' ? (result.value?.data ?? result.value) : fallback;
}

function listFromResponse(res: any): any[] {
  if (!res) {
    return [];
  }
  if (Array.isArray(res)) {
    return res;
  }
  if (res.items) {
    return Array.isArray(res.items) ? res.items : [];
  }
  return [];
}

function moneyFormat(v: number | string | undefined | null): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return n < 0
    ? `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) {
    return '';
  }
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function pct(v: number): string {
  return `${Math.round(v)}%`;
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface QuickActionItem {
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuth();
  const { trackScreen, trackFeature } = useAnalytics();

  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await api.get<any>('/user/preferences');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    api
      .get<any>('/premium/check')
      .then((res) => {
        if (res?.isPremium) {
          setIsPremium(true);
        }
      })
      .catch(() => {});
    api
      .get<any>('/notifications')
      .then((res) => {
        const list = listFromResponse(res);
        setUnreadNotifications(list.filter((n: any) => !n.read).length);
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    if (accessToken) {
      setAccessToken(accessToken);
    }
    fadeAnim.setValue(0);

    try {
      const results = await Promise.allSettled([
        api.get<any>('/accounts/stats', signal),
        api.get<any>('/transactions/stats', signal),
        api.get<any>('/transactions/categories-summary?months=1', signal),
        api.get<any>('/expense-groups', signal),
        api.get<any>('/reminders', signal),
        api.get<any>('/goals', signal),
        api.get<any>('/shared-finance/groups', signal),
        api.get<any>('/accounts/financial-health', signal),
        api.get<any>('/accounts/smart-insights', signal),
        api.get<any>('/accounts/subscriptions', signal),
        api.get<any>('/gamification', signal),
      ]);

      if (signal.aborted) {
        return;
      }

      setData({
        accountStats: valueFromResult(results[0], null),
        transactionStats: valueFromResult(results[1], null),
        categories: listFromResponse(valueFromResult(results[2], [])),
        expenseGroups: listFromResponse(valueFromResult(results[3], [])),
        reminders: listFromResponse(valueFromResult(results[4], [])),
        goals: listFromResponse(valueFromResult(results[5], [])),
        sharedGroups: listFromResponse(valueFromResult(results[6], [])),
        financialHealth: valueFromResult(results[7], null),
        smartInsights: listFromResponse(valueFromResult(results[8], [])),
        subscriptionIntel: valueFromResult(results[9], null),
        gamification: valueFromResult(results[10], null),
      });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessToken, fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences]),
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      trackScreen('Home');
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const balance = data.accountStats?.availableBalance ?? data.accountStats?.totalBalance ?? 0;
  const totalIncome = data.accountStats?.totalIncome ?? 0;
  const totalSpent = data.transactionStats?.totalExpenses ?? 0;
  const savings = totalIncome - totalSpent;
  const spendRate = totalIncome > 0 ? Math.min((totalSpent / totalIncome) * 100, 100) : 0;

  const goalsData = data.goals || [];
  const totalTarget = goalsData.reduce((s: number, g: any) => s + Number(g.targetAmount), 0);
  const totalSavedAll = goalsData.reduce((s: number, g: any) => s + Number(g.currentAmount), 0);
  const goalsOverallPct = totalTarget > 0 ? (totalSavedAll / totalTarget) * 100 : 0;

  const billsData =
    data.reminders?.filter((r: any) => r.type === 'bill' || r.type === 'subscription') || [];
  const upcomingBills = billsData.filter((b: any) => {
    if (!b.dueDate) {
      return false;
    }
    const d = daysUntil(b.dueDate);
    return d >= -1 && d <= 15;
  });

  const sharedGroupsData = data.sharedGroups || [];
  const coupleFamilyGroups = sharedGroupsData.filter(
    (g: any) => g.type === 'couple' || g.type === 'family',
  );

  const gamification = data.gamification;
  const badges = gamification?.badges || [];
  const earnedBadges = badges.filter((b: any) => b.isEarned);
  const streaks = gamification?.streaks || [];

  const quickActions: QuickActionItem[] = [
    {
      label: 'Add Expense',
      icon: 'add-circle-outline',
      color: '#00A86B',
      onPress: () => {
        trackFeature('Expense', 'add');
        navigation.navigate('Accounts', { screen: 'CreateTransaction' });
      },
    },
    {
      label: 'Scan Bill',
      icon: 'scan-outline',
      color: '#E85D04',
      onPress: () => {
        trackFeature('Bill', 'scan');
        navigation.navigate('Accounts', { screen: 'BillScanner' });
      },
    },
    {
      label: 'New Group',
      icon: 'people-outline',
      color: '#5B5FE8',
      onPress: () => {
        trackFeature('Split', 'create');
        navigation.navigate('Shared', { screen: 'CreateSharedGroup' });
      },
    },
    {
      label: 'Transfer',
      icon: 'swap-horizontal-outline',
      color: '#8A5CF6',
      onPress: () => {
        trackFeature('Transfer', 'open');
        navigation.navigate('Shared', { screen: 'WalletTransfer' });
      },
    },
    {
      label: 'Document',
      icon: 'folder-open-outline',
      color: '#F7892C',
      onPress: () => {
        trackFeature('Documents', 'upload');
        navigation.navigate('DocumentVault');
      },
    },
    {
      label: 'Reminder',
      icon: 'alarm-outline',
      color: '#0B84A5',
      onPress: () => {
        trackFeature('Reminder', 'create');
        navigation.navigate('Reminders', { screen: 'CreateReminder' });
      },
    },
  ];

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          <View style={{ gap: 12, marginTop: 60 }}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonBlock,
                  {
                    backgroundColor: colors.skeleton.base,
                    height: i === 1 ? 200 : i === 2 ? 120 : 80,
                  },
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.screen, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={colors.accent.primary}
            />
          }
        >
          {/* ─── Welcome Header ─────────────────────────── */}
          <LinearGradient
            colors={isDark ? ['#1A0A2E', '#2D1B4E'] : ['#F7892C', '#F9A44A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 20 }}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.headerAvatar}
                onPress={() => navigation.navigate('Settings', { screen: 'Profile' })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarCircle}
                >
                  <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
                </LinearGradient>
                <View style={styles.headerGreeting}>
                  <Text style={styles.greetingText}>
                    Good{' '}
                    {new Date().getHours() < 12
                      ? 'Morning'
                      : new Date().getHours() < 18
                        ? 'Afternoon'
                        : 'Evening'}
                  </Text>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {user?.firstName || 'User'}!
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.headerRight}>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="diamond" size={10} color="#F7892C" />
                    <Text style={styles.premiumBadgeText}>PRO</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.notifBtn}
                  onPress={() => navigation.navigate('Notifications')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={22} color="#FFF" />
                  {unreadNotifications > 0 && (
                    <View style={styles.notifDot}>
                      <Text style={styles.notifDotText}>
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* ─── Financial Overview Card ────────────────── */}
          <View
            style={[styles.overviewCard, { backgroundColor: colors.bg.secondary, marginTop: -20 }]}
          >
            <View style={styles.overviewHeader}>
              <Text style={[styles.overviewLabel, { color: colors.text.tertiary }]}>
                Available Balance
              </Text>
              <View
                style={[
                  styles.trendBadge,
                  { backgroundColor: savings >= 0 ? '#00B89418' : '#FF6B6B18' },
                ]}
              >
                <Ionicons
                  name={savings >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={savings >= 0 ? '#00B894' : '#FF6B6B'}
                />
                <Text style={[styles.trendText, { color: savings >= 0 ? '#00B894' : '#FF6B6B' }]}>
                  {savings >= 0 ? '+' : ''}
                  {moneyFormat(savings)}
                </Text>
              </View>
            </View>
            <Text style={styles.balanceAmount}>{moneyFormat(balance)}</Text>

            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Income</Text>
                <Text style={[styles.statValue, { color: '#00B894' }]}>
                  {moneyFormat(totalIncome)}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.overviewStat}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Spent</Text>
                <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
                  {moneyFormat(totalSpent)}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.overviewStat}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Savings</Text>
                <Text style={[styles.statValue, { color: savings >= 0 ? '#00B894' : '#FF6B6B' }]}>
                  {moneyFormat(Math.abs(savings))}
                </Text>
              </View>
            </View>

            <View style={[styles.overviewBar, { backgroundColor: colors.bg.tertiary }]}>
              <View
                style={[
                  styles.overviewBarFill,
                  {
                    width: `${spendRate}%`,
                    backgroundColor:
                      spendRate > 80 ? '#FF6B6B' : spendRate > 50 ? '#FDCB6E' : '#00B894',
                  },
                ]}
              />
            </View>
            <Text style={[styles.overviewBarLabel, { color: colors.text.tertiary }]}>
              {pct(spendRate)} of income spent this month
            </Text>

            {/* Quick action chips */}
            <View style={styles.chipRow}>
              {quickActions.slice(0, 4).map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, { backgroundColor: colors.bg.tertiary }]}
                  activeOpacity={0.7}
                  onPress={action.onPress}
                >
                  <Ionicons name={action.icon} size={14} color={action.color} />
                  <Text style={[styles.chipLabel, { color: colors.text.secondary }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── Financial Health ──────────────────────── */}
          {data.financialHealth && (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.secondary }]}
              activeOpacity={0.7}
              onPress={() => {}}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: '#5B5FE818' }]}>
                    <Ionicons name="heart-circle" size={18} color="#5B5FE8" />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                    Financial Health
                  </Text>
                </View>
                <View style={[styles.healthCircle, { borderColor: data.financialHealth.color }]}>
                  <Text style={[styles.healthScore, { color: data.financialHealth.color }]}>
                    {data.financialHealth.score}
                  </Text>
                </View>
              </View>
              <Text style={[styles.healthLabel, { color: data.financialHealth.color }]}>
                {data.financialHealth.label}
              </Text>
              {data.financialHealth.factors?.slice(0, 3).map((f: any, i: number) => {
                const barColor =
                  f.status === 'good' ? '#00B894' : f.status === 'fair' ? '#FDCB6E' : '#FF6B6B';
                return (
                  <View key={i} style={styles.factorRow}>
                    <Text style={[styles.factorName, { color: colors.text.tertiary }]}>
                      {f.name}
                    </Text>
                    <View style={[styles.factorBar, { backgroundColor: colors.bg.tertiary }]}>
                      <View
                        style={[
                          styles.factorFill,
                          { width: `${(f.score / f.maxScore) * 100}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.factorScore, { color: barColor }]}>
                      {f.score}/{f.maxScore}
                    </Text>
                  </View>
                );
              })}
            </TouchableOpacity>
          )}

          {/* ─── Smart Insights (horizontal scroll) ────── */}
          {data.smartInsights.length > 0 && (
            <View style={{ paddingLeft: 16, marginTop: 12 }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: '#74B9FF18' }]}>
                    <Ionicons name="bulb" size={18} color="#74B9FF" />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Insights</Text>
                </View>
                <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>
                  {data.smartInsights.length}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
              >
                {data.smartInsights.map((insight: any, i: number) => {
                  const sevColor =
                    insight.severity === 'critical'
                      ? '#FF6B6B'
                      : insight.severity === 'warning'
                        ? '#FDCB6E'
                        : '#00B894';
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.insightCard,
                        { backgroundColor: colors.bg.secondary, borderLeftColor: sevColor },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.insightTitle, { color: colors.text.primary }]}>
                        {insight.title}
                      </Text>
                      <Text
                        style={[styles.insightDesc, { color: colors.text.tertiary }]}
                        numberOfLines={2}
                      >
                        {insight.message}
                      </Text>
                      <View style={[styles.insightTag, { backgroundColor: `${sevColor}18` }]}>
                        <Text style={[styles.insightTagText, { color: sevColor }]}>
                          {insight.severity || 'info'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── Active Goals ──────────────────────────── */}
          {goalsData.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <TouchableOpacity onPress={() => navigation.navigate('GoalsList')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardIcon, { backgroundColor: '#FDCB6E18' }]}>
                      <Ionicons name="trophy" size={18} color="#FDCB6E" />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                      Active Goals
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
              {goalsData.slice(0, 2).map((goal: any) => {
                const pctVal =
                  Number(goal.targetAmount) > 0
                    ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100
                    : 0;
                return (
                  <View key={goal.id} style={styles.goalRow}>
                    <View style={styles.goalInfo}>
                      <Text
                        style={[styles.goalName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {goal.name}
                      </Text>
                      <Text style={[styles.goalMeta, { color: colors.text.tertiary }]}>
                        {moneyFormat(goal.currentAmount)} / {moneyFormat(goal.targetAmount)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.goalPct,
                        { color: pctVal >= 100 ? '#00B894' : colors.accent.primary },
                      ]}
                    >
                      {pct(pctVal)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Upcoming Bills & Reminders ────────────── */}
          {upcomingBills.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Accounts', { screen: 'BillsList' })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardIcon, { backgroundColor: '#FF6B6B18' }]}>
                      <Ionicons name="receipt" size={18} color="#FF6B6B" />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                      Upcoming Bills
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>
                      {upcomingBills.length}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                  </View>
                </View>
              </TouchableOpacity>
              {upcomingBills.slice(0, 3).map((bill: any) => {
                const dDays = daysUntil(bill.dueDate);
                const isUrgent = dDays <= 2;
                return (
                  <View
                    key={bill.id}
                    style={[
                      styles.billRow,
                      { backgroundColor: isUrgent ? '#FF6B6B08' : 'transparent' },
                    ]}
                  >
                    <View
                      style={[
                        styles.billDot,
                        { backgroundColor: isUrgent ? '#FF6B6B' : colors.accent.primary },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.billName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {bill.title || bill.name}
                      </Text>
                      <Text
                        style={[
                          styles.billDue,
                          { color: isUrgent ? '#FF6B6B' : colors.text.tertiary },
                        ]}
                      >
                        {dDays <= 0
                          ? 'Overdue'
                          : dDays === 0
                            ? 'Today'
                            : dDays === 1
                              ? 'Tomorrow'
                              : `In ${dDays} days`}
                      </Text>
                    </View>
                    <Text style={[styles.billAmount, { color: colors.text.primary }]}>
                      {moneyFormat(bill.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Shared Finance Summary ────────────────── */}
          {sharedGroupsData.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Shared', { screen: 'SharedFinanceHome' })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardIcon, { backgroundColor: '#5B5FE818' }]}>
                      <Ionicons name="people" size={18} color="#5B5FE8" />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                      Shared Finance
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 4 }}
              >
                {sharedGroupsData.slice(0, 6).map((group: any) => {
                  const typeColors: Record<string, string> = {
                    couple: '#FF6B9D',
                    family: '#5B5FE8',
                    friends: '#00B894',
                    trip: '#FDCB6E',
                    roommates: '#F7892C',
                  };
                  const color = typeColors[group.type] || colors.accent.primary;
                  const members = group.members?.length || group._count?.members || 0;
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.sharedCard, { backgroundColor: colors.bg.tertiary }]}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('Shared', {
                          screen:
                            group.type === 'couple'
                              ? 'CoupleFinance'
                              : group.type === 'family'
                                ? 'FamilyDashboard'
                                : 'SharedGroupDetail',
                          params: { groupId: group.id },
                        })
                      }
                    >
                      <View style={[styles.sharedIcon, { backgroundColor: `${color}18` }]}>
                        <Ionicons
                          name={
                            group.type === 'couple'
                              ? 'heart'
                              : group.type === 'family'
                                ? 'home'
                                : 'people'
                          }
                          size={18}
                          color={color}
                        />
                      </View>
                      <Text
                        style={[styles.sharedName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {group.name || group.title}
                      </Text>
                      <Text style={[styles.sharedMeta, { color: colors.text.tertiary }]}>
                        {members} {members === 1 ? 'member' : 'members'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── Recent Activity ───────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIcon, { backgroundColor: '#00B89418' }]}>
                  <Ionicons name="time" size={18} color="#00B894" />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                  Recent Activity
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Accounts', { screen: 'ExpenseHome' })}
              >
                <Text style={[styles.seeAllText, { color: colors.accent.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {data.transactionStats?.recentTransactions?.length > 0 ? (
              data.transactionStats.recentTransactions.slice(0, 5).map((tx: any) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.activityRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('Accounts', {
                      screen: 'TransactionDetail',
                      params: { transactionId: tx.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: Number(tx.amount) > 0 ? '#00B89418' : '#FF6B6B18' },
                    ]}
                  >
                    <Ionicons
                      name={Number(tx.amount) > 0 ? 'arrow-down' : 'arrow-up'}
                      size={14}
                      color={Number(tx.amount) > 0 ? '#00B894' : '#FF6B6B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.activityName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {tx.description || tx.category || 'Transaction'}
                    </Text>
                    <Text style={[styles.activityDate, { color: colors.text.tertiary }]}>
                      {fmtDate(tx.date || tx.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.activityAmount,
                      { color: Number(tx.amount) > 0 ? '#00B894' : colors.text.primary },
                    ]}
                  >
                    {moneyFormat(Math.abs(Number(tx.amount)))}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={32} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  Start your financial journey
                </Text>
                <Text style={{ color: colors.text.tertiary, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                  Track your first expense and discover how Dabbu helps you understand your money better.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={() => navigation.navigate('Accounts', { screen: 'CreateTransaction' })}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.emptyBtnText}>Add your first expense</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* ─── FAB ──────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent.primary,
            shadowColor: colors.accent.primary,
            bottom: insets.bottom + 80,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => setShowActions(true)}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <QuickActionSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        actions={quickActions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  skeletonBlock: { borderRadius: 16, marginBottom: 4 },

  // Welcome Header
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerGreeting: { gap: 1 },
  greetingText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  nameText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifDotText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  // Financial Overview Card
  overviewCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    marginBottom: 4,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overviewLabel: { fontSize: 12, fontWeight: '500' },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: { fontSize: 11, fontWeight: '700' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFF', marginBottom: 16 },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  overviewStat: { flex: 1 },
  statLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 32 },
  overviewBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  overviewBarFill: { height: '100%', borderRadius: 2 },
  overviewBarLabel: { fontSize: 10, fontWeight: '500', marginBottom: 12 },

  // Action Chips
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipLabel: { fontSize: 11, fontWeight: '600' },

  // Cards
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 12, fontWeight: '600' },

  // Financial Health
  healthCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScore: { fontSize: 16, fontWeight: '800' },
  healthLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  factorName: { width: 80, fontSize: 11, fontWeight: '500' },
  factorBar: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 3 },
  factorScore: { fontSize: 10, fontWeight: '600', width: 30, textAlign: 'right' },

  // Insights
  insightCard: {
    width: SCREEN_WIDTH * 0.65,
    padding: 14,
    borderRadius: 16,
    marginRight: 10,
    borderLeftWidth: 3,
  },
  insightTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  insightDesc: { fontSize: 11, lineHeight: 15, marginBottom: 8 },
  insightTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  insightTagText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  // Goals
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 13, fontWeight: '600' },
  goalMeta: { fontSize: 11, marginTop: 1 },
  goalPct: { fontSize: 14, fontWeight: '800' },

  // Bills
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  billDot: { width: 6, height: 6, borderRadius: 3 },
  billName: { fontSize: 13, fontWeight: '600' },
  billDue: { fontSize: 11, marginTop: 1 },
  billAmount: { fontSize: 14, fontWeight: '700' },

  // Shared Finance
  sharedCard: {
    width: 140,
    padding: 14,
    borderRadius: 16,
    marginRight: 10,
    alignItems: 'center',
    gap: 6,
  },
  sharedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sharedMeta: { fontSize: 10, fontWeight: '500' },

  // Recent Activity
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: { fontSize: 13, fontWeight: '600' },
  activityDate: { fontSize: 11, marginTop: 1 },
  activityAmount: { fontSize: 14, fontWeight: '700' },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
});
