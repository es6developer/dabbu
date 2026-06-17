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
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, sectionHeader } from '../../theme/design';
import { WidgetCard } from '../../components/ui/WidgetCard';
import { api, setAccessToken, clearCache, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useCoupleMode, COUPLE_COLORS } from '../../hooks/useCoupleMode';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../config/categoryIcons';
import { Avatar } from '../../components/ui/Avatar';
import { PremiumLoaderScreen } from '../../components/ui/PremiumLoaderScreen';
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

const INSIGHT_ICONS: Record<string, string> = {
  'Net Worth': 'wallet',
  Subscriptions: 'creditcard',
  Loans: 'arrowdown',
  'Active Goals': 'flag',
  'Upcoming Bills': 'filetext1',
  'Budget Health': 'piechart',
};

const QUICK_ACTIONS: {
  label: string;
  icon: string;
  desc: string;
  route: string;
  screen: string;
  params?: any;
}[] = [
  { label: 'Add Expense', icon: 'pluscircle', desc: 'Record a new expense', route: 'Expense', screen: 'AddExpense' },
  { label: 'Add Income', icon: 'wallet', desc: 'Money received', route: 'Expense', screen: 'AddExpense', params: { type: 'income' } },
  { label: 'Wallet', icon: 'wallet', desc: 'View expenses wallet', route: 'Expense', screen: 'ExpenseHome' },
  { label: 'Expense Group', icon: 'team', desc: 'Group expense spaces', route: 'Spaces', screen: 'SharedFinanceHome' },
];

