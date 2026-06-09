import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing as ReEasing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { getCategoryColor, getCategoryIcon } from '../../config/categoryIcons';
import { Avatar } from '../../components/ui/Avatar';

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
  const { colors } = useTheme();
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);
  const aiPulse = useSharedValue(1);

  useEffect(() => {
    aiPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: ReEasing.inOut(ReEasing.quad) }),
        withTiming(1, { duration: 1000, easing: ReEasing.inOut(ReEasing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(aiPulse);
  }, []);

  const aiPulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: aiPulse.value }],
  }));

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
        const [balRes, statsRes, grpRes, remRes, goalRes, notifRes] = await Promise.allSettled([
          api.get<any>('/accounts/stats', ctrl.signal),
          api.get<any>('/transactions/stats?months=1', ctrl.signal),
          api.get<any>('/expense-groups', ctrl.signal),
          api.get<any>('/reminders/upcoming?days=7', ctrl.signal),
          api.get<any>('/goals', ctrl.signal),
          api.get<any>('/notifications/unread-count', ctrl.signal),
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
        color: '#F59E0B',
        route: 'BillScanner',
        tab: 'Expense' as const,
      },
      {
        icon: 'people' as const,
        label: 'Split',
        color: '#14B8A6',
        route: 'AddExpense',
        tab: 'Expense' as const,
      },
      {
        icon: 'receipt' as const,
        label: 'Bills',
        color: '#4A90D9',
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
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 28, opacity: fadeAnim }}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>This Month</Text>
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
          <Animated.View style={{ paddingHorizontal: 20, marginTop: 28, opacity: fadeAnim }}>
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
        <Animated.View style={{ paddingHorizontal: 20, marginTop: 28, opacity: fadeAnim }}>
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
              <TouchableOpacity onPress={() => navigation.navigate('Expense')}>
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

      {/* AI FAB */}
      <ReAnimated.View style={[s.aiFabWrap, aiPulseAnim]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AIDashboard')}
          style={s.aiFab}
        >
          <Ionicons name="sparkles" size={22} color="#0A0A0A" />
        </TouchableOpacity>
      </ReAnimated.View>

      {/* Expense FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Expense', { screen: 'AddExpense' })}
        style={[s.fab, { backgroundColor: colors.accent.primary }]}
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
  heroCaption: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
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
  statLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
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
    bottom: 24,
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
  aiFabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    zIndex: 10,
  },
  aiFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
