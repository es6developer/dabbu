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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';

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

type MintSnap = { icon: IconName; label: string; value: string; color: string };

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
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data) return Array.isArray(res.data) ? res.data : [];
  if (res.items) return Array.isArray(res.items) ? res.items : [];
  return [];
}

function moneyFormat(v: number | string | undefined | null): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return n < 0
    ? `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function pct(v: number): string {
  return `${Math.round(v)}%`;
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function MoneyStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.moneyStat}>
      <Text style={[styles.moneyStatLabel, { color: colors.text.tertiary }]}>{label}</Text>
      <Text style={[styles.moneyStatValue, { color: color || colors.text.primary }]}>{value}</Text>
    </View>
  );
}

function SnapshotCard({ title, value, detail, icon, color, onPress }: any) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.snapCard, { backgroundColor: colors.bg.secondary }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.snapIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.snapTitle, { color: colors.text.secondary }]}>{title}</Text>
      <Text style={[styles.snapValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.snapDetail, { color: colors.text.tertiary }]}>{detail}</Text>
    </TouchableOpacity>
  );
}

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();
  const { trackScreen, trackFeature } = useAnalytics();

  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await api.get<any>('/user/preferences');
      const layout: any[] = res?.dashboardLayout || [];
      const sorted = layout.sort((a: any, b: any) => a.order - b.order);
      setWidgetOrder(sorted.filter((w: any) => w.visible).map((w: any) => w.id));
    } catch {
      setWidgetOrder([
        'balance',
        'quickActions',
        'financialHealth',
        'monthlySpending',
        'savingsProgress',
        'goals',
        'upcomingBills',
        'subscriptions',
        'insights',
        'gamification',
        'sharedCircles',
        'familySummary',
        'snapshots',
        'recentActivity',
      ]);
    }
  }, []);

  const loadData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    if (accessToken) setAccessToken(accessToken);
    fadeAnim.setValue(0);

    try {
      const [
        accountStats,
        txStats,
        categories,
        expenseGroups,
        reminders,
        goals,
        sharedGroups,
        financialHealth,
        smartInsights,
        subscriptionIntel,
        gamification,
      ] = await Promise.allSettled([
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

      if (signal.aborted) return;

      setData({
        accountStats: valueFromResult(accountStats, null),
        transactionStats: valueFromResult(txStats, null),
        categories: listFromResponse(valueFromResult(categories, [])),
        expenseGroups: listFromResponse(valueFromResult(expenseGroups, [])),
        reminders: listFromResponse(valueFromResult(reminders, [])),
        goals: listFromResponse(valueFromResult(goals, [])),
        sharedGroups: listFromResponse(valueFromResult(sharedGroups, [])),
        financialHealth: valueFromResult(financialHealth, null),
        smartInsights: listFromResponse(valueFromResult(smartInsights, [])),
        subscriptionIntel: valueFromResult(subscriptionIntel, null),
        gamification: valueFromResult(gamification, null),
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
      trackScreen('Dashboard');
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  // ─── Derived Data ────────────────────────────────────────
  const balance = data.accountStats?.availableBalance ?? data.accountStats?.totalBalance ?? 0;
  const totalIncome = data.accountStats?.totalIncome ?? 0;
  const totalSpent = data.transactionStats?.totalExpenses ?? 0;

  const goalsData = data.goals || [];
  const totalTarget = goalsData.reduce((s: number, g: any) => s + Number(g.targetAmount), 0);
  const totalSavedAll = goalsData.reduce((s: number, g: any) => s + Number(g.currentAmount), 0);
  const goalsOverallPct = totalTarget > 0 ? (totalSavedAll / totalTarget) * 100 : 0;

  const billsData = data.reminders?.filter((r: any) => r.type === 'bill' || r.type === 'subscription') || [];
  const upcomingBills = billsData.filter((b: any) => {
    if (!b.dueDate) return false;
    const d = daysUntil(b.dueDate);
    return d >= -1 && d <= 15;
  });

  const spacesData = data.expenseGroups || [];
  const sharedGroupsData = data.sharedGroups || [];
  const coupleFamilyGroups = sharedGroupsData.filter(
    (g: any) => g.type === 'couple' || g.type === 'family',
  );

  const gamification = data.gamification;
  const badges = gamification?.badges || [];
  const streaks = gamification?.streaks || [];
  const earnedBadges = badges.filter((b: any) => b.isEarned);

  const spendRate =
    totalIncome > 0 ? Math.min((totalSpent / totalIncome) * 100, 100) : 0;

  const topCategory = data.categories?.[0];
  const monthlySpendingTotal = data.categories?.reduce(
    (s: number, c: any) => s + Number(c.amount || c.total || 0),
    0,
  );

  const snapshots: MintSnap[] = [
    {
      icon: 'trending-up',
      label: 'Top Spend',
      value: topCategory ? topCategory.name || topCategory.category : '—',
      color: '#FF6B6B',
    },
    {
      icon: 'people',
      label: 'Groups',
      value: `${sharedGroupsData.length}`,
      color: '#5B5FE8',
    },
  ];

  const primaryActions = [
    {
      label: 'Add Expense',
      icon: 'add-circle-outline' as IconName,
      color: '#00A86B',
      onPress: () => {
        trackFeature('Expense', 'add');
        navigation.navigate('Accounts', { screen: 'CreateTransaction' });
      },
    },
    {
      label: 'Scan Bill',
      icon: 'scan-outline' as IconName,
      color: '#E85D04',
      onPress: () => {
        trackFeature('Bill', 'scan');
        navigation.navigate('Accounts', { screen: 'BillScanner' });
      },
    },
    {
      label: 'Split Group',
      icon: 'people-outline' as IconName,
      color: '#5B5FE8',
      onPress: () => {
        trackFeature('Split', 'group');
        navigation.navigate('Shared', { screen: 'SharedFinanceHome' });
      },
    },
    {
      label: 'Reminder',
      icon: 'alarm-outline' as IconName,
      color: '#0B84A5',
      onPress: () => {
        trackFeature('Reminder', 'create');
        navigation.navigate('Reminders', { screen: 'CreateReminder' });
      },
    },
    {
      label: 'Document Vault',
      icon: 'folder-open-outline' as IconName,
      color: '#8A5CF6',
      onPress: () => {
        trackFeature('Documents', 'open');
        navigation.navigate('DocumentVault');
      },
    },
    {
      label: 'Goals',
      icon: 'trophy-outline' as IconName,
      color: '#F7892C',
      onPress: () => {
        trackFeature('Goals', 'view');
        navigation.navigate('GoalsList');
      },
    },
  ];

  // ─── Widget visibility helper ────────────────────────────
  function show(id: string) {
    return !widgetOrder.length || widgetOrder.includes(id);
  }

  // ─── Loading State ───────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          <View style={{ gap: 12, marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonBlock,
                  {
                    backgroundColor: colors.skeleton.base,
                    height: i === 1 ? 180 : i === 2 ? 100 : 80,
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
    <Animated.View style={[styles.screen, { backgroundColor: colors.bg.primary, opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
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
        {/* ─── Balance Panel ─────────────────────────────── */}
        {show('balance') && (
          <LinearGradient
            colors={isDark ? ['#1A0A2E', '#2D1B4E'] : ['#F7892C', '#F9A44A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.balanceCard, { paddingTop: insets.top + 20 }]}
          >
            <Text style={[styles.balanceEyebrow, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)' }]}>
              Available Balance
            </Text>
            <Text style={styles.balanceAmount}>{moneyFormat(balance)}</Text>

            <View style={styles.balanceMeta}>
              <View style={[styles.balanceBadge, { backgroundColor: totalSpent <= totalIncome ? 'rgba(0,184,148,0.2)' : 'rgba(255,107,107,0.2)' }]}>
                <Ionicons
                  name={totalSpent <= totalIncome ? 'trending-down' : 'trending-up'}
                  size={12}
                  color={totalSpent <= totalIncome ? '#00B894' : '#FF6B6B'}
                />
                <Text
                  style={[
                    styles.balanceBadgeText,
                    { color: totalSpent <= totalIncome ? '#00B894' : '#FF6B6B' },
                  ]}
                >
                  {totalSpent <= totalIncome ? 'Under budget' : 'Over budget'}
                </Text>
              </View>
            </View>

            <View style={styles.balanceStats}>
              <MoneyStat label="Income" value={moneyFormat(totalIncome)} color="#00B894" />
              <MoneyStat label="Spent" value={moneyFormat(totalSpent)} color="#FF6B6B" />
              <MoneyStat label="Rate" value={pct(spendRate)} />
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${spendRate}%`, backgroundColor: totalSpent <= totalIncome ? '#00B894' : '#FF6B6B' },
                ]}
              />
            </View>
          </LinearGradient>
        )}

        {/* ─── Quick Actions ─────────────────────────────── */}
        {show('quickActions') && (
          <View style={styles.actionRow}>
            {primaryActions.slice(0, 4).map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionItem, { backgroundColor: colors.bg.secondary }]}
                onPress={action.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.secondary }]} numberOfLines={2}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── Financial Health Score ───────────────────── */}
        {show('financialHealth') && data.financialHealth && (
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}
            activeOpacity={0.7}
            onPress={() => {/* future detail screen */}}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
                  <Ionicons name="heart-circle" size={18} color={colors.accent.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Financial Health</Text>
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
              const barColor = f.status === 'good' ? '#00B894' : f.status === 'fair' ? '#FDCB6E' : '#FF6B6B';
              return (
                <View key={i} style={styles.factorRow}>
                  <Text style={[styles.factorName, { color: colors.text.tertiary }]}>{f.name}</Text>
                  <View style={[styles.factorBar, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[styles.factorFill, { width: `${(f.score / f.maxScore) * 100}%`, backgroundColor: barColor }]}
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

        {/* ─── Monthly Spending ─────────────────────────── */}
        {show('monthlySpending') && data.categories?.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#00B89418' }]}>
                  <Ionicons name="pie-chart" size={18} color="#00B894" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Monthly Spending</Text>
              </View>
              <Text style={[styles.sectionMeta, { color: colors.text.tertiary }]}>
                {moneyFormat(monthlySpendingTotal)}
              </Text>
            </View>
            {data.categories.slice(0, 5).map((cat: any, i: number) => {
              const amt = Number(cat.amount || cat.total || 0);
              const pctVal = monthlySpendingTotal > 0 ? (amt / monthlySpendingTotal) * 100 : 0;
              const catColors = ['#F7892C', '#00B894', '#5B5FE8', '#FF6B6B', '#FDCB6E'];
              return (
                <View key={i} style={styles.catRow}>
                  <Text style={[styles.catName, { color: colors.text.primary }]} numberOfLines={1}>
                    {cat.name || cat.category}
                  </Text>
                  <View style={[styles.catBar, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        styles.catFill,
                        { width: `${pctVal}%`, backgroundColor: catColors[i % catColors.length] },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catAmount, { color: colors.text.secondary }]}>{moneyFormat(amt)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── Savings Progress ─────────────────────────── */}
        {show('savingsProgress') && goalsData.length > 0 && (
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('GoalsList')}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#5B5FE818' }]}>
                  <Ionicons name="wallet" size={18} color="#5B5FE8" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Savings Progress</Text>
              </View>
              <Text style={[styles.sectionMeta, { color: colors.text.tertiary }]}>
                {moneyFormat(totalSavedAll)} / {moneyFormat(totalTarget)}
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.bg.tertiary, marginTop: 4 }]}>
              <View
                style={[styles.progressBarFill, { width: `${goalsOverallPct}%`, backgroundColor: '#5B5FE8' }]}
              />
            </View>
            <Text style={[styles.sectionSub, { color: colors.text.tertiary, marginTop: 6 }]}>
              {pct(goalsOverallPct)} overall · {goalsData.length} goal{goalsData.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Goals Cards ──────────────────────────────── */}
        {show('goals') &&
          goalsData.length > 0 && (
            <View style={styles.goalsRow}>
              {goalsData.slice(0, 2).map((goal: any) => {
                const pctVal = Number(goal.targetAmount) > 0 ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalMini, { backgroundColor: colors.bg.secondary }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('GoalsList')}
                  >
                    <Text style={[styles.goalMiniName, { color: colors.text.primary }]} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.bg.tertiary, marginVertical: 6 }]}>
                      <View
                        style={[styles.progressBarFill, { width: `${pctVal}%`, backgroundColor: colors.accent.primary }]}
                      />
                    </View>
                    <Text style={[styles.goalMiniMeta, { color: colors.text.tertiary }]}>
                      {moneyFormat(goal.currentAmount)} / {moneyFormat(goal.targetAmount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

        {/* ─── Upcoming Bills ───────────────────────────── */}
        {show('upcomingBills') && upcomingBills.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FF6B6B18' }]}>
                  <Ionicons name="receipt" size={18} color="#FF6B6B" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Upcoming Bills</Text>
              </View>
              <Text style={[styles.sectionMeta, { color: colors.text.tertiary }]}>{upcomingBills.length}</Text>
            </View>
            {upcomingBills.slice(0, 4).map((bill: any) => (
              <View key={bill.id} style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.billName, { color: colors.text.primary }]} numberOfLines={1}>
                    {bill.title || bill.name}
                  </Text>
                  <Text style={[styles.billDue, { color: colors.text.tertiary }]}>
                    Due {fmtDate(bill.dueDate)}
                  </Text>
                </View>
                <Text style={[styles.billAmount, { color: bill.amount > 5000 ? '#FF6B6B' : colors.text.primary }]}>
                  {moneyFormat(bill.amount)}
                </Text>
              </View>
            ))}
            {upcomingBills.length > 4 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Accounts', { screen: 'BillsList' })}
              >
                <Text style={[styles.seeAll, { color: colors.accent.primary }]}>
                  +{upcomingBills.length - 4} more
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── Subscription Summary ─────────────────────── */}
        {show('subscriptions') && data.subscriptionIntel && (
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Accounts', { screen: 'Subscriptions' })}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
                  <Ionicons name="card" size={18} color={colors.accent.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Subscriptions</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
            </View>
            <View style={styles.subStats}>
              <View style={styles.subStat}>
                <Text style={[styles.subStatLabel, { color: colors.text.tertiary }]}>Monthly</Text>
                <Text style={[styles.subStatValue, { color: colors.text.primary }]}>
                  {moneyFormat(data.subscriptionIntel.monthlyTotal || 0)}
                </Text>
              </View>
              <View style={[styles.subDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.subStat}>
                <Text style={[styles.subStatLabel, { color: colors.text.tertiary }]}>Yearly</Text>
                <Text style={[styles.subStatValue, { color: colors.text.primary }]}>
                  {moneyFormat(data.subscriptionIntel.yearlyTotal || 0)}
                </Text>
              </View>
            </View>
            {data.subscriptionIntel.upcomingRenewals?.length > 0 && (
              <View style={[styles.subAlert, { backgroundColor: `${colors.status.warning}15` }]}>
                <Ionicons name="alert-circle" size={12} color={colors.status.warning} />
                <Text style={[styles.subAlertText, { color: colors.status.warning }]}>
                  {data.subscriptionIntel.upcomingRenewals.length} upcoming
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ─── Smart Insights ───────────────────────────── */}
        {show('insights') && data.smartInsights.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#74B9FF18' }]}>
                  <Ionicons name="bulb" size={18} color="#74B9FF" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Insights</Text>
              </View>
            </View>
            {data.smartInsights.slice(0, 3).map((insight: any, i: number) => {
              const sevColor =
                insight.severity === 'critical'
                  ? colors.status.error
                  : insight.severity === 'warning'
                    ? colors.status.warning
                    : colors.status.success;
              return (
                <TouchableOpacity key={i} style={styles.insightRow} activeOpacity={0.7}>
                  <View style={[styles.insightIcon, { backgroundColor: `${sevColor}18` }]}>
                    <Ionicons name={insight.icon || 'information-circle'} size={16} color={sevColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: colors.text.primary }]}>
                      {insight.title}
                    </Text>
                    <Text style={[styles.insightDesc, { color: colors.text.tertiary }]}>
                      {insight.message}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Gamification — Badges & Streaks ──────────── */}
        {show('gamification') && gamification && (
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('BadgeWall')}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FDCB6E18' }]}>
                  <Ionicons name="trophy" size={18} color="#FDCB6E" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Achievements</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sectionMeta, { color: colors.text.tertiary }]}>
                  {earnedBadges.length}/{gamification.totalBadges || badges.length}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
              </View>
            </View>

            {/* Badge Row */}
            <View style={styles.badgeRow}>
              {(badges.length > 0 ? badges : gamification.allBadges || []).slice(0, 4).map((ub: any) => {
                const badgeData = ub.badge || ub;
                const isEarned = ub.isEarned ?? true;
                return (
                  <View key={ub.id || badgeData.code} style={styles.badgeItem}>
                    <View
                      style={[
                        styles.badgeIcon,
                        {
                          backgroundColor: isEarned ? '#FDCB6E' : colors.bg.tertiary,
                          opacity: isEarned ? 1 : 0.4,
                        },
                      ]}
                    >
                      <Ionicons
                        name={(badgeData.icon || 'trophy') as IconName}
                        size={18}
                        color={isEarned ? '#1A1A2E' : colors.text.tertiary}
                      />
                    </View>
                    <Text
                      style={[styles.badgeLabel, { color: isEarned ? colors.text.primary : colors.text.tertiary }]}
                      numberOfLines={1}
                    >
                      {badgeData.name}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Streak Row */}
            {streaks.length > 0 && (
              <View style={styles.streakRow}>
                {streaks.map((s: any) => (
                  <View key={s.id} style={[styles.streakItem, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons
                      name={
                        s.streakType === 'daily'
                          ? 'flame'
                          : s.streakType === 'weekly'
                            ? 'calendar'
                            : 'calendar-number'
                      }
                      size={14}
                      color={colors.accent.primary}
                    />
                    <Text style={[styles.streakValue, { color: colors.text.primary }]}>
                      {s.currentStreak}
                    </Text>
                    <Text style={[styles.streakLabel, { color: colors.text.tertiary }]}>
                      {s.streakType}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ─── Shared Circles ───────────────────────────── */}
        {show('sharedCircles') && sharedGroupsData.length > 0 && (
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Shared', { screen: 'SharedFinanceHome' })}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#5B5FE818' }]}>
                  <Ionicons name="people" size={18} color="#5B5FE8" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Shared Circles</Text>
              </View>
              <Text style={[styles.sectionMeta, { color: colors.text.tertiary }]}>
                {sharedGroupsData.length}
              </Text>
            </View>
            <View style={styles.circleList}>
              {sharedGroupsData.slice(0, 3).map((group: any) => {
                const typeColors: Record<string, string> = {
                  couple: '#FF6B9D',
                  family: '#5B5FE8',
                  friends: '#00B894',
                  trip: '#FDCB6E',
                  roommates: '#F7892C',
                };
                const color = typeColors[group.type] || colors.accent.primary;
                const memberCount = group.members?.length || group._count?.members || 0;
                return (
                  <View key={group.id} style={styles.circleItem}>
                    <View style={[styles.circleDot, { backgroundColor: color }]} />
                    <Text style={[styles.circleName, { color: colors.text.primary }]} numberOfLines={1}>
                      {group.name || group.title}
                    </Text>
                    <Text style={[styles.circleMeta, { color: colors.text.tertiary }]}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        )}

        {/* ─── Family/Couple Summary ────────────────────── */}
        {show('familySummary') && coupleFamilyGroups.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FF6B9D18' }]}>
                  <Ionicons name="home" size={18} color="#FF6B9D" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Family Finance</Text>
              </View>
            </View>
            {coupleFamilyGroups.slice(0, 2).map((group: any) => {
              const isCouple = group.type === 'couple';
              const memberCount = group.members?.length || group._count?.members || 0;
              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.familyRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('Shared', {
                      screen: isCouple ? 'CoupleFinance' : 'FamilyDashboard',
                      params: { groupId: group.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.familyIcon,
                      { backgroundColor: isCouple ? '#FF6B9D18' : '#5B5FE818' },
                    ]}
                  >
                    <Ionicons
                      name={isCouple ? 'heart' : 'people'}
                      size={18}
                      color={isCouple ? '#FF6B9D' : '#5B5FE8'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.familyName, { color: colors.text.primary }]}>
                      {group.name || group.title}
                    </Text>
                    <Text style={[styles.familyMeta, { color: colors.text.tertiary }]}>
                      {memberCount} members · {isCouple ? 'Couple' : 'Family'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Snapshot Cards ───────────────────────────── */}
        {show('snapshots') && (
          <View style={styles.snapRow}>
            <SnapshotCard
              title="Top Spend"
              value={snapshots[0].value}
              detail={`${moneyFormat(topCategory?.amount || topCategory?.total || 0)} this month`}
              icon={snapshots[0].icon}
              color={snapshots[0].color}
              onPress={() => navigation.navigate('Accounts', { screen: 'ExpenseHome' })}
            />
            <SnapshotCard
              title="Shared With"
              value={snapshots[1].value}
              detail={`${sharedGroupsData.filter((g: any) => g.type === 'couple' || g.type === 'family').length} family groups`}
              icon={snapshots[1].icon}
              color={snapshots[1].color}
              onPress={() => navigation.navigate('Shared', { screen: 'SharedFinanceHome' })}
            />
          </View>
        )}

        {/* ─── Recent Activity ──────────────────────────── */}
        {show('recentActivity') && (
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#00B89418' }]}>
                  <Ionicons name="time" size={18} color="#00B894" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Activity</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Accounts', { screen: 'ExpenseHome' })}
              >
                <Text style={[styles.seeAll, { color: colors.accent.primary }]}>See all</Text>
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
                  <View style={[styles.activityIcon, { backgroundColor: Number(tx.amount) > 0 ? '#00B89418' : '#FF6B6B18' }]}>
                    <Ionicons
                      name={Number(tx.amount) > 0 ? 'arrow-down' : 'arrow-up'}
                      size={14}
                      color={Number(tx.amount) > 0 ? '#00B894' : '#FF6B6B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityName, { color: colors.text.primary }]} numberOfLines={1}>
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
              <View style={styles.emptyActivity}>
                <Ionicons name="receipt-outline" size={32} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No recent transactions
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── Spaces section ─────────────────────────── */}
        {show('spaces') && spacesData.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.secondary }]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Accounts', { screen: 'ExpenseHome' })}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.sectionIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
                    <Ionicons name="layers" size={18} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Spaces</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
            {spacesData.slice(0, 3).map((space: any) => {
              const typeColors: Record<string, string> = {
                trip: '#FF6B6B',
                event: '#FDCB6E',
                apartment: '#00B894',
                office: '#5B5FE8',
                friends: '#F7892C',
                roommates: '#8A5CF6',
              };
              return (
                <View key={space.id} style={styles.spacePreview}>
                  <View style={[styles.spaceDot, { backgroundColor: typeColors[space.type] || colors.accent.primary }]} />
                  <Text style={[styles.spaceName, { color: colors.text.primary }]} numberOfLines={1}>
                    {space.name}
                  </Text>
                  <Text style={[styles.spaceAmount, { color: colors.text.secondary }]}>
                    {moneyFormat(space.totalAmount || space.balance || 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  skeletonBlock: { borderRadius: 16, marginBottom: 4 },

  // Balance
  balanceCard: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  balanceEyebrow: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  balanceMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceBadgeText: { fontSize: 11, fontWeight: '600' },
  balanceStats: { flexDirection: 'row', gap: 24 },
  moneyStat: { flex: 1 },
  moneyStatLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  moneyStatValue: { fontSize: 16, fontWeight: '700' },
  progressBarBg: { height: 4, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },

  // Quick Actions
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 16,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Section Card
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionMeta: { fontSize: 12, fontWeight: '600' },
  sectionSub: { fontSize: 11, fontWeight: '500' },

  // Financial Health
  healthCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  healthScore: { fontSize: 16, fontWeight: '800' },
  healthLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  factorName: { width: 80, fontSize: 11, fontWeight: '500' },
  factorBar: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 3 },
  factorScore: { fontSize: 10, fontWeight: '600', width: 30, textAlign: 'right' },

  // Monthly Spending
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catName: { width: 80, fontSize: 11, fontWeight: '500' },
  catBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 3 },
  catAmount: { width: 70, fontSize: 12, fontWeight: '600', textAlign: 'right' },

  // Goals Mini
  goalsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 8 },
  goalMini: { flex: 1, borderRadius: 16, padding: 14 },
  goalMiniName: { fontSize: 13, fontWeight: '700' },
  goalMiniMeta: { fontSize: 11, fontWeight: '500' },

  // Upcoming Bills
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  billName: { fontSize: 13, fontWeight: '600' },
  billDue: { fontSize: 11, marginTop: 1 },
  billAmount: { fontSize: 14, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600', marginTop: 8 },

  // Subscriptions
  subStats: { flexDirection: 'row', alignItems: 'center' },
  subStat: { flex: 1, alignItems: 'center' },
  subStatLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  subStatValue: { fontSize: 20, fontWeight: '800' },
  subDivider: { width: 1, height: 32 },
  subAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 10 },
  subAlertText: { fontSize: 11, fontWeight: '600' },

  // Insights
  insightRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' },
  insightIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  insightDesc: { fontSize: 11, lineHeight: 15 },

  // Gamification
  badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  badgeItem: { flex: 1, alignItems: 'center', gap: 4 },
  badgeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  streakRow: { flexDirection: 'row', gap: 8 },
  streakItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8 },
  streakValue: { fontSize: 13, fontWeight: '800' },
  streakLabel: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },

  // Shared Circles
  circleList: { gap: 8 },
  circleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circleDot: { width: 8, height: 8, borderRadius: 4 },
  circleName: { flex: 1, fontSize: 13, fontWeight: '600' },
  circleMeta: { fontSize: 11, fontWeight: '500' },

  // Family
  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  familyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  familyName: { fontSize: 13, fontWeight: '600' },
  familyMeta: { fontSize: 11, marginTop: 1 },

  // Snapshots
  snapRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 },
  snapCard: { flex: 1, borderRadius: 18, padding: 16 },
  snapIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  snapTitle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  snapValue: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  snapDetail: { fontSize: 10 },

  // Recent Activity
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activityName: { fontSize: 13, fontWeight: '600' },
  activityDate: { fontSize: 11, marginTop: 1 },
  activityAmount: { fontSize: 14, fontWeight: '700' },
  emptyActivity: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13 },

  // Spaces
  spacePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  spaceDot: { width: 8, height: 8, borderRadius: 4 },
  spaceName: { flex: 1, fontSize: 13, fontWeight: '600' },
  spaceAmount: { fontSize: 12, fontWeight: '600' },
});
