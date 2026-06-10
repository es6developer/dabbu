import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { getCategoryColor, getCategoryIcon } from '../../config/categoryIcons';
import { Avatar } from '../../components/ui/Avatar';
import { KEYWORD_CATEGORIES } from '../../constants/smartEntryKeywords';
import { useOffline } from '../../store/OfflineContext';

const { width: SCREEN_W } = Dimensions.get('window');

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) {
    return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  }
  if (v >= 100000) {
    return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '\u20B9' + (v / 1000).toFixed(1) + 'K';
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
    Dining: 'restaurant',
    Other: 'ellipsis-horizontal',
  };
  return map[cat] || getCategoryIcon(cat) || 'ellipsis-horizontal';
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuth();

  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [groupCount, setGroupCount] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingBillsTotal, setUpcomingBillsTotal] = useState(0);
  const [subscriptionTotal, setSubscriptionTotal] = useState(0);
  const [loanEmiTotal, setLoanEmiTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickEntry, setQuickEntry] = useState('');
  const [quickEntryLoading, setQuickEntryLoading] = useState(false);
  const { isOnline, pendingCount } = useOffline();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const savings = Math.max(0, monthlyIncome - monthlySpent);
  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

  const loadData = useCallback(
    async (isRefresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [balRes, statsRes, grpRes, remRes, goalRes, notifRes, billsRes, subRes] =
          await Promise.allSettled([
            api.get<any>('/accounts/stats', ctrl.signal),
            api.get<any>('/transactions/stats?months=1', ctrl.signal),
            api.get<any>('/expense-groups', ctrl.signal),
            api.get<any>('/reminders/upcoming?days=7', ctrl.signal),
            api.get<any>('/goals', ctrl.signal),
            api.get<any>('/notifications/unread-count', ctrl.signal),
            api.get<any>('/bills?status=pending', ctrl.signal).catch(() => ({ data: [] })),
            api
              .get<any>('/accounts/subscriptions', ctrl.signal)
              .catch(() => ({ data: { monthlyTotal: 0 } })),
          ]);

        if (ctrl.signal.aborted) {
          return;
        }

        if (balRes.status === 'fulfilled') {
          const b = balRes.value;
          setTotalBalance(b.totalBalance ?? b.data?.totalBalance ?? null);
        } else {
          setTotalBalance(null);
        }

        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value?.data ?? statsRes.value;
          setMonthlyIncome(s.summary?.totalIncome ?? 0);
          setMonthlySpent(s.summary?.totalExpense ?? 0);
          const cats: any[] = (s.categoryBreakdown || []).map((c: any) => ({
            name: c.name === 'Uncategorized' || !c.name ? 'Other' : c.name,
            amount: Number(c.amount || 0),
          }));
          const grouped: Record<string, number> = {};
          cats.forEach((c) => {
            grouped[c.name] = (grouped[c.name] || 0) + c.amount;
          });
          setCategories(Object.entries(grouped).map(([name, amount]) => ({ name, amount })));
          setRecentTxns((s.recentTransactions || []).slice(0, 5));
        }

        if (grpRes.status === 'fulfilled') {
          const list = Array.isArray(grpRes.value)
            ? grpRes.value
            : Array.isArray(grpRes.value?.data)
              ? grpRes.value.data
              : [];
          setGroupCount(list.length);
        }

        if (remRes.status === 'fulfilled') {
          const list = Array.isArray(remRes.value)
            ? remRes.value
            : Array.isArray(remRes.value?.data)
              ? remRes.value.data
              : [];
          setReminders(list.slice(0, 5));
        }

        if (goalRes.status === 'fulfilled') {
          const list = Array.isArray(goalRes.value)
            ? goalRes.value
            : Array.isArray(goalRes.value?.data)
              ? goalRes.value.data
              : [];
          setGoals(list.slice(0, 3));
        }

        if (notifRes.status === 'fulfilled') {
          const n = notifRes.value;
          setUnreadCount(n.count ?? n.data?.count ?? 0);
        }

        if (billsRes.status === 'fulfilled') {
          const billsData = billsRes.value?.data ?? billsRes.value ?? [];
          const bills = Array.isArray(billsData) ? billsData : [];
          const upcomingTotal = bills.reduce(
            (sum: number, b: any) => sum + (Number(b.amount) || 0),
            0,
          );
          setUpcomingBillsTotal(upcomingTotal);
        }

        if (subRes.status === 'fulfilled') {
          const subData = subRes.value?.data ?? subRes.value ?? {};
          setSubscriptionTotal(Number(subData.monthlyTotal ?? subData.total ?? 0));
        }

        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      } catch {
        if (!ctrl.signal.aborted) {
          setError('Unable to load data. Pull to refresh.');
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, fadeAnim],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleQuickAdd(text: string) {
    const match = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (!match) {
      return;
    }
    const desc = match[1].trim();
    const amt = match[2];
    const lower = desc.toLowerCase();
    let category = 'Other';
    for (const [keyword, cat] of Object.entries(KEYWORD_CATEGORIES)) {
      if (lower.includes(keyword)) {
        category = cat;
        break;
      }
    }
    setQuickEntryLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post('/transactions', {
        amount: parseFloat(amt),
        description: desc,
        categoryName: category,
        type: 'expense',
        date: new Date().toISOString(),
      });
      setQuickEntry('');
      loadData(true);
    } catch {
      /* ignore */
    } finally {
      setQuickEntryLoading(false);
    }
  }

  const quickActions = useMemo(
    () => [
      {
        icon: 'add-circle' as const,
        label: 'Add',
        color: colors.accent.primary,
        route: 'AddExpense',
        tab: 'Expense' as const,
      },
      {
        icon: 'scan' as const,
        label: 'Scan',
        color: isDark ? '#FBBF24' : '#F59E0B',
        route: 'BillScanner',
        tab: 'Expense' as const,
      },
      {
        icon: 'people' as const,
        label: 'Split',
        color: isDark ? '#34D399' : '#14B8A6',
        route: 'AddExpense',
        tab: 'Expense' as const,
      },
      {
        icon: 'receipt' as const,
        label: 'Bills',
        color: isDark ? '#60A5FA' : '#4A90D9',
        route: 'BillsList',
        tab: 'Expense' as const,
      },
    ],
    [colors],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = user?.firstName || 'User';

  const netBalance = totalBalance ?? 0;
  const isOwed = netBalance > 0;
  const isOwning = netBalance < 0;
  const settled = netBalance === 0;

  const statCards = useMemo(
    () => [
      {
        label: 'Income',
        value: fmtShort(monthlyIncome),
        icon: 'trending-up' as const,
        color: colors.status.success,
        bg: `${colors.status.success}12`,
      },
      {
        label: 'Spent',
        value: fmtShort(monthlySpent),
        icon: 'trending-down' as const,
        color: colors.status.error,
        bg: `${colors.status.error}12`,
      },
      {
        label: 'Savings',
        value: fmtShort(savings),
        icon: 'save-outline' as const,
        color: colors.status.success,
        bg: `${colors.status.success}15`,
      },
      {
        label: 'Groups',
        value: String(groupCount),
        icon: 'layers' as const,
        color: colors.accent.primary,
        bg: `${colors.accent.primary}12`,
      },
    ],
    [monthlyIncome, monthlySpent, savings, groupCount, colors],
  );

  if (loading && !monthlyIncome && !monthlySpent && totalBalance === null) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ gap: 4, flex: 1 }}>
            <View
              style={{
                width: 80,
                height: 12,
                borderRadius: 6,
                backgroundColor: colors.bg.tertiary,
              }}
            />
            <View
              style={{
                width: 140,
                height: 24,
                borderRadius: 6,
                backgroundColor: colors.bg.tertiary,
                marginTop: 4,
              }}
            />
          </View>
          <View
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg.tertiary }}
          />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View
            style={{
              width: '100%',
              height: 200,
              borderRadius: 24,
              backgroundColor: colors.bg.tertiary,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{ flex: 1, height: 52, borderRadius: 12, backgroundColor: colors.bg.tertiary }}
            />
          ))}
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View
            style={{
              width: 160,
              height: 16,
              borderRadius: 6,
              backgroundColor: colors.bg.tertiary,
              marginBottom: 12,
            }}
          />
          <View
            style={{
              width: '100%',
              height: 120,
              borderRadius: 16,
              backgroundColor: colors.bg.tertiary,
            }}
          />
        </View>
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
        {/* ── Header ─────────────────────────────────── */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.greeting, { color: colors.text.tertiary }]}>{greeting}</Text>
            <Text style={[s.userName, { color: colors.text.primary }]}>{userName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={[s.iconBtn, { backgroundColor: `${colors.accent.primary}10` }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.accent.primary} />
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[s.avatarBtn]}>
            <Avatar
              uri={user?.avatarUrl}
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size={40}
            />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View
              style={[
                s.errorCard,
                {
                  backgroundColor: `${colors.status.error}12`,
                  borderColor: `${colors.status.error}30`,
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          </View>
        )}

        {/* ── Hero Balance Card ─────────────────────── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 8, opacity: fadeAnim }}>
          <View
            style={[
              s.heroCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
            <View style={s.heroTop}>
              <Text style={[s.heroLabel, { color: colors.text.secondary }]}>Total Balance</Text>
              <View
                style={[
                  s.heroBadge,
                  {
                    backgroundColor: settled
                      ? `${colors.text.tertiary}15`
                      : isOwed
                        ? `${colors.status.success}15`
                        : `${colors.status.error}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.heroBadgeText,
                    {
                      color: settled
                        ? colors.text.tertiary
                        : isOwed
                          ? colors.status.success
                          : colors.status.error,
                    },
                  ]}
                >
                  {settled ? 'Settled' : isOwed ? 'You are owed' : 'You owe'}
                </Text>
              </View>
            </View>
            <Text
              style={[
                s.heroAmount,
                {
                  color: settled
                    ? colors.text.tertiary
                    : isOwed
                      ? colors.status.success
                      : colors.status.error,
                },
              ]}
            >
              {settled ? 'All settled up' : fmt(Math.abs(netBalance))}
            </Text>
            {!settled && (
              <Text style={[s.heroCaption, { color: colors.text.tertiary }]}>
                {isOwed
                  ? `You've lent ${fmt(netBalance)} across groups`
                  : `You need to pay back ${fmt(Math.abs(netBalance))}`}
              </Text>
            )}
            <View style={[s.heroDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={s.heroRow}>
              <View style={s.heroMetric}>
                <View style={[s.heroMetricIcon, { backgroundColor: `${colors.status.success}18` }]}>
                  <Ionicons name="arrow-down" size={16} color={colors.status.success} />
                </View>
                <View>
                  <Text style={[s.heroMetricLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[s.heroMetricValue, { color: colors.status.success }]}>
                    {fmtShort(monthlyIncome)}
                  </Text>
                </View>
              </View>
              <View style={[s.heroMetricDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={s.heroMetric}>
                <View style={[s.heroMetricIcon, { backgroundColor: `${colors.status.error}18` }]}>
                  <Ionicons name="arrow-up" size={16} color={colors.status.error} />
                </View>
                <View>
                  <Text style={[s.heroMetricLabel, { color: colors.text.tertiary }]}>Spent</Text>
                  <Text style={[s.heroMetricValue, { color: colors.status.error }]}>
                    {fmtShort(monthlySpent)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Safe to Spend ───────────────────────── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 14, opacity: fadeAnim }}>
          <View
            style={[
              s.safeCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.safeLabel, { color: colors.text.tertiary }]}>
                  Available Balance
                </Text>
                <Text style={[s.safeAmount, { color: colors.text.primary }]}>
                  {fmt(totalBalance ?? 0)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { screen: 'Reports' })}
                style={[s.safeDetailBtn, { backgroundColor: `${colors.accent.primary}12` }]}
              >
                <Text style={[s.safeDetailBtnText, { color: colors.accent.primary }]}>Details</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.safeDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={{ gap: 8 }}>
              <View style={s.safeRow}>
                <Ionicons name="receipt-outline" size={14} color={colors.text.tertiary} />
                <Text style={[s.safeRowLabel, { color: colors.text.tertiary }]}>
                  Upcoming Bills
                </Text>
                <Text style={[s.safeRowValue, { color: colors.text.primary }]}>
                  -{fmt(upcomingBillsTotal)}
                </Text>
              </View>
              <View style={s.safeRow}>
                <Ionicons name="card-outline" size={14} color={colors.text.tertiary} />
                <Text style={[s.safeRowLabel, { color: colors.text.tertiary }]}>Subscriptions</Text>
                <Text style={[s.safeRowValue, { color: colors.text.primary }]}>
                  -{fmt(subscriptionTotal)}
                </Text>
              </View>
              <View style={s.safeRow}>
                <Ionicons name="trending-down-outline" size={14} color={colors.text.tertiary} />
                <Text style={[s.safeRowLabel, { color: colors.text.tertiary }]}>Loan EMIs</Text>
                <Text style={[s.safeRowValue, { color: colors.text.primary }]}>
                  -{fmt(loanEmiTotal)}
                </Text>
              </View>
            </View>
            <View
              style={[
                s.safeResult,
                {
                  backgroundColor: `${colors.status.success}12`,
                  borderColor: `${colors.status.success}25`,
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={16} color={colors.status.success} />
              <Text style={[s.safeResultLabel, { color: colors.text.tertiary }]}>
                Safe to Spend
              </Text>
              <Text style={[s.safeResultValue, { color: colors.status.success }]}>
                {fmt(
                  Math.max(
                    0,
                    (totalBalance ?? 0) - upcomingBillsTotal - subscriptionTotal - loanEmiTotal,
                  ),
                )}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Quick Add ────────────────────────────── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 16, opacity: fadeAnim }}>
          <Text style={[s.sectionTitle, { color: colors.text.primary, marginBottom: 8 }]}>
            Quick Add
          </Text>
          <View
            style={[
              s.quickAddCard,
              { backgroundColor: colors.bg.card, borderColor: colors.accent.primary },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash" size={16} color={colors.accent.primary} />
              <TextInput
                style={[s.quickAddInput, { color: colors.text.primary }]}
                placeholder='e.g. "Tea 20"'
                placeholderTextColor={colors.text.tertiary}
                value={quickEntry}
                onChangeText={setQuickEntry}
                onSubmitEditing={() => handleQuickAdd(quickEntry)}
                returnKeyType="done"
                editable={!quickEntryLoading}
              />
              {!quickEntryLoading ? (
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleQuickAdd(quickEntry)}>
                  <Ionicons name="arrow-forward-circle" size={24} color={colors.accent.primary} />
                </TouchableOpacity>
              ) : (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              )}
            </View>
            {quickEntry.length > 0 &&
              (() => {
                const m = quickEntry.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
                if (!m) {
                  return null;
                }
                const lower = m[1].trim().toLowerCase();
                let cat = 'Other';
                for (const [kw, c] of Object.entries(KEYWORD_CATEGORIES)) {
                  if (lower.includes(kw)) {
                    cat = c;
                    break;
                  }
                }
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: colors.border.subtle,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={colors.status.success} />
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                      {m[1].trim()} → {cat} · ₹{m[2]}
                    </Text>
                  </View>
                );
              })()}
          </View>
        </Animated.View>

        {/* ── Quick Insights ───────────────────────── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 20, opacity: fadeAnim }}>
          <Text style={[s.sectionTitle, { color: colors.text.primary, marginBottom: 12 }]}>
            Quick Insights
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[
                s.insightCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings', { screen: 'Reports' })}
            >
              <View style={[s.insightIcon, { backgroundColor: `${colors.status.error}12` }]}>
                <Ionicons name="trending-down" size={18} color={colors.status.error} />
              </View>
              <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>Top Spend</Text>
              <Text style={[s.insightValue, { color: colors.text.primary }]} numberOfLines={1}>
                {categories.length > 0 ? categories[0].name : '—'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.insightCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Reminders')}
            >
              <View style={[s.insightIcon, { backgroundColor: `${colors.status.warning}12` }]}>
                <Ionicons name="calendar" size={18} color={colors.status.warning} />
              </View>
              <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>Upcoming</Text>
              <Text style={[s.insightValue, { color: colors.text.primary }]} numberOfLines={1}>
                {reminders.length > 0 ? `${reminders.length} bills` : 'None'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.insightCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GoalsList')}
            >
              <View style={[s.insightIcon, { backgroundColor: `${colors.accent.primary}12` }]}>
                <Ionicons name="flag" size={18} color={colors.accent.primary} />
              </View>
              <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>Goals</Text>
              <Text style={[s.insightValue, { color: colors.text.primary }]} numberOfLines={1}>
                {goals.length > 0 ? `${goals.length} active` : 'None'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.insightCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GlobalSearch')}
            >
              <View style={[s.insightIcon, { backgroundColor: `${colors.status.info}12` }]}>
                <Ionicons name="search" size={18} color={colors.status.info} />
              </View>
              <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>Search</Text>
              <Text style={[s.insightValue, { color: colors.text.primary }]}>Tap</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Net Worth / Subscriptions / Loans Mini Cards ── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 20, opacity: fadeAnim }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[
                s.miniCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default, flex: 1 },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('NetWorth')}
            >
              <View style={[s.miniCardIcon, { backgroundColor: `${colors.status.success}12` }]}>
                <Ionicons name="wallet" size={18} color={colors.status.success} />
              </View>
              <Text style={[s.miniCardLabel, { color: colors.text.tertiary }]}>Net Worth</Text>
              <Text style={[s.miniCardValue, { color: colors.text.primary }]}>
                {fmt(totalBalance ?? 0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.miniCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default, flex: 1 },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Expense', { screen: 'Subscription' })}
            >
              <View style={[s.miniCardIcon, { backgroundColor: `${colors.status.warning}12` }]}>
                <Ionicons name="card" size={18} color={colors.status.warning} />
              </View>
              <Text style={[s.miniCardLabel, { color: colors.text.tertiary }]}>Subscriptions</Text>
              <Text style={[s.miniCardValue, { color: colors.text.primary }]}>
                {fmt(subscriptionTotal)}/mo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.miniCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default, flex: 1 },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('LoanTracker')}
            >
              <View style={[s.miniCardIcon, { backgroundColor: `${colors.status.error}12` }]}>
                <Ionicons name="trending-down" size={18} color={colors.status.error} />
              </View>
              <Text style={[s.miniCardLabel, { color: colors.text.tertiary }]}>Loans</Text>
              <Text style={[s.miniCardValue, { color: colors.text.primary }]}>
                {fmt(loanEmiTotal)}/mo
              </Text>
            </TouchableOpacity>
          </View>
          {/* ── Row 2: Budgets / Bills / Couple Space ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={[
                s.miniCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default, flex: 1 },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings', { screen: 'BudgetsList' })}
            >
              <View style={[s.miniCardIcon, { backgroundColor: `${colors.status.info}12` }]}>
                <Ionicons name="pie-chart" size={18} color={colors.status.info} />
              </View>
              <Text style={[s.miniCardLabel, { color: colors.text.tertiary }]}>Budgets</Text>
              <Text style={[s.miniCardValue, { color: colors.text.primary }]}>Track</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.miniCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default, flex: 1 },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Reminders')}
            >
              <View style={[s.miniCardIcon, { backgroundColor: `${colors.status.success}12` }]}>
                <Ionicons name="receipt" size={18} color={colors.status.success} />
              </View>
              <Text style={[s.miniCardLabel, { color: colors.text.tertiary }]}>Bills</Text>
              <Text style={[s.miniCardValue, { color: colors.text.primary }]}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.miniCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default, flex: 1 },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings', { screen: 'CoupleSpace' })}
            >
              <View style={[s.miniCardIcon, { backgroundColor: `${colors.status.warning}12` }]}>
                <Ionicons name="heart" size={18} color={colors.status.warning} />
              </View>
              <Text style={[s.miniCardLabel, { color: colors.text.tertiary }]}>Couple</Text>
              <Text style={[s.miniCardValue, { color: colors.text.primary }]}>Space</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Upcoming Reminders ────────────────────── */}
        {reminders.length > 0 && (
          <Animated.View style={{ marginTop: 24, opacity: fadeAnim }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                marginBottom: 10,
              }}
            >
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Upcoming</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Reminders')}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {reminders.map((r, i) => {
                const remDate = new Date(r.dueDate || r.date);
                const isOverdue = remDate < new Date() && r.status !== 'completed';
                const day = remDate.getDate();
                const month = remDate.toLocaleDateString('en-IN', { month: 'short' });
                return (
                  <TouchableOpacity
                    key={r.id || i}
                    style={[
                      s.reminderCard,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('Reminders', {
                        screen: 'ReminderDetail',
                        params: { id: r.id },
                      })
                    }
                  >
                    <View
                      style={[
                        s.reminderDate,
                        {
                          backgroundColor: isOverdue
                            ? `${colors.status.error}15`
                            : `${colors.accent.primary}12`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.reminderDay,
                          { color: isOverdue ? colors.status.error : colors.accent.primary },
                        ]}
                      >
                        {day}
                      </Text>
                      <Text
                        style={[
                          s.reminderMonth,
                          { color: isOverdue ? colors.status.error : colors.accent.primary },
                        ]}
                      >
                        {month}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[s.reminderTitle, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {r.title || r.name}
                      </Text>
                      <Text
                        style={[s.reminderSub, { color: colors.text.tertiary }]}
                        numberOfLines={1}
                      >
                        {r.category || r.type} {r.amount ? `· ${fmt(Number(r.amount))}` : ''}
                      </Text>
                    </View>
                    {isOverdue && (
                      <View style={[s.overdueDot, { backgroundColor: colors.status.error }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Quick Actions ─────────────────────────── */}
        <Animated.View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            marginTop: 24,
            gap: 12,
            opacity: fadeAnim,
          }}
        >
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => navigation.navigate(a.tab, { screen: a.route })}
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
        </Animated.View>

        {/* ── This Month Stats ──────────────────────── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 32, opacity: fadeAnim }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={[s.sectionTitle, { color: colors.text.primary }]}>This Month</Text>
            {!isOnline && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="cloud-offline-outline" size={12} color={colors.status.warning} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.status.warning }}>
                  Cached
                </Text>
              </View>
            )}
            {pendingCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="cloud-upload-outline" size={12} color={colors.status.warning} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.status.warning }}>
                  {pendingCount} pending
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {statCards.map((card) => (
              <TouchableOpacity
                key={card.label}
                style={[
                  s.statCard,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (card.label === 'Groups') {
                    navigation.navigate('Spaces');
                  }
                  if (card.label === 'Spent') {
                    navigation.navigate('Settings', { screen: 'Reports' });
                  }
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}
                >
                  <View style={[s.statIcon, { backgroundColor: card.bg }]}>
                    <Ionicons name={card.icon} size={16} color={card.color} />
                  </View>
                  {card.label === 'Savings' && monthlyIncome > 0 && (
                    <View style={[s.statSub, { backgroundColor: `${card.color}15` }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: card.color }}>
                        {savingsRate.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>{card.label}</Text>
                <Text style={[s.statValue, { color: colors.text.primary }]}>{card.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Spending by Category ──────────────────── */}
        {categories.length > 0 && (
          <Animated.View style={{ paddingHorizontal: 20, marginTop: 32, opacity: fadeAnim }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
                Spending by Category
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { screen: 'Reports' })}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 3 }}>
              {categories.slice(0, 5).map((cat, i) => {
                const pct = monthlySpent > 0 ? (cat.amount / monthlySpent) * 100 : 0;
                const cc = getCategoryColor(cat.name);
                return (
                  <View
                    key={cat.name + i}
                    style={[
                      s.catRow,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    ]}
                  >
                    <View style={[s.catIcon, { backgroundColor: `${cc}15` }]}>
                      <Ionicons name={getIcon(cat.name)} size={16} color={cc} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 5,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {cat.name}
                        </Text>
                        <Text
                          style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}
                        >
                          {fmtShort(cat.amount)}
                        </Text>
                      </View>
                      <View style={[s.catBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                        <View
                          style={[
                            s.catBarFill,
                            { width: `${Math.min(pct, 100)}%`, backgroundColor: cc },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Goals at a Glance ─────────────────────── */}
        {goals.length > 0 && (
          <Animated.View style={{ paddingHorizontal: 20, marginTop: 28, opacity: fadeAnim }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Goals</Text>
              <TouchableOpacity onPress={() => navigation.navigate('GoalsList')}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {goals.map((g, i) => {
                const saved = Number(g.savedAmount || g.saved || 0);
                const target = Number(g.targetAmount || g.target || 1);
                const pct = Math.min((saved / target) * 100, 100);
                return (
                  <TouchableOpacity
                    key={g.id || i}
                    style={[
                      s.goalRow,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('GoalDetail', { goalId: g.id })}
                  >
                    <View style={[s.goalCircle, { borderColor: `${colors.accent.primary}25` }]}>
                      <Text style={[s.goalPct, { color: colors.accent.primary }]}>
                        {pct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.goalName, { color: colors.text.primary }]} numberOfLines={1}>
                        {g.name || g.title}
                      </Text>
                      <Text style={[s.goalMeta, { color: colors.text.tertiary }]}>
                        {fmtShort(saved)} of {fmtShort(target)}
                      </Text>
                      <View
                        style={[
                          s.goalBarOuter,
                          { backgroundColor: colors.bg.tertiary, marginTop: 6 },
                        ]}
                      >
                        <View
                          style={[
                            s.goalBarFill,
                            { width: `${pct}%`, backgroundColor: colors.accent.primary },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Recent Transactions ───────────────────── */}
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 32, opacity: fadeAnim }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
              Recent Transactions
            </Text>
            {recentTxns.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Expense', { screen: 'ExpenseHome' })}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {recentTxns.length > 0 ? (
            <View style={{ gap: 4 }}>
              {recentTxns.map((tx, i) => {
                const isIncome = tx.type === 'income';
                const amount = Number(tx.amount || 0);
                const txColor = isIncome ? colors.status.success : colors.status.error;
                const catName = tx.category?.name || tx.category_name || tx.category || 'Other';
                const catColor = getCategoryColor(catName);
                return (
                  <TouchableOpacity
                    key={tx.id || i}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('Expense', {
                        screen: 'TransactionDetail',
                        params: { transactionId: tx.id },
                      })
                    }
                    style={[
                      s.txRow,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    ]}
                  >
                    <View style={[s.txIcon, { backgroundColor: `${catColor}15` }]}>
                      <Ionicons name={getIcon(catName)} size={18} color={catColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
                        numberOfLines={1}
                      >
                        {tx.description || tx.note || catName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '500',
                          color: colors.text.tertiary,
                          marginTop: 2,
                        }}
                      >
                        {fmtDate(tx.date || tx.createdAt)}{' '}
                        {tx.category?.name ? `· ${tx.category.name}` : ''}
                      </Text>
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
            <View
              style={[
                s.emptyCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <Ionicons name="receipt-outline" size={32} color={colors.text.tertiary} />
              <Text style={[s.emptyTitle, { color: colors.text.secondary }]}>
                No transactions yet
              </Text>
              <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                Tap + to add your first expense or income
              </Text>
            </View>
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4545',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroAmount: { fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 4 },
  heroCaption: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  heroDivider: { height: 1, marginVertical: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroMetric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetricLabel: { fontSize: 11, fontWeight: '500', marginBottom: 1 },
  heroMetricValue: { fontSize: 15, fontWeight: '700' },
  heroMetricDivider: { width: 1, height: 34, marginHorizontal: 12 },

  sectionTitle: { fontSize: 17, fontWeight: '700' },

  reminderCard: {
    width: SCREEN_W * 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  reminderDate: {
    width: 44,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderDay: { fontSize: 16, fontWeight: '800' },
  reminderMonth: { fontSize: 10, fontWeight: '600', marginTop: -1 },
  reminderTitle: { fontSize: 14, fontWeight: '600' },
  reminderSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  overdueDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 10, right: 10 },

  statCard: {
    width: (SCREEN_W - 20 * 2 - 10) / 2,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statSub: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBarOuter: { height: 4, borderRadius: 2, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 2 },

  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  goalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPct: { fontSize: 12, fontWeight: '800' },
  goalName: { fontSize: 14, fontWeight: '600' },
  goalMeta: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  goalBarOuter: { height: 4, borderRadius: 2, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 2 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptyDesc: { fontSize: 12, textAlign: 'center', paddingHorizontal: 24, lineHeight: 17 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  aiBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  aiBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  safeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  safeLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  safeAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  safeDetailBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  safeDetailBtnText: { fontSize: 12, fontWeight: '700' },
  safeDivider: { height: 1, marginVertical: 16 },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safeRowLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  safeRowValue: { fontSize: 14, fontWeight: '700' },
  safeResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  safeResultLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  safeResultValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  insightCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  insightLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  insightValue: { fontSize: 14, fontWeight: '700' },
  miniCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  miniCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  miniCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  miniCardValue: { fontSize: 15, fontWeight: '800' },
  quickAddCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
});
