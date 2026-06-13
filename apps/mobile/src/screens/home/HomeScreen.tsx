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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken, clearCache, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useCoupleMode, COUPLE_COLORS } from '../../hooks/useCoupleMode';
import { CoupleModeToggle } from '../../components/ui/CoupleModeToggle';
import { CoupleDashboard } from '../../components/ui/CoupleDashboard';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../config/categoryIcons';
import { Avatar } from '../../components/ui/Avatar';
import { KEYWORD_CATEGORIES } from '../../constants/smartEntryKeywords';
import { useOffline } from '../../store/OfflineContext';

const W = Dimensions.get('window').width;
const BRAND = '#4F46E5';

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

const ACTION_ITEMS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  screen: string;
  params?: any;
}[] = [
  { label: 'Add Expense', icon: 'add-circle', route: 'Expense', screen: 'CategorySelection' },
  {
    label: 'Add Income',
    icon: 'cash',
    route: 'Expense',
    screen: 'CategorySelection',
    params: { type: 'income' },
  },
  { label: 'Split Expense', icon: 'people', route: 'Spaces', screen: 'CreateSharedGroup' },
  { label: 'Scan Receipt', icon: 'scan', route: 'Expense', screen: 'BillScanner' },
  { label: 'Create Budget', icon: 'pie-chart', route: 'Settings', screen: 'BudgetsList' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, accessToken, toggleCoupleMode } = useAuth();
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const parsed = quickEntry.trim() ? parseQuickEntry(quickEntry) : null;
    if (parsed) {
      setQuickType(parsed.type);
    } else {
      setQuickType('expense');
    }
  }, [quickEntry]);

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
      { label: 'Active Goals', value: String(goals.length), color: BRAND },
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

      // Force-settle loading after 3s so user never stares at a skeleton
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
          setRecentTxns((s.recentTransactions || []).slice(0, 5));
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
      } catch {
        /* ignore */
      } finally {
        clearTimeout(settleTimer);
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
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
    return (
      <View style={[page.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, gap: 4 }}>
          <View
            style={{ width: 80, height: 12, borderRadius: 6, backgroundColor: colors.bg.tertiary }}
          />
          <View
            style={{
              width: 140,
              height: 22,
              borderRadius: 6,
              backgroundColor: colors.bg.tertiary,
              marginTop: 2,
            }}
          />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View
            style={{
              width: '100%',
              height: 260,
              borderRadius: 24,
              backgroundColor: colors.bg.tertiary,
            }}
          />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
          <View
            style={{
              width: '100%',
              height: 48,
              borderRadius: 16,
              backgroundColor: colors.bg.tertiary,
            }}
          />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 10 }}>
          <View
            style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: colors.bg.tertiary }}
          />
          <View
            style={{
              width: '100%',
              height: 120,
              borderRadius: 20,
              backgroundColor: colors.bg.tertiary,
            }}
          />
        </View>
      </View>
    );
  }

  if (couple.showCoupleFeatures) {
    return (
      <View style={[page.screen, { backgroundColor: COUPLE_COLORS.bg }]}>
        <View style={page.heartOverlay} pointerEvents="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name="heart"
              size={24 + i * 8}
              color={`${COUPLE_COLORS.heart}08`}
              style={{
                position: 'absolute',
                top: 60 + (i % 3) * 120,
                left: 20 + (i % 2) * (i * 30 + 40),
                transform: [{ rotate: `${i * 15}deg` }],
              }}
            />
          ))}
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100 }}
        >
          <CoupleModeToggle />
          <CoupleDashboard />
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
            tintColor={BRAND}
          />
        }
      >
        <CoupleModeToggle />

        {couple.isInCouple && !couple.isCoupleModeActive && (
          <TouchableOpacity
            style={[
              page.coupleBanner,
              {
                backgroundColor: `${COUPLE_COLORS.primary}10`,
                borderColor: `${COUPLE_COLORS.primary}30`,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => toggleCoupleMode(true)}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: COUPLE_COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="heart" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COUPLE_COLORS.primary }}>
                Couple Mode
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COUPLE_COLORS.textSecondary }}>
                Enable pink theme and couple features
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COUPLE_COLORS.primary} />
          </TouchableOpacity>
        )}

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
                  backgroundColor: `${BRAND}10`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={18} color={BRAND} />
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
              <View style={[page.safePill, { backgroundColor: `${BRAND}10` }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
                    Safe to Spend
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: BRAND,
                      letterSpacing: -0.5,
                      marginTop: 1,
                    }}
                  >
                    {fmt(safeToSpend)}
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={22} color={BRAND} />
              </View>
            )}
          </View>
        </View>

        {/* ─── SECTION 2: QUICK ADD ─── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={[page.quickAddCard, { backgroundColor: colors.bg.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash" size={16} color={BRAND} />
              <TextInput
                style={[page.quickAddInput, { color: colors.text.primary }]}
                placeholder='e.g. "Tea 20"'
                placeholderTextColor={colors.text.tertiary}
                value={quickEntry}
                onChangeText={setQuickEntry}
                onSubmitEditing={() => handleQuickAdd(quickEntry)}
                returnKeyType="done"
                editable={!quickEntryLoading}
              />
              {!quickEntryLoading ? (
                <TouchableOpacity onPress={() => handleQuickAdd(quickEntry)}>
                  <Ionicons name="arrow-forward-circle" size={22} color={BRAND} />
                </TouchableOpacity>
              ) : (
                <ActivityIndicator size="small" color={BRAND} />
              )}
            </View>
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

        {/* ─── SECTION 3: ACTION CENTER ─── */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {ACTION_ITEMS.map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={() => navigation.navigate(a.route, { screen: a.screen, params: a.params })}
                style={[page.actionPill, { backgroundColor: `${BRAND}10` }]}
                activeOpacity={0.7}
              >
                <Ionicons name={a.icon} size={16} color={BRAND} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ─── SECTION 4: INSIGHTS CAROUSEL ─── */}
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

        {/* ─── SECTION 5: THIS MONTH ─── */}
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
          </View>
        </View>

        {/* ─── SECTION 6: SPACES ─── */}
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
              <TouchableOpacity onPress={() => navigation.navigate('Spaces')}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND }}>See All</Text>
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

        {/* ─── SECTION 7: UPCOMING ─── */}
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
                  <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND }}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={BRAND} />
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ width: 50, fontSize: 12, fontWeight: '600', color: '#9CA3AF' }}>{label}</Text>
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={14} color="#9CA3AF" />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#9CA3AF' }}>{label}</Text>
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
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>{label}</Text>
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
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
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
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
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
