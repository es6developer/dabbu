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
  Keyboard,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken, clearCache, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useCoupleMode, COUPLE_COLORS } from '../../hooks/useCoupleMode';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../config/categoryIcons';
import { Avatar } from '../../components/ui/Avatar';
import { KEYWORD_CATEGORIES } from '../../constants/smartEntryKeywords';
import { useOffline } from '../../store/OfflineContext';

const W = Dimensions.get('window').width;

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) {
    return 'Good Morning';
  }
  if (h < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
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

function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) {
    return 'Overdue';
  }
  if (days === 1) {
    return 'Tomorrow';
  }
  return `${days} Days`;
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

function deriveGroupBalance(group: any, currentUserId: string | undefined) {
  const memberCount = group.members?.length || group._count?.members || 0;
  const totalSpent = group.totalSpent ?? 0;
  const balances = group.balances || [];
  let owedToMe = 0,
    iOwe = 0,
    unsettledOthers = 0;
  if (currentUserId && balances.length > 0) {
    const myEntry = balances.find((b: any) => b.userId === currentUserId);
    if (myEntry) {
      const bal = Number(myEntry.balance);
      if (bal > 0) {
        owedToMe = bal;
      } else if (bal < 0) {
        iOwe = Math.abs(bal);
      }
    }
    unsettledOthers = balances.filter(
      (b: any) => b.userId !== currentUserId && Math.abs(Number(b.balance)) > 0.99,
    ).length;
  }
  return { owedToMe, iOwe, totalSpent, memberCount, unsettledOthers };
}

const INSIGHT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Net Worth': 'wallet',
  Subscriptions: 'card',
  Loans: 'trending-down',
  'Active Goals': 'flag',
  'Upcoming Bills': 'receipt',
  'Budget Health': 'pie-chart',
};