const COMMON_INDIAN_SUGGESTIONS = [
  'Chai',
  'Auto rickshaw',
  'Vegetable vendor',
  'Milk',
  'Kirana store',
  'Petrol',
  'Dosa',
  'Biryani',
  'Metro recharge',
  'Mobile recharge',
  'Electricity bill',
  'House help',
  'Newspaper',
  'Tiffin service',
  'Parking fee',
  'Temple donation',
  'Cable TV',
  'Groceries',
  'Ola',
  'Swiggy',
  'Zomato',
  'Medical store',
  'Gym fee',
  'Salon',
  'Rent',
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, accessToken } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const couple = useCoupleMode();

  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [netWorth, setNetWorth] = useState<number | null>(null);
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
  const [streak, setStreak] = useState(0);
  const [apiHealthScore, setApiHealthScore] = useState<number | null>(null);
  const [apiInsights, setApiInsights] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<any>({ earned: [], all: [], earnedCount: 0, totalCount: 0 });
  const [milestones, setMilestones] = useState<any[]>([]);

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
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    try {
      const parsed = quickEntry.trim() ? parseQuickEntry(quickEntry) : null;
      if (parsed) {
        setQuickType(parsed.type);
      } else {
        setQuickType('expense');
      }
      if (quickEntry.length < 1) {
        setShowSuggestions(false);
        return;
      }
      const lower = quickEntry.toLowerCase();
      const fromRecent = recentTxns
        .map((t: any) => String(t.description || t.title || t.merchant || '').trim())
        .filter(Boolean)
        .filter((d: string) => d.toLowerCase().includes(lower))
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
      const fromIndian = COMMON_INDIAN_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(lower),
      );
      const combined = [...fromRecent, ...fromIndian]
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);
      setSuggestions(combined);
      setShowSuggestions(combined.length > 0);
    } catch { /* ignore suggestion errors */ }
  }, [quickEntry, recentTxns]);

  const savings = Math.max(0, monthlyIncome - monthlySpent);
  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

  const subscriptionTotal = useMemo(() => {
    const sub = categories.find((c) => c.name === 'Subscription');
    return sub ? sub.amount : 0;
  }, [categories]);

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
      { label: 'Net Worth', value: fmt(totalBalance ?? 0), color: colors.status.success },
      { label: 'Subscriptions', value: `${fmt(subscriptionTotal)}/mo`, color: colors.status.warning },
      { label: 'Active Goals', value: String(goals.length), color: colors.accent.primary },
      { label: 'Upcoming Bills', value: String(reminders.length), color: colors.status.error },
      {
        label: 'Budget Health',
        value: `${budgetHealth}%`,
        color: budgetHealth > 70 ? colors.status.success : budgetHealth > 40 ? colors.status.warning : colors.status.error,
      },
    ],
    [totalBalance, subscriptionTotal, goals.length, reminders.length, budgetHealth],
  );

  const hasData = totalBalance !== null && totalBalance > 0 && monthlyIncome > 0;
  const sampleGoals = (!hasData || goals.length === 0) ? [
    { id: 'sample-1', name: 'Emergency Fund', type: 'emergency', saved: 0, target: 200000, monthlyContribution: 5000, isCompleted: false, color: colors.status.error, icon: 'Safety', targetDate: null },
    { id: 'sample-2', name: 'Dream Vacation', type: 'vacation', saved: 0, target: 300000, monthlyContribution: 8000, isCompleted: false, color: '#00B894', icon: 'earth', targetDate: null },
  ] : [];
  const demoGoals = goals.length > 0 ? goals : sampleGoals;
  const sampleTxns: any[] = (!hasData || recentTxns.length === 0) ? [
    { id: 'sample-t1', description: 'Morning Coffee', amount: 45, type: 'expense', category: 'Food', date: new Date().toISOString().split('T')[0] },
    { id: 'sample-t2', description: 'Metro Recharge', amount: 200, type: 'expense', category: 'Transport', date: new Date().toISOString().split('T')[0] },
    { id: 'sample-t3', description: 'Salary Credit', amount: 75000, type: 'income', category: 'Salary', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
    { id: 'sample-t4', description: 'Grocery Store', amount: 1250, type: 'expense', category: 'Groceries', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] },
  ] : [];
  const displayTxns = recentTxns.length > 0 ? recentTxns : sampleTxns;

  const healthScore = useMemo(() => {
    if (apiHealthScore !== null) return apiHealthScore;
    const sr = monthlyIncome > 0 ? Math.min((savings / monthlyIncome) * 100, 100) : 0;
    const bc = Math.max(0, budgetHealth);
    const gp = goals.length > 0
      ? goals.reduce((s: number, g: any) => {
          const progress = (g.currentAmount ?? 0) > 0 && (g.targetAmount ?? 0) > 0
            ? Math.min((g.currentAmount / g.targetAmount) * 100, 100)
            : 0;
          return s + progress;
        }, 0) / goals.length
      : 0;
    const ef = Math.min(((totalBalance ?? 0) / Math.max(monthlyIncome * 6, 1)) * 100, 100);
    const dr = totalBalance !== null && totalBalance >= 0
      ? 100
      : totalBalance !== null
        ? Math.max(0, 100 + (totalBalance ?? 0) / 500)
        : 0;
    return Math.round(Math.min(sr * 0.3 + bc * 0.2 + gp * 0.2 + ef * 0.2 + dr * 0.1, 100));
  }, [apiHealthScore, monthlyIncome, savings, budgetHealth, goals, totalBalance]);

  const monthlyChangePct = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

  const [coachIndex, setCoachIndex] = useState(0);

  const coachInsights = useMemo(() => {
    if (apiInsights.length > 0) return apiInsights;
    const items: string[] = [];
    if (!hasData) {
      items.push('Welcome to Dabbu! Start by adding your first income or expense.');
      items.push('Set a financial goal to track what matters most to you.');
      items.push('Create a shared space to manage money together with your family.');
      return items;
    }
    if (savings > 0) {
      items.push('You saved more than last month');
    }
    if (goals.length > 0) {
      items.push('Your ' + goals[0].name + ' goal is ahead of schedule');
    }
    const foodCat = categories.find(
      (c) => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('grocery'),
    );
    if (foodCat && foodCat.amount > 0) {
      items.push('You can reduce food spending');
    }
    if (items.length === 0) {
      items.push('Your net worth is ' + fmt(totalBalance ?? 0));
    }
    return items;
  }, [apiInsights, savings, goals, categories, totalBalance, hasData]);

  useEffect(() => {
    if (coachInsights.length <= 1) return;
    const timer = setInterval(() => {
      setCoachIndex((prev) => (prev + 1) % coachInsights.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [coachInsights]);

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

      const isFirstLoad = totalBalance === null && !hasLoadedOnce.current;
      if (isRefresh) {
        setRefreshing(true);
      } else if (isFirstLoad) {
        setLoading(true);
        hasLoadedOnce.current = true;
      }

      const totalCalls = 9;
      let completedCalls = 0;
      const tickProgress = isFirstLoad ? () => {
        completedCalls++;
        const pct = Math.min(Math.round((completedCalls / totalCalls) * 100), 95);
        setLoadingProgress(pct);
      } : () => {};

      try {
        const balP = api.get<any>('/accounts/stats', ctrl.signal, 8000).finally(tickProgress);
        const statsP = api.get<any>('/transactions/stats?months=1', ctrl.signal, 8000).finally(tickProgress);
        const remP = api.get<any>('/reminders/upcoming?days=7', ctrl.signal, 8000).finally(tickProgress);
        const goalP = api.get<any>('/goals', ctrl.signal, 8000).finally(tickProgress);
        const notifP = api.get<any>('/notifications/unread-count', ctrl.signal, 8000).finally(tickProgress);
        const billsP = api.get<any>('/bills?status=pending', ctrl.signal, 8000).catch(() => []).finally(tickProgress);
        const spacesP = api.get<any>('/shared-finance/groups', ctrl.signal, 10000).catch(() => []).finally(tickProgress);
        const budgetsP = api.get<any>('/budgets', ctrl.signal, 8000).catch(() => []).finally(tickProgress);
        const wealthP = api.get<any>('/wealth/dashboard', ctrl.signal, 10000).catch(() => null).finally(tickProgress);

        const [balRes, statsRes, remRes, goalRes, notifRes, billsRes, spacesRes, budgetsRes, wealthRes] =
          await Promise.allSettled([balP, statsP, remP, goalP, notifP, billsP, spacesP, budgetsP, wealthP]);

        if (ctrl.signal.aborted) {
          return;
        }

        if (balRes.status === 'fulfilled') {
          const b = balRes.value;
          setTotalBalance(b.totalBalance ?? b.data?.totalBalance ?? 0);
        }

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

        if (remRes.status === 'fulfilled') {
          const list = listFromResponse(remRes.value);
          setReminders(list.slice(0, 5));
        }

        if (goalRes.status === 'fulfilled') {
          const list = listFromResponse(goalRes.value);
          setGoals(list.slice(0, 3));
        }

        if (notifRes.status === 'fulfilled') {
          const n = notifRes.value;
          setUnreadCount(n.count ?? n.data?.count ?? 0);
        }

        if (billsRes.status === 'fulfilled') {
          const billsData = billsRes.value?.data ?? billsRes.value ?? [];
          const bills = Array.isArray(billsData) ? billsData : [];
          setUpcomingBillsTotal(
            bills.reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0),
          );
        }

        if (spacesRes.status === 'fulfilled') {
          setSpaces(listFromResponse(spacesRes.value));
        }

        if (budgetsRes.status === 'fulfilled') {
          setBudgets(listFromResponse(budgetsRes.value));
        }

          if (wealthRes.status === 'fulfilled' && wealthRes.value?.data) {
            const w = wealthRes.value.data;
            if (w.healthScore != null) setApiHealthScore(w.healthScore);
            if (w.insights?.length) setApiInsights(w.insights);
            if (w.achievements) setAchievements(w.achievements);
            if (w.milestones?.length) setMilestones(w.milestones);
            if (w.streak?.currentStreak != null) setStreak(w.streak.currentStreak);
            if (w.netWorth?.netWorth != null) setNetWorth(w.netWorth.netWorth);
          }
      } catch {
        /* ignore */
      } finally {
        if (!ctrl.signal.aborted) {
          if (isFirstLoad) {
            setLoadingProgress(100);
            setTimeout(() => {
              if (!ctrl.signal.aborted) {
                setLoading(false);
                setRefreshing(false);
              }
            }, 400);
          } else {
            setRefreshing(false);
          }
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
    const { desc, amt } = parsed;
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

  if (loading) {
    return (
      <PremiumLoaderScreen progress={loadingProgress} title="Building your Dashboard" icon="layers-outline" tip={loadingTip} />
    );
  }

  if (couple.showCoupleFeatures) {
    return (
      <View style={[page.screen, { backgroundColor: COUPLE_COLORS.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
        >
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: 8 }}>
            {/* Profile header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing['3xl'] }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                  {getGreeting()}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 1 }}>
                  {userName} & {couple.partner?.firstName || 'Partner'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Notifications')}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.accent.primary}10`, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AntDesign name="bells" size={18} color={colors.accent.primary} />
                  {unreadCount > 0 && (
                    <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 15, height: 15, borderRadius: 7.5, backgroundColor: colors.status.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text.inverse }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                  <Avatar uri={user?.avatarUrl} name={`${user?.firstName || ''} ${user?.lastName || ''}`} size={36} />
                </TouchableOpacity>
              </View>
            </View>
            {/* Couple mode cards */}
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
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
                <AntDesign  name="heart" size={28} color={COUPLE_COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                  Couple Space
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                  Budgets, expenses, goals & more
                </Text>
              </View>
              <AntDesign  name="right" size={20} color={colors.text.tertiary} />
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
                <AntDesign  name="linechart" size={24} color={colors.status.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Income</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                  Track earnings together
                </Text>
              </View>
              <AntDesign  name="right" size={20} color={colors.text.tertiary} />
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
                <AntDesign  name="shoppingcart" size={24} color={colors.status.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Expenses</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                  Shared & personal spending
                </Text>
              </View>
              <AntDesign  name="right" size={20} color={colors.text.tertiary} />
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
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.inverse }}>
                Open Couple Space
              </Text>
            </TouchableOpacity>
          </View>
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
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* ─── SECTION 1: HERO — Apple Wallet Widget ─── */}
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: 0 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                {getGreeting()}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 1 }}>
                {userName}
              </Text>
            </View>
            {streak > 0 && (
              <View style={{ backgroundColor: colors.status.error + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13 }}>🔥</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.status.error }}>{streak} days</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.accent.primary}10`, alignItems: 'center', justifyContent: 'center' }}
              >
                <AntDesign name="bells" size={18} color={colors.accent.primary} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 15, height: 15, borderRadius: 7.5, backgroundColor: colors.status.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text.inverse }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                <Avatar uri={user?.avatarUrl} name={`${user?.firstName || ''} ${user?.lastName || ''}`} size={36} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Widget — Net Worth */}
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border.default }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, letterSpacing: 0.3 }}>Net Worth</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>₹</Text>
              <Text style={{ fontSize: 40, fontWeight: '800', color: colors.text.primary, letterSpacing: -2 }}>
                {(netWorth ?? totalBalance ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            {savings > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <AntDesign name="arrowup" size={12} color={colors.status.success} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.status.success }}>{(savingsRate).toFixed(1)}%</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}>Saved {fmtShort(savings)} this month</Text>
              </View>
            )}
          </View>

          {/* Stat widgets row — Income | Spent | Score */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1, backgroundColor: colors.bg.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center', gap: 4 }}>
              <AntDesign name="linechart" size={16} color={colors.status.success} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Income</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.success }}>{fmt(monthlyIncome)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.bg.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center', gap: 4 }}>
              <AntDesign name="shoppingcart" size={16} color={colors.status.error} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Spent</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.error }}>{fmt(monthlySpent)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.bg.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center', gap: 4 }}>
              <AntDesign name="heart" size={16} color={healthScore >= 70 ? colors.status.success : healthScore >= 40 ? colors.status.warning : colors.status.error} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Score</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: healthScore >= 70 ? colors.status.success : healthScore >= 40 ? colors.status.warning : colors.status.error }}>{healthScore}</Text>
            </View>
          </View>
        </View>

        {/* ─── AI FEED ─── */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: 18 }}>
          <WidgetCard title="AI Feed" action={
            <TouchableOpacity onPress={() => navigation.navigate('AiCoach')}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>View All</Text>
            </TouchableOpacity>
          }>
            {coachInsights.length > 0 ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCoachIndex((p) => (p + 1) % coachInsights.length)}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                    <AntDesign name="bulb1" size={18} color={colors.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary, lineHeight: 18 }}>
                      {coachInsights[coachIndex % coachInsights.length]}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                      {coachInsights.map((_: string, idx: number) => (
                        <View key={idx} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: idx === (coachIndex % coachInsights.length) ? colors.accent.primary : colors.border.default }} />
                      ))}
                    </View>
                  </View>
                  <AntDesign name="right" size={14} color={colors.text.tertiary} />
                </TouchableOpacity>
                {milestones.length > 0 && (
                  <View style={{ paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle, gap: 6 }}>
                    {milestones.slice(0, 2).map((m: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.success }} />
                        <Text style={{ fontSize: 12, color: colors.text.secondary, flex: 1 }} numberOfLines={1}>{m.title || m.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={{ fontSize: 13, color: colors.text.tertiary }}>No insights yet. Add more transactions to get AI-powered tips.</Text>
            )}
          </WidgetCard>
        </View>

        {/* ─── SECTION 2: QUICK ADD ─── */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <WidgetCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AntDesign name="bulb1" size={16} color={colors.accent.primary} />
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
                  <AntDesign  name="arrowright" size={22} color={colors.accent.primary} />
                </TouchableOpacity>
              ) : (
                <ActivityIndicator size="small" color={colors.accent.primary} />
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
                    <AntDesign  name="clockcircleo" size={14} color={colors.text.tertiary} />
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                      {s}
                    </Text>
                    <AntDesign  name="up" size={12} color={colors.text.tertiary} />
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
                    <AntDesign  name="checkcircleo" size={16} color={colors.status.success} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.success }}>
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
                    { borderTopColor: colors.border.subtle },
                  ]}
                >
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
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
                      <AntDesign name={catIcon as any} size={14} color={catColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        numberOfLines={1}
                      >
                        {parsed.desc}
                      </Text>
                      <Text style={{ fontSize: 11, color: catColor, fontWeight: '500' }}>
                        {parsed.cat}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: quickType === 'expense' ? colors.status.error : colors.status.success,
                      }}
                    >
                      {quickType === 'expense' ? '-' : '+'}₹{parsed.amt.toLocaleString('en-IN')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setQuickType(quickType === 'expense' ? 'income' : 'expense')}
                      style={[
                        {
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: quickType === 'expense' ? colors.status.error + '18' : colors.status.success + '18',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: quickType === 'expense' ? colors.status.error : colors.status.success,
                        }}
                      >
                        {quickType === 'expense' ? 'EXPENSE' : 'INCOME'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </WidgetCard>
        </View>

        {/* ─── GOALS PREVIEW ─── */}
        {demoGoals.length > 0 && (
          <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Goals</Text>
              {goals.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('Goals', { screen: 'GoalsList' })}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {demoGoals.slice(0, 3).map((g: any) => {
              const saved = Number(g.saved || g.currentAmount || 0);
              const target = Number(g.target || g.targetAmount || 0);
              const mc = Number(g.monthlyContribution || 0);
              const pct = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
              const remaining = Math.max(target - saved, 0);
              const config = { color: g.color || colors.accent.primary, icon: g.icon || 'flag' };
              const monthsLeft = mc > 0 ? Math.ceil(remaining / mc) : 0;
              const eta = mc > 0 ? `${monthsLeft}mo left` : '';
              const tagline = pct === 0 ? 'Not started' : pct >= 100 ? 'Complete!' : `${pct}% complete`;
              return (
                <WidgetCard key={g.id} variant="compact" style={{ marginBottom: spacing.md }}>
                  <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (g.id && !g.id.startsWith('sample-')) {
                      navigation.navigate('Goals', { screen: 'GoalDetail', params: { goalId: g.id, goalName: g.name } });
                    }
                  }}
                  >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: config.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                      <AntDesign name={config.icon as any} size={18} color={config.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>{g.name || 'Goal'}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary, marginTop: 1 }}>{tagline} · {fmt(remaining)} left{eta ? ` · ${eta}` : ''}</Text>
                    </View>
                  </View>
                  <View style={{ height: 5, backgroundColor: colors.border.subtle, borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: config.color, borderRadius: 99 }} />
                  </View>
                </TouchableOpacity>
              </WidgetCard>
              );
            })}
          </View>
        )}

          {/* ─── SECTION 3: QUICK ACTIONS GRID — 4 per row ─── */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <Text style={[sectionHeader, { color: colors.text.secondary }]}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={() => navigation.navigate(a.route, { screen: a.screen, params: a.params })}
                style={[page.actionCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[page.actionIconWrap, { backgroundColor: colors.accent.primary }]}>
                  <AntDesign name={a.icon as any} size={20} color="#FFF" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.primary, marginTop: 6 }} numberOfLines={1}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── SECTION 4: RECENT TRANSACTIONS ─── */}
        {(recentTxns.length > 0 || !hasData) && (
          <View style={{ marginTop: spacing.xl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.xl,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Recent Activity
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
            <View
              style={{
                marginHorizontal: spacing.xl,
              }}
            >
            <WidgetCard>
              {displayTxns.slice(0, 5).map((tx: any, i: number) => {
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
                        <AntDesign
                          name={(isExpense ? 'arrowup' : 'arrowdown') as any}
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
                          {((tx.category as any)?.name || tx.category || tx.cat || '')}
                          {tx.date ? ` · ${fmtDate(tx.date)}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isExpense ? colors.text.primary : colors.status.success,
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
            </WidgetCard>
            </View>
          </View>
        )}

        {/* ─── SECTION 6: INSIGHTS CAROUSEL ─── */}
        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text.primary,
              paddingHorizontal: spacing.xl,
              marginBottom: 12,
            }}
          >
            Insights
          </Text>
          <View style={{ paddingHorizontal: spacing.xl }}>
          <WidgetCard style={{ paddingVertical: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md }}
          >
            {insights.map((ins) => (
              <View
                key={ins.label}
                style={{ width: 100, alignItems: 'center', paddingVertical: 8 }}
              >
                <View style={[page.insightIcon, { backgroundColor: `${ins.color}12` }]}>
                  <AntDesign
                    name={(INSIGHT_ICONS[ins.label] || 'ellipsis1') as any}
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
              </View>
            ))}
          </ScrollView>
          </WidgetCard>
          </View>
        </View>

        {/* ─── SECTION 7: THIS MONTH ─── */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
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
          <WidgetCard>
            <MonthBar
              label="Income"
              value={monthlyIncome}
              max={monthlyIncome}
              color={colors.status.success}
              fmt={fmtShort}
            />
            <MonthBar
              label="Spent"
              value={monthlySpent}
              max={monthlyIncome}
              color={colors.status.error}
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
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.success }}>
                  {fmtShort(savings)}
                </Text>
                {savingsRate > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: `${savingsRate >= 30 ? colors.status.success : colors.status.warning}15`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: savingsRate >= 30 ? colors.status.success : colors.status.warning,
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
                    backgroundColor: `${colors.status.success}15`,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(savingsRate, 100)}%`,
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: savingsRate >= 30 ? colors.status.success : colors.status.warning,
                    }}
                  />
                </View>
              </View>
            )}
          </WidgetCard>
        </View>

        {/* ─── SECTION 8: SPACES ─── */}
        {spaces.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.xl,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Spaces
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Spaces', { screen: 'SharedFinanceHome' })}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
              {spaces.slice(0, 4).map((g: any) => {
                const { owedToMe, iOwe, totalSpent, memberCount } = deriveGroupBalance(g, user?.id);
                const isOwed = owedToMe > 0;
                const owes = iOwe > 0;
                const activeAmount = isOwed ? owedToMe : owes ? iOwe : 0;
                const amtColor = isOwed ? colors.status.success : owes ? colors.status.error : colors.text.tertiary;
                const statusLabel = isOwed ? 'You are owed' : owes ? 'You owe' : 'Settled';
                return (
                  <WidgetCard key={g.id} variant="compact">
                  <TouchableOpacity
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
                </WidgetCard>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── SECTION 9: UPCOMING ─── */}
        {reminders.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
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
            <WidgetCard>
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
                          color: isOverdue ? colors.status.error : colors.text.tertiary,
                        }}
                      >
                        {due}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 1,
                        height: 24,
                        backgroundColor: isOverdue ? colors.status.error : colors.border.subtle,
                      }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: '600',
                        color: isOverdue ? colors.status.error : colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {r.title || r.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: isOverdue ? colors.status.error : colors.text.primary,
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
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>View All</Text>
                  <AntDesign  name="right" size={14} color={colors.accent.primary} />
                </TouchableOpacity>
              )}
            </WidgetCard>
          </View>
        )}

        {/* Achievements */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
            Achievements
          </Text>
          <WidgetCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>
                Badges Earned
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent.primary }}>
                {achievements.earnedCount}/{achievements.totalCount || 0}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(achievements.earned.length > 0 ? achievements.earned : []).slice(0, 4).map((ach: any) => (
                <View key={ach.id || ach.code} style={{ flex: 1, minWidth: '45%', alignItems: 'center', padding: 8 }}>
                  <Text style={{ fontSize: 28 }}>{ach.icon || '\uD83C\uDFC6'}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.primary, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                    {ach.name || ach.code}
                  </Text>
                </View>
              ))}
            </View>
          </WidgetCard>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickAddCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
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
    width: (W - spacing.xl * 2 - spacing.md * 3) / 4,
    borderRadius: 16,
    padding: spacing.sm,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  spaceCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0.5,
  },
  upcomingCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
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
