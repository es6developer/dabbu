import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { api, setAccessToken } from '../../services/api';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { Skeleton, SkeletonList } from '../../components/ui/AnimatedSkeleton';
import { useTheme, typography as typographyStyles } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface DashboardData {
  accountStats: any | null;
  transactionStats: any | null;
  categories: any[];
  expenseGroups: any[];
  reminders: any[];
  goals: any[];
  sharedGroups: any[];
}

const emptyData: DashboardData = {
  accountStats: null,
  transactionStats: null,
  categories: [],
  expenseGroups: [],
  reminders: [],
  goals: [],
  sharedGroups: [],
};

const moneyFormat = (value: number) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const listFromResponse = (value: any): any[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.data)) {
    return value.data;
  }
  if (Array.isArray(value?.items)) {
    return value.items;
  }
  return [];
};

const valueFromResult = (result: PromiseSettledResult<any>, fallback: any) =>
  result.status === 'fulfilled' ? result.value : fallback;

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, accessToken } = useAuth();
  const { colors, isDark, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);

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
        'goals',
        'spaces',
        'features',
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

    if (accessToken) {
      setAccessToken(accessToken);
    }

    try {
      const [accountStats, txStats, categories, expenseGroups, reminders, goals, sharedGroups] =
        await Promise.allSettled([
          api.get<any>('/accounts/stats', signal),
          api.get<any>('/transactions/stats', signal),
          api.get<any>('/transactions/categories-summary?months=1', signal),
          api.get<any>('/expense-groups', signal),
          api.get<any>('/reminders', signal),
          api.get<any>('/goals', signal),
          api.get<any>('/shared-finance/groups', signal),
        ]);

      if (signal.aborted) {
        return;
      }

      setData({
        accountStats: valueFromResult(accountStats, null),
        transactionStats: valueFromResult(txStats, null),
        categories: listFromResponse(valueFromResult(categories, [])),
        expenseGroups: listFromResponse(valueFromResult(expenseGroups, [])),
        reminders: listFromResponse(valueFromResult(reminders, [])),
        goals: listFromResponse(valueFromResult(goals, [])),
        sharedGroups: listFromResponse(valueFromResult(sharedGroups, [])),
      });
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences]),
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }
  }, [fadeAnim, loading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const accountStats = data.accountStats || {};
  const txSummary = data.transactionStats?.summary || data.transactionStats || {};
  const totalBalance = Number(accountStats.totalBalance || 0);
  const monthlyIncome = Number(accountStats.monthlyIncome || txSummary.totalIncome || 0);
  const monthlyExpense = Number(accountStats.monthlyExpense || txSummary.totalExpense || 0);
  const totalAccounts = Number(accountStats.totalAccounts || 0);
  const activeReminders = data.reminders.filter((item) => item.status !== 'completed').length;
  const recentTransactions =
    accountStats.recentTransactions || data.transactionStats?.recentTransactions || [];
  const netFlow = monthlyIncome - monthlyExpense;
  const spendRate =
    monthlyIncome > 0 ? Math.min(100, Math.round((monthlyExpense / monthlyIncome) * 100)) : 0;

  const goalsData = data.goals || [];
  const spacesData = data.sharedGroups || [];
  const goalsTotalSaved = goalsData.reduce(
    (sum: number, g: any) => sum + Number(g.saved || g.currentAmount || 0),
    0,
  );
  const goalsTotalTarget = goalsData.reduce(
    (sum: number, g: any) => sum + Number(g.target || g.targetAmount || 0),
    0,
  );
  const goalsOverallPct =
    goalsTotalTarget > 0 ? Math.min((goalsTotalSaved / goalsTotalTarget) * 100, 100) : 0;

  const topCategory = useMemo(() => {
    const first = data.categories[0];
    if (!first) {
      return null;
    }
    return {
      name: first.name || first.category || 'Spending',
      amount: Number(first.total || first.amount || 0),
      percentage: Number(first.percentage || 0),
    };
  }, [data.categories]);

  const primaryActions = [
    {
      label: 'Add Expense',
      icon: 'add-circle-outline' as IconName,
      color: '#00A86B',
      onPress: () => navigation.navigate('Accounts', { screen: 'CreateTransaction' }),
    },
    {
      label: 'Scan Bill',
      icon: 'scan-outline' as IconName,
      color: '#E85D04',
      onPress: () => navigation.navigate('Accounts', { screen: 'BillScanner' }),
    },
    {
      label: 'Split Group',
      icon: 'people-outline' as IconName,
      color: '#5B5FE8',
      onPress: () =>
        navigation.navigate('Shared', {
          screen: 'SharedFinanceHome',
        }),
    },
    {
      label: 'Reminder',
      icon: 'alarm-outline' as IconName,
      color: '#0B84A5',
      onPress: () =>
        navigation.navigate('Shared', {
          screen: 'SharedFinanceHome',
        }),
    },
    {
      label: 'Reminder',
      icon: 'alarm-outline' as IconName,
      color: '#0B84A5',
      onPress: () => navigation.navigate('Reminders', { screen: 'CreateReminder' }),
    },
  ];

  const featureCards = [
    {
      title: 'Wallet',
      meta: `${totalAccounts} account${totalAccounts === 1 ? '' : 's'}`,
      icon: 'wallet-outline' as IconName,
      color: '#0B84A5',
      onPress: () =>
        navigation.navigate('Accounts', { screen: 'ExpenseHome', params: { screen: 'MyWallet' } }),
    },
    {
      title: 'Expenses',
      meta: `${moneyFormat(monthlyExpense)} this month`,
      icon: 'receipt-outline' as IconName,
      color: '#D64550',
      onPress: () =>
        navigation.navigate('Accounts', { screen: 'ExpenseHome', params: { screen: 'MyWallet' } }),
    },
    {
      title: 'Split',
      meta: `${data.expenseGroups.length} group${data.expenseGroups.length === 1 ? '' : 's'}`,
      icon: 'git-branch-outline' as IconName,
      color: '#5B5FE8',
      onPress: () =>
        navigation.navigate('Shared', {
          screen: 'SharedFinanceHome',
        }),
    },
    {
      title: 'Bills',
      meta: 'Due dates',
      icon: 'calendar-outline' as IconName,
      color: '#C26A00',
      onPress: () => navigation.navigate('Accounts', { screen: 'BillsList' }),
    },
    {
      title: 'Reports',
      meta: topCategory ? topCategory.name : 'Analytics',
      icon: 'analytics-outline' as IconName,
      color: '#247BA0',
      onPress: () => navigation.navigate('Settings', { screen: 'Analytics' }),
    },
    {
      title: 'SMS',
      meta: 'Auto detect',
      icon: 'chatbubbles-outline' as IconName,
      color: '#2D9CDB',
      onPress: () => navigation.navigate('SMS', { screen: 'SmsDashboard' }),
    },
    {
      title: 'Premium',
      meta: 'Plans',
      icon: 'diamond-outline' as IconName,
      color: '#8A5CF6',
      onPress: () => navigation.navigate('Settings', { screen: 'Premium' }),
    },
  ];

  if (loading) {
    return (
      <BaseScreen>
        <View style={{ paddingHorizontal: 24, gap: 8 }}>
          <Skeleton width={160} height={16} />
          <Skeleton width={200} height={32} />
        </View>
        <View style={{ marginTop: 20, paddingHorizontal: 24 }}>
          <Skeleton width="100%" height={180} borderRadius={24} />
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginTop: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="22%" height={72} borderRadius={16} />
          ))}
        </View>
        <View style={{ marginTop: 24, gap: 12, paddingHorizontal: 24 }}>
          <Skeleton width={120} height={14} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="45%" height={90} borderRadius={16} />
            ))}
          </View>
        </View>
        <SkeletonList count={3} />
      </BaseScreen>
    );
  }

  return (
    <BaseScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.text.tertiary }]}>Dabbu</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Hi {user?.firstName || 'there'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })}
            >
              <Text style={styles.avatarText}>{(user?.firstName?.[0] || 'U').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(!widgetOrder.length || widgetOrder.includes('balance')) && (
          <LinearGradient
            colors={isDark ? ['#111827', '#1F2937'] : ['#FFFFFF', '#EEF4FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.balancePanel, { borderColor: colors.border.subtle }]}
          >
            <View style={styles.panelTop}>
              <Text style={[styles.panelLabel, { color: colors.text.tertiary }]}>
                Available balance
              </Text>
              <View
                style={[
                  styles.netBadge,
                  { backgroundColor: netFlow >= 0 ? '#00A86B18' : '#D6455018' },
                ]}
              >
                <Ionicons
                  name={netFlow >= 0 ? 'trending-up' : 'trending-down'}
                  size={13}
                  color={netFlow >= 0 ? '#00A86B' : '#D64550'}
                />
                <Text
                  style={[styles.netBadgeText, { color: netFlow >= 0 ? '#00A86B' : '#D64550' }]}
                >
                  {netFlow >= 0 ? '+' : '-'}
                  {moneyFormat(Math.abs(netFlow))}
                </Text>
              </View>
            </View>
            <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>
              {moneyFormat(totalBalance)}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${spendRate}%`,
                    backgroundColor: spendRate > 80 ? '#D64550' : colors.accent.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.moneyStats}>
              <MoneyStat label="Income" value={moneyFormat(monthlyIncome)} color="#00A86B" />
              <MoneyStat label="Spent" value={moneyFormat(monthlyExpense)} color="#D64550" />
              <MoneyStat label="Rate" value={`${spendRate}%`} color={colors.text.primary} />
            </View>
          </LinearGradient>
        )}

        {(!widgetOrder.length || widgetOrder.includes('quickActions')) && (
          <View style={styles.actionRow}>
            {primaryActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionItem}
                onPress={action.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text
                  style={[styles.actionLabel, { color: colors.text.secondary }]}
                  numberOfLines={2}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(!widgetOrder.length || widgetOrder.includes('goals')) && goalsData.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('GoalsList')}
            style={styles.goalsCard}
          >
            <LinearGradient
              colors={['#1A1A2E', '#16213E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goalsCardInner}
            >
              <View style={styles.goalsCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[styles.goalsIcon, { backgroundColor: colors.accent.primary + '25' }]}
                  >
                    <Ionicons name="trophy-outline" size={16} color={colors.accent.primary} />
                  </View>
                  <View>
                    <Text style={[styles.goalsTitle, { color: colors.text.primary }]}>
                      Goal Progress
                    </Text>
                    <Text style={[styles.goalsCount, { color: colors.text.tertiary }]}>
                      {goalsData.length} goal{goalsData.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.goalsPctWrap}>
                  <Text style={[styles.goalsPct, { color: colors.accent.primary }]}>
                    {Math.round(goalsOverallPct)}%
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                </View>
              </View>
              <View style={[styles.goalsTrack, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[
                    styles.goalsFill,
                    { width: `${goalsOverallPct}%`, backgroundColor: colors.accent.primary },
                  ]}
                />
              </View>
              <View style={styles.goalsStats}>
                <Text style={[styles.goalsStatText, { color: colors.text.secondary }]}>
                  <Text style={{ color: colors.status.success }}>
                    {moneyFormat(goalsTotalSaved)}
                  </Text>{' '}
                  saved
                </Text>
                <Text style={[styles.goalsStatText, { color: colors.text.secondary }]}>
                  of {moneyFormat(goalsTotalTarget)}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {(!widgetOrder.length || widgetOrder.includes('spaces')) && spacesData.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Shared', { screen: 'SharedFinanceHome' })}
            style={styles.spacesCard}
          >
            <View style={styles.spacesCardInner}>
              <View style={styles.spacesCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.spacesIcon, { backgroundColor: '#4F6EF720' }]}>
                    <Ionicons name="grid-outline" size={16} color="#4F6EF7" />
                  </View>
                  <View>
                    <Text style={[styles.spacesTitle, { color: colors.text.primary }]}>
                      Your Spaces
                    </Text>
                    <Text style={[styles.spacesCount, { color: colors.text.tertiary }]}>
                      {spacesData.length} active space{spacesData.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
              </View>
              <View style={styles.spacesPreview}>
                {spacesData.slice(0, 3).map((s: any, i: number) => {
                  const typeColors: Record<string, string> = {
                    friends: '#4F6EF7',
                    trip: '#00B894',
                    family: '#E85D04',
                    couple: '#FF6B9D',
                    roommates: '#6C5CE7',
                    office: '#247BA0',
                    event: '#D64550',
                    apartment: '#8A5CF6',
                  };
                  const c = typeColors[s.type] || '#4F6EF7';
                  return (
                    <View key={s.id || i} style={styles.spacesPreviewItem}>
                      <View style={[styles.spacesPreviewDot, { backgroundColor: c }]} />
                      <Text
                        style={[styles.spacesPreviewName, { color: colors.text.secondary }]}
                        numberOfLines={1}
                      >
                        {s.name}
                      </Text>
                      <Text style={[styles.spacesPreviewAmount, { color: colors.text.tertiary }]}>
                        {moneyFormat(Number(s.totalSpent || 0))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {(!widgetOrder.length || widgetOrder.includes('features')) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Features</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { screen: 'Analytics' })}
              >
                <Text style={[styles.sectionLink, { color: colors.accent.primary }]}>Reports</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featureGrid}>
              {featureCards.map((feature) => (
                <TouchableOpacity
                  key={feature.title}
                  style={[
                    styles.featureCard,
                    { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                  onPress={feature.onPress}
                  activeOpacity={0.78}
                >
                  <View style={[styles.featureIcon, { backgroundColor: feature.color + '16' }]}>
                    <Ionicons name={feature.icon} size={20} color={feature.color} />
                  </View>
                  <Text style={[styles.featureTitle, { color: colors.text.primary }]}>
                    {feature.title}
                  </Text>
                  <Text
                    style={[styles.featureMeta, { color: colors.text.tertiary }]}
                    numberOfLines={1}
                  >
                    {feature.meta}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {(!widgetOrder.length || widgetOrder.includes('snapshots')) && (
          <View style={styles.snapshotRow}>
            <SnapshotCard
              title="Top Spend"
              value={topCategory ? moneyFormat(topCategory.amount) : '₹0'}
              detail={
                topCategory
                  ? `${topCategory.name} · ${Math.round(topCategory.percentage)}%`
                  : 'No category data'
              }
              icon="pie-chart-outline"
              color="#E85D04"
              bg={colors.bg.secondary}
              border={colors.border.subtle}
              text={colors.text.primary}
              muted={colors.text.tertiary}
            />
            <SnapshotCard
              title="Tasks"
              value={`${activeReminders}`}
              detail={`${data.reminders.length} reminder${data.reminders.length === 1 ? '' : 's'}`}
              icon="alarm-outline"
              color="#0B84A5"
              bg={colors.bg.secondary}
              border={colors.border.subtle}
              text={colors.text.primary}
              muted={colors.text.tertiary}
            />
          </View>
        )}

        {(!widgetOrder.length || widgetOrder.includes('recentActivity')) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Recent Activity
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Accounts', {
                    screen: 'ExpenseHome',
                    params: { screen: 'MyWallet' },
                  })
                }
              >
                <Text style={[styles.sectionLink, { color: colors.accent.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activityList}>
              {recentTransactions.slice(0, 5).length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                >
                  <Ionicons name="receipt-outline" size={28} color={colors.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                    No transactions yet
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                    Add an expense or scan a bill to start tracking.
                  </Text>
                </View>
              ) : (
                recentTransactions.slice(0, 5).map((item: any, index: number) => {
                  const isExpense = item.type === 'expense';
                  return (
                    <TouchableOpacity
                      key={item.id || index}
                      style={[
                        styles.activityItem,
                        { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                      ]}
                      onPress={() =>
                        navigation.navigate('Accounts', {
                          screen: 'TransactionDetail',
                          params: { transactionId: item.id },
                        })
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.activityIcon,
                          { backgroundColor: isExpense ? '#D6455018' : '#00A86B18' },
                        ]}
                      >
                        <Ionicons
                          name={isExpense ? 'arrow-up' : 'arrow-down'}
                          size={15}
                          color={isExpense ? '#D64550' : '#00A86B'}
                        />
                      </View>
                      <View style={styles.activityBody}>
                        <Text
                          style={[styles.activityTitle, { color: colors.text.primary }]}
                          numberOfLines={1}
                        >
                          {item.description || item.category?.name || 'Transaction'}
                        </Text>
                        <Text style={[styles.activityMeta, { color: colors.text.tertiary }]}>
                          {new Date(item.date || item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.activityAmount,
                          { color: isExpense ? '#D64550' : '#00A86B' },
                        ]}
                      >
                        {isExpense ? '-' : '+'}
                        {moneyFormat(Number(item.amount || 0))}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </BaseScreen>
  );
}

function MoneyStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.moneyStat}>
      <Text style={styles.moneyStatLabel}>{label}</Text>
      <Text style={[styles.moneyStatValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SnapshotCard({
  title,
  value,
  detail,
  icon,
  color,
  bg,
  border,
  text,
  muted,
}: {
  title: string;
  value: string;
  detail: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
  text: string;
  muted: string;
}) {
  return (
    <View style={[styles.snapshotCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.snapshotIcon, { backgroundColor: color + '16' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.snapshotTitle, { color: muted }]}>{title}</Text>
      <Text style={[styles.snapshotValue, { color: text }]}>{value}</Text>
      <Text style={[styles.snapshotDetail, { color: muted }]} numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerText: { flex: 1 },
  eyebrow: { ...typographyStyles.caption1, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { ...typographyStyles.appTitle, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E85D04',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', ...typographyStyles.cardTitle },
  balancePanel: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 18 },
  panelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelLabel: { ...typographyStyles.caption1, textTransform: 'uppercase', letterSpacing: 0.7 },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  netBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  balanceAmount: { ...typographyStyles.amount, marginBottom: 16 },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 999 },
  moneyStats: { flexDirection: 'row', gap: 10 },
  moneyStat: { flex: 1 },
  moneyStatLabel: {
    color: 'rgba(127,127,127,0.9)',
    ...typographyStyles.caption2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  moneyStatValue: { ...typographyStyles.calloutBold },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionItem: { width: '23%', alignItems: 'center' },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: { ...typographyStyles.caption1, textAlign: 'center', fontFamily: 'Inter-SemiBold' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { ...typographyStyles.sectionHeader },
  sectionLink: { ...typographyStyles.subhead, fontFamily: 'Inter-SemiBold' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  featureCard: { width: '48.5%', borderWidth: 1, borderRadius: 18, padding: 14, minHeight: 118 },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: { ...typographyStyles.body, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  featureMeta: { ...typographyStyles.footnote, fontFamily: 'Inter-SemiBold' },
  snapshotRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  snapshotCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14 },
  snapshotIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  snapshotTitle: {
    ...typographyStyles.caption1,
    textTransform: 'uppercase',
    marginBottom: 3,
    fontFamily: 'Inter-Bold',
  },
  snapshotValue: { ...typographyStyles.amountSmall, marginBottom: 3 },
  snapshotDetail: { ...typographyStyles.footnote, fontFamily: 'Inter-SemiBold' },
  activityList: { gap: 10 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityBody: { flex: 1, minWidth: 0 },
  activityTitle: { ...typographyStyles.calloutBold, marginBottom: 3 },
  activityMeta: { ...typographyStyles.caption1, fontFamily: 'Inter-Medium' },
  activityAmount: { ...typographyStyles.calloutBold, marginLeft: 8 },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 22, alignItems: 'center' },
  emptyTitle: { ...typographyStyles.body, fontFamily: 'Inter-Bold', marginTop: 10 },
  emptyText: { ...typographyStyles.footnote, textAlign: 'center', marginTop: 4 },

  goalsCard: { marginBottom: 16 },
  goalsCardInner: { borderRadius: 20, padding: 16, gap: 10 },
  goalsCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsTitle: { fontSize: 15, fontWeight: '700' },
  goalsCount: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  goalsPctWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalsPct: { fontSize: 18, fontWeight: '800' },
  goalsTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  goalsFill: { height: '100%', borderRadius: 999 },
  goalsStats: { flexDirection: 'row', justifyContent: 'space-between' },
  goalsStatText: { fontSize: 11, fontWeight: '500' },

  spacesCard: { marginBottom: 16 },
  spacesCardInner: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  spacesCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  spacesIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacesTitle: { fontSize: 15, fontWeight: '700' },
  spacesCount: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  spacesPreview: { gap: 8 },
  spacesPreviewItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacesPreviewDot: { width: 8, height: 8, borderRadius: 4 },
  spacesPreviewName: { flex: 1, fontSize: 12, fontWeight: '600' },
  spacesPreviewAmount: { fontSize: 11, fontWeight: '600' },
});