const QUICK_ACTIONS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
  route: string;
  screen: string;
  params?: any;
}[] = [
  { label: 'Add Expense', icon: 'add-circle', desc: 'Record a new expense', route: 'Expense', screen: 'CategorySelection' },
  { label: 'Add Income', icon: 'cash', desc: 'Money received', route: 'Expense', screen: 'CategorySelection', params: { type: 'income' } },
  { label: 'Create Circle', icon: 'people', desc: 'Group expenses', route: 'Circles', screen: 'CreateCircle' },
  { label: 'Create Space', icon: 'planet', desc: 'Shared finance space', route: 'Spaces', screen: 'CreateSharedGroup' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, accessToken } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const couple = useCoupleMode();

  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [categories, setCategories] = useState<{ name: string; amount: number }[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingBillsTotal, setUpcomingBillsTotal] = useState(0);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [quickEntry, setQuickEntry] = useState('');
  const [quickEntryLoading, setQuickEntryLoading] = useState(false);
  const [quickType, setQuickType] = useState<'expense' | 'income'>('expense');
  const [quickSuccess, setQuickSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const quickInputRef = useRef<TextInput>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTip] = useState(() => {
    const tips = [
      'Analyzing your spending patterns...',
      'Calculating monthly trends...',
      'Checking upcoming bills...',
      'Syncing shared expenses...',
      'Preparing your insights...',
      'Reviewing budget health...',
      'Fetching recent transactions...',
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  });
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loadBarAnim = useRef(new Animated.Value(0)).current;
  const loadFadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const parsed = quickEntry.trim() ? parseQuickEntry(quickEntry) : null;
    if (parsed) {
      setQuickType(parsed.type);
    } else {
      setQuickType('expense');
    }
    if (quickEntry.length >= 1 && recentTxns.length > 0) {
      const lower = quickEntry.toLowerCase();
      const matches = recentTxns
        .map((t: any) => (t.description || t.title || t.merchant || '').trim())
        .filter(Boolean)
        .filter((d: string) => d.toLowerCase().includes(lower))
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
        .slice(0, 4);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [quickEntry, recentTxns]);

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    );
    if (loading && totalBalance === null) {
      spin.start();
    } else {
      spinAnim.setValue(0);
      spin.stop();
    }
    return () => spin.stop();
  }, [loading, totalBalance]);

  useEffect(() => {
    if (loading && totalBalance === null) {
      Animated.timing(loadFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const savings = Math.max(0, monthlyIncome - monthlySpent);
  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

  const subscriptionTotal = useMemo(() => {
    const sub = categories.find((c) => c.name === 'Subscription');
    return sub ? sub.amount : 0;
  }, [categories]);

  const safeToSpend = Math.max(0, (totalBalance ?? 0) - upcomingBillsTotal - subscriptionTotal);

  const budgetHealth = useMemo(() => {
    if (budgets.length === 0) {
      return 100;
    }
    const totalBudget = budgets.reduce((s, b) => s + Number(b.limit || b.amount || 0), 0);
    const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || b.currentSpent || 0), 0);
    if (totalBudget === 0) {
      return 100;
    }
    return Math.round((1 - totalSpent / totalBudget) * 100);
  }, [budgets]);

  const insights = useMemo(
    () => [
      { label: 'Net Worth', value: fmt(totalBalance ?? 0), color: '#10B981' },
      { label: 'Subscriptions', value: `${fmt(subscriptionTotal)}/mo`, color: '#F59E0B' },
      { label: 'Active Goals', value: String(goals.length), color: colors.brand.primary },
      { label: 'Upcoming Bills', value: String(reminders.length), color: '#EF4444' },
      {
        label: 'Budget Health',
        value: `${budgetHealth}%`,
        color: budgetHealth > 70 ? '#10B981' : budgetHealth > 40 ? '#F59E0B' : '#EF4444',
      },
    ],
    [totalBalance, subscriptionTotal, goals.length, reminders.length, budgetHealth],
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }

      // Warm up backend in parallel so cold start begins immediately
      warmupBackend().catch(() => {});

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const totalCalls = 8;
      let completedCalls = 0;
      const tickProgress = () => {
        completedCalls++;
        const pct = Math.min(Math.round((completedCalls / totalCalls) * 100), 95);
        setLoadingProgress(pct);
        Animated.timing(loadBarAnim, {
          toValue: pct / 100,
          duration: 300,
          useNativeDriver: false,
        }).start();
      };

      // Minimum display time so the loading screen feels substantial
      const settleTimer = setTimeout(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }, 3000);

      try {
        const [balRes, statsRes, remRes, goalRes, notifRes, billsRes, spacesRes, budgetsRes] =
          await Promise.allSettled([
            api.get<any>('/accounts/stats', ctrl.signal),
            api.get<any>('/transactions/stats?months=1', ctrl.signal),
            api.get<any>('/reminders/upcoming?days=7', ctrl.signal),
            api.get<any>('/goals', ctrl.signal),
            api.get<any>('/notifications/unread-count', ctrl.signal),
            api.get<any>('/bills?status=pending', ctrl.signal).catch(() => []),
            api.get<any>('/shared-finance/groups', ctrl.signal).catch(() => []),
            api.get<any>('/budgets', ctrl.signal).catch(() => []),
          ]);

        clearTimeout(settleTimer);

        if (ctrl.signal.aborted) {
          return;
        }

        if (balRes.status === 'fulfilled') {
          const b = balRes.value;
          setTotalBalance(b.totalBalance ?? b.data?.totalBalance ?? 0);
        }
        tickProgress();

        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value?.data ?? statsRes.value;
          setMonthlyIncome(s.summary?.totalIncome ?? 0);
          setMonthlySpent(s.summary?.totalExpense ?? 0);
          const cats: { name: string; amount: number }[] = (s.categoryBreakdown || []).map(
            (c: any) => ({
              name: c.name === 'Uncategorized' || !c.name ? 'Other' : c.name,
              amount: Number(c.amount || 0),
            }),
          );
          const grouped: Record<string, number> = {};
          cats.forEach((c) => {
            grouped[c.name] = (grouped[c.name] || 0) + c.amount;
          });
          setCategories(Object.entries(grouped).map(([name, amount]) => ({ name, amount })));
          setRecentTxns((s.recentTransactions || []).slice(0, 10));
        }
        tickProgress();

        if (remRes.status === 'fulfilled') {
          const list = listFromResponse(remRes.value);
          setReminders(list.slice(0, 5));
        }
        tickProgress();

        if (goalRes.status === 'fulfilled') {
          const list = listFromResponse(goalRes.value);
          setGoals(list.slice(0, 3));
        }
        tickProgress();

        if (notifRes.status === 'fulfilled') {
          const n = notifRes.value;
          setUnreadCount(n.count ?? n.data?.count ?? 0);
        }
        tickProgress();

        if (billsRes.status === 'fulfilled') {
          const billsData = billsRes.value?.data ?? billsRes.value ?? [];
          const bills = Array.isArray(billsData) ? billsData : [];
          setUpcomingBillsTotal(
            bills.reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0),
          );
        }
        tickProgress();

        if (spacesRes.status === 'fulfilled') {
          setSpaces(listFromResponse(spacesRes.value));
        }
        tickProgress();

        if (budgetsRes.status === 'fulfilled') {
          setBudgets(listFromResponse(budgetsRes.value));
        }
        tickProgress();
      } catch {
        /* ignore */
      } finally {
        clearTimeout(settleTimer);
        if (!ctrl.signal.aborted) {
          Animated.timing(loadBarAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }).start();
          setLoadingProgress(100);
          setTimeout(() => {
            if (!ctrl.signal.aborted) {
              setLoading(false);
              setRefreshing(false);
            }
          }, 400);
        }
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const INCOME_KEYWORDS = new Set([
    'salary',
    'freelance',
    'freelancing',
    'business',
    'interest',
    'dividend',
    'refund',
    'cashback',
    'gift',
    'donation',
    'income',
    'profit',
    'bonus',
    'commission',
    'rental',
    'investment',
    'stipend',
    'pension',
  ]);

  function parseQuickEntry(
    text: string,
  ): { desc: string; amt: number; type: 'expense' | 'income'; cat: string } | null {
    let input = text.trim();
    let forcedType: 'expense' | 'income' | null = null;
    if (input.startsWith('+')) {
      forcedType = 'income';
      input = input.slice(1).trim();
    } else if (input.startsWith('-')) {
      forcedType = 'expense';
      input = input.slice(1).trim();
    }
    const match = input.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (!match) {
      return null;
    }
    const desc = match[1].trim();
    const amt = parseFloat(match[2]);
    if (amt <= 0) {
      return null;
    }
    const lower = desc.toLowerCase();
    let cat = 'Other';
    let detectedType: 'expense' | 'income' = 'expense';
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORIES)) {
      if (lower.includes(keyword)) {
        cat = category;
        if (INCOME_KEYWORDS.has(keyword)) {
          detectedType = 'income';
        }
        break;
      }
    }
    return { desc, amt, type: forcedType || detectedType, cat };
  }

  async function handleQuickAdd(text: string) {
    const parsed = parseQuickEntry(text);
    if (!parsed) {
      return;
    }
    const { desc, amt, cat } = parsed;
    setQuickEntry('');
    setQuickEntryLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post('/transactions', {
        amount: amt,
        type: quickType,
        description: desc,
        date: new Date().toISOString(),
      });
      setQuickSuccess(true);
      setTimeout(() => setQuickSuccess(false), 2000);
      loadData(true);
    } catch {
      Keyboard.dismiss();
    } finally {
      setQuickEntryLoading(false);
    }
  }

  const userName = user?.firstName || 'User';

  if (loading && totalBalance === null) {
    const spinDeg = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    return (
      <View style={[page.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={[`${colors.brand.primary}08`, `${colors.bg.primary}`, `${colors.bg.primary}`]}
          locations={[0, 0.6, 1]}
          style={{ flex: 1 }}
        >
          <Animated.View
            style={{ flex: 1, opacity: loadFadeAnim, paddingTop: insets.top + 80, alignItems: 'center', paddingHorizontal: 40 }}
          >
            {/* Animated icon */}
            <View style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              backgroundColor: `${colors.brand.primary}12`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}>
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <Ionicons name="layers-outline" size={40} color={colors.brand.primary} />
              </Animated.View>
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 22,
              fontWeight: '800',
              color: colors.text.primary,
              textAlign: 'center',
              letterSpacing: -0.5,
            }}>
              Building your Dashboard
            </Text>

            {/* Subtitle */}
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: colors.text.tertiary,
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 20,
            }}>
              {loadingTip}
            </Text>

            {/* Progress bar */}
            <View style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              backgroundColor: `${colors.brand.primary}12`,
              marginTop: 36,
              overflow: 'hidden',
            }}>
              <Animated.View style={{
                height: '100%',
                borderRadius: 3,
                backgroundColor: colors.brand.primary,
                width: loadBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }} />
            </View>

            {/* Percentage */}
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: colors.text.tertiary,
              marginTop: 10,
              fontVariant: ['tabular-nums'],
            }}>
              {loadingProgress}%
            </Text>

            {/* Fun fact area */}
            <View style={{
              marginTop: 48,
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: `${colors.brand.primary}08`,
              width: '100%',
              alignItems: 'center',
            }}>
              <Ionicons name="bulb-outline" size={18} color={colors.brand.primary} />
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: colors.text.tertiary,
                textAlign: 'center',
                marginTop: 6,
                lineHeight: 17,
              }}>
                Did you know?{'\n'}Track recurring expenses to spot savings opportunities
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  if (couple.showCoupleFeatures) {
    return (
      <View style={[page.screen, { backgroundColor: COUPLE_COLORS.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings', { screen: 'CoupleSpace' })}
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: 20,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: `${COUPLE_COLORS.primary}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="heart-circle" size={28} color={COUPLE_COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                  Couple Space
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                  Budgets, expenses, goals & more
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings', { screen: 'CoupleSpace', params: { screen: 'CoupleIncome' } })}
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: 20,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: `${colors.status.success}18`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="trending-up" size={24} color={colors.status.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Income</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                  Track earnings together
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings', { screen: 'CoupleSpace', params: { screen: 'CoupleExpenses' } })}
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: 20,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: `${colors.status.error}18`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="cart" size={24} color={colors.status.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Expenses</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                  Shared & personal spending
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings', { screen: 'CoupleSpace' })}
              style={{
                backgroundColor: COUPLE_COLORS.primary,
                borderRadius: 20,
                padding: 18,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
                Open Couple Space
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[page.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              clearCache();
              loadData(true);
            }}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* ─── SECTION 1: HERO FINANCIAL SUMMARY ─── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 0 }}>
          {/* Header row */}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                {getGreeting()}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: colors.text.primary,
                  marginTop: 1,
                }}
              >
                {userName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${colors.brand.primary}10`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={18} color={colors.brand.primary} />
                {unreadCount > 0 && (
                  <View style={page.badge}>
                    <Text style={page.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                <Avatar
                  uri={user?.avatarUrl}
                  name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                  size={36}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Card */}
          <View style={[page.heroCard, { backgroundColor: colors.bg.card }]}>
            {/* Total Balance */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.text.tertiary,
                letterSpacing: 0.3,
              }}
            >
              Total Balance
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>₹</Text>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: colors.text.primary,
                  letterSpacing: -1.5,
                }}
              >
                {(totalBalance ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {/* This Month breakdown */}
            <View style={[page.heroMonth, { backgroundColor: colors.bg.primary }]}>
              <HeroMonthRow
                label="Income"
                value={fmtShort(monthlyIncome)}
                color="#10B981"
                pct={monthlyIncome > 0 ? 100 : 0}
              />
              <HeroMonthRow
                label="Spent"
                value={fmtShort(monthlySpent)}
                color="#EF4444"
                pct={monthlyIncome > 0 ? (monthlySpent / monthlyIncome) * 100 : 0}
              />
              <HeroMonthRow
                label="Saved"
                value={fmtShort(savings)}
                color="#10B981"
                pct={monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0}
                badge={savingsRate > 0 ? `${savingsRate.toFixed(0)}%` : undefined}
              />
            </View>

            {/* Divider */}
            <View
              style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 14 }}
            />

            {/* Obligations */}
            <View style={{ gap: 8 }}>
              <ObligationRow
                icon="receipt-outline"
                label="Upcoming Bills"
                value={fmt(upcomingBillsTotal)}
                valueColor={colors.text.primary}
              />
              <ObligationRow
                icon="card-outline"
                label="Subscriptions"
                value={fmt(subscriptionTotal)}
                valueColor={colors.text.primary}
              />
            </View>

            {/* Safe to Spend */}
            {totalBalance !== null && (
              <View style={[page.safePill, { backgroundColor: `${colors.brand.primary}12` }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
                    Safe to Spend
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: colors.brand.primary,
                      letterSpacing: -0.5,
                      marginTop: 1,
                    }}
                  >
                    {fmt(safeToSpend)}
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={22} color={colors.brand.primary} />
              </View>
            )}
          </View>
        </View>

        {/* ─── SECTION 2: QUICK ADD ─── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={[page.quickAddCard, { backgroundColor: colors.bg.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash" size={16} color={colors.brand.primary} />
              <TextInput
                ref={quickInputRef}
                style={[page.quickAddInput, { color: colors.text.primary }]}
                placeholder='e.g. "Tea 20"'
                placeholderTextColor={colors.text.tertiary}
                value={quickEntry}
                onChangeText={setQuickEntry}
                onSubmitEditing={() => { setShowSuggestions(false); handleQuickAdd(quickEntry); }}
                returnKeyType="done"
                editable={!quickEntryLoading}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {!quickEntryLoading ? (
                <TouchableOpacity onPress={() => { setShowSuggestions(false); handleQuickAdd(quickEntry); }}>
                  <Ionicons name="arrow-forward-circle" size={22} color={colors.brand.primary} />
                </TouchableOpacity>
              ) : (
                <ActivityIndicator size="small" color={colors.brand.primary} />
              )}
            </View>
            {showSuggestions && suggestions.length > 0 && (
              <View style={[page.suggestionsWrap, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                {suggestions.map((s: string, i: number) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      page.suggestionRow,
                      i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
                    ]}
                    onPress={() => {
                      setQuickEntry(s + ' ');
                      setShowSuggestions(false);
                      quickInputRef.current?.focus();
                    }}
                  >
                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                      {s}
                    </Text>
                    <Ionicons name="arrow-up" size={12} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {(() => {
              const parsed = quickEntry.trim() ? parseQuickEntry(quickEntry) : null;
              if (quickSuccess) {
                return (
                  <View
                    style={[
                      page.quickCat,
                      { borderTopColor: colors.border.subtle, justifyContent: 'center' },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
                      Added!
                    </Text>
                  </View>
                );
              }
              if (!parsed) {
                return null;
              }
              const catIcon = (CATEGORY_ICONS as any)[parsed.cat] || 'ellipsis-horizontal';
              const catColor = (CATEGORY_COLORS as any)[parsed.cat] || '#636E72';
              return (
                <View
                  style={[
                    page.quickCat,
                    { borderTopColor: colors.border.subtle, flexDirection: 'column', gap: 8 },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: `${catColor}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={catIcon as any} size={14} color={catColor} />
                      </View>
                      <View>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {parsed.desc}
                        </Text>
                        <Text style={{ fontSize: 11, color: catColor, fontWeight: '500' }}>
                          {parsed.cat}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: quickType === 'expense' ? '#EF4444' : '#10B981',
                        }}
                      >
                        {quickType === 'expense' ? '-' : '+'}₹{parsed.amt.toLocaleString('en-IN')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setQuickType(quickType === 'expense' ? 'income' : 'expense')}
                        style={[
                          {
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: quickType === 'expense' ? '#FEE2E2' : '#D1FAE5',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: quickType === 'expense' ? '#DC2626' : '#059669',
                          }}
                        >
                          {quickType === 'expense' ? 'EXPENSE' : 'INCOME'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        {/* ─── SECTION 3: QUICK ACTIONS GRID ─── */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={() => navigation.navigate(a.route, { screen: a.screen, params: a.params })}
                style={[page.actionCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[page.actionIconWrap, { backgroundColor: `${colors.brand.primary}12` }]}>
                  <Ionicons name={a.icon} size={22} color={colors.brand.primary} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary, marginTop: 8 }}>
                  {a.label}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary, marginTop: 1 }}>
                  {a.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── SECTION 4: RECENT TRANSACTIONS ─── */}
        {recentTxns.length > 0 && (
          <View style={{ marginTop: 26 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Recent Activity
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Expense', { screen: 'ExpenseHome', params: { initialTab: 'MyWallet' } })}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                marginHorizontal: 20,
                borderRadius: 20,
                backgroundColor: colors.bg.card,
                padding: 16,
              }}
            >
              {recentTxns.slice(0, 5).map((tx: any, i: number) => {
                const isExpense = tx.type === 'expense' || tx.amount < 0;
                const amt = Math.abs(Number(tx.amount || 0));
                return (
                  <TouchableOpacity
                    key={tx.id || i}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Expense', { screen: 'TransactionDetail', params: { transactionId: tx.id } })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: isExpense
                            ? `${colors.status.error}14`
                            : `${colors.status.success}14`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name={isExpense ? 'arrow-up' : 'arrow-down'}
                          size={18}
                          color={isExpense ? colors.status.error : colors.status.success}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
                        >
                          {tx.description || tx.title || tx.merchant || 'Transaction'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '500',
                            color: colors.text.tertiary,
                            marginTop: 2,
                          }}
                        >
                          {tx.category || tx.cat || ''}
                          {tx.date ? ` · ${fmtDate(tx.date)}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isExpense ? colors.text.primary : '#10B981',
                        }}
                      >
                        {isExpense ? '' : '+'}₹{amt.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    {i < recentTxns.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: colors.border.subtle,
                          marginLeft: 52,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── SECTION 6: INSIGHTS CAROUSEL ─── */}
        <View style={{ marginTop: 26 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text.primary,
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            Insights
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {insights.map((ins) => (
              <TouchableOpacity
                key={ins.label}
                style={[page.insightCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[page.insightIcon, { backgroundColor: `${ins.color}12` }]}>
                  <Ionicons
                    name={INSIGHT_ICONS[ins.label] || 'ellipsis-horizontal'}
                    size={18}
                    color={ins.color}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.text.tertiary,
                    marginTop: 6,
                  }}
                >
                  {ins.label}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: colors.text.primary,
                    marginTop: 2,
                  }}
                >
                  {ins.value}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ─── SECTION 7: THIS MONTH ─── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text.primary,
              marginBottom: 14,
            }}
          >
            This Month
          </Text>
          <View style={[page.monthCard, { backgroundColor: colors.bg.card }]}>
            <MonthBar
              label="Income"
              value={monthlyIncome}
              max={monthlyIncome}
              color="#10B981"
              fmt={fmtShort}
            />
            <MonthBar
              label="Spent"
              value={monthlySpent}
              max={monthlyIncome}
              color="#EF4444"
              fmt={fmtShort}
            />
            <View
              style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 12 }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                Saved
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>
                  {fmtShort(savings)}
                </Text>
                {savingsRate > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: `${savingsRate >= 30 ? '#10B981' : '#F59E0B'}15`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: savingsRate >= 30 ? '#10B981' : '#F59E0B',
                      }}
                    >
                      {savingsRate.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {monthlyIncome > 0 && (
              <View style={{ marginTop: 8 }}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#10B98115',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(savingsRate, 100)}%`,
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: savingsRate >= 30 ? '#10B981' : '#F59E0B',
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ─── SECTION 8: SPACES ─── */}
        {spaces.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Spaces
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Spaces', { screen: 'SharedFinanceHome' })}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.primary }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {spaces.slice(0, 4).map((g: any) => {
                const { owedToMe, iOwe, totalSpent, memberCount } = deriveGroupBalance(g, user?.id);
                const isOwed = owedToMe > 0;
                const owes = iOwe > 0;
                const activeAmount = isOwed ? owedToMe : owes ? iOwe : 0;
                const amtColor = isOwed ? '#10B981' : owes ? '#EF4444' : colors.text.tertiary;
                const statusLabel = isOwed ? 'You are owed' : owes ? 'You owe' : 'Settled';
                return (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (g.type === 'couple') {
                        navigation.navigate('CoupleFinance', { groupId: g.id, groupName: g.name });
                      } else if (g.type === 'family') {
                        navigation.navigate('FamilyDashboard', {
                          groupId: g.id,
                          groupName: g.name,
                        });
                      } else {
                        navigation.navigate('SharedGroupDetail', {
                          groupId: g.id,
                          groupName: g.name,
                        });
                      }
                    }}
                    style={[page.spaceCard, { backgroundColor: colors.bg.card }]}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}
                        numberOfLines={1}
                      >
                        {g.name || g.title}
                      </Text>
                      <Text
                        style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}
                      >
                        {memberCount} member{memberCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}
                    >
                      {activeAmount > 0 ? (
                        <>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: '800',
                              color: amtColor,
                              letterSpacing: -0.3,
                            }}
                          >
                            ₹{Math.round(activeAmount).toLocaleString('en-IN')}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: amtColor }}>
                            {statusLabel}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}
                        >
                          {totalSpent > 0 ? 'All settled up' : 'No activity'}
                        </Text>
                      )}
                    </View>
                    {totalSpent > 0 && (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '500',
                          color: colors.text.tertiary,
                          marginTop: 2,
                        }}
                      >
                        ₹{(totalSpent || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                        total
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── SECTION 9: UPCOMING ─── */}
        {reminders.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Upcoming
            </Text>
            <View style={[page.upcomingCard, { backgroundColor: colors.bg.card }]}>
              {reminders.slice(0, 4).map((r, i) => {
                const due = daysUntil(r.dueDate || r.date);
                const isOverdue = due === 'Overdue';
                const amt = Number(r.amount || 0);
                return (
                  <TouchableOpacity
                    key={r.id || i}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('Reminders', {
                        screen: 'ReminderDetail',
                        params: { id: r.id },
                      })
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <View style={{ width: 56, alignItems: 'center' }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isOverdue ? '#EF4444' : colors.text.tertiary,
                        }}
                      >
                        {due}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 1,
                        height: 24,
                        backgroundColor: isOverdue ? '#EF4444' : colors.border.subtle,
                      }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: '600',
                        color: isOverdue ? '#EF4444' : colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {r.title || r.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: isOverdue ? '#EF4444' : colors.text.primary,
                      }}
                    >
                      {fmt(amt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {reminders.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Reminders')}
                  style={[page.seeAllBtn, { borderTopColor: colors.border.subtle }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.primary }}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.brand.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function HeroMonthRow({
  label,
  value,
  color,
  pct,
  badge,
}: {
  label: string;
  value: string;
  color: string;
  pct: number;
  badge?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ width: 50, fontSize: 12, fontWeight: '600', color: colors.text.tertiary }}>{label}</Text>
      <View
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: `${color}18`,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color, minWidth: 60, textAlign: 'right' }}>
        {value}
      </Text>
      {badge && (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: `${color}15`,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color }}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function ObligationRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={14} color={colors.text.tertiary} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: valueColor }}>{value}</Text>
    </View>
  );
}

function MonthBar({
  label,
  value,
  max,
  color,
  fmt: formatFn,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  fmt: (v: number) => string;
}) {
  const { colors } = useTheme();
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>{formatFn(value)}</Text>
      </View>
      <View
        style={{ height: 8, borderRadius: 4, backgroundColor: `${color}15`, overflow: 'hidden' }}
      >
        <View
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

const page = StyleSheet.create({
  screen: { flex: 1 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FF4545',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  heroMonth: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  safePill: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickAddCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  quickCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  actionCard: {
    width: (W - 20 * 2 - 10) / 2,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  insightCard: {
    width: (W - 20 * 2 - 10 * 2) / 3,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  spaceCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  upcomingCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  coupleBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
});
