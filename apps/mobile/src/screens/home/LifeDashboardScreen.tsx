import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken, clearCache, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSpaceStore } from '../../store/spaceStore';
import { useDabbuScoreStore } from '../../store/dabbuScoreStore';
import { useLensStore } from '../../store/lensStore';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';

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
  if (res.data && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

const SPACE_EMOJIS: Record<string, string> = {
  PERSONAL: '💼',
  COUPLE: '❤️',
  FAMILY: '👨‍👩‍👧‍👦',
  HOME: '🏠',
  BABY: '👶',
  WEDDING: '💍',
  CAR: '🚗',
  TRIP: '🌍',
  EDUCATION: '🎓',
  VACATION: '🌴',
  RETIREMENT: '📈',
  BUSINESS: '💼',
  CUSTOM: '📁',
};

export function LifeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuth();
  const { spaces } = useSpaceStore();
  const improvements = useDabbuScoreStore((s) => s.improvements);
  const activeLens = useLensStore((s) => s.activeLens);
  const scoreComponents = useDabbuScoreStore((s) => s.components);
  const fetchImprovements = useDabbuScoreStore((s) => s.fetchImprovements);
  const fetchComponents = useDabbuScoreStore((s) => s.fetchComponents);

  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(false);

  const [aiFeed, setAiFeed] = useState<any[]>([]);
  const [aiFeedLoading, setAiFeedLoading] = useState(false);
  const [savingsTips, setSavingsTips] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [lensLoading, setLensLoading] = useState(false);

  const userName = user?.firstName || 'User';
  const greeting = getGreeting();

  const monthlySavings = Math.max(0, monthlyIncome - monthlySpent);
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  const loadData = useCallback(
    async (isRefresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }

      warmupBackend().catch(() => {});

      const isFirstLoad = totalBalance === null && !hasLoadedOnce.current;
      if (isRefresh) {
        setRefreshing(true);
      } else if (isFirstLoad) {
        setLoading(true);
        hasLoadedOnce.current = true;
      }
      setError(null);

      try {
        const statsP = api.get<any>('/transactions/stats?months=1', ctrl.signal);
        const goalP = api.get<any>('/goals', ctrl.signal);
        const notifP = api.get<any>('/notifications/unread-count', ctrl.signal);
        const budgetsP = api.get<any>('/budgets', ctrl.signal).catch(() => []);
        const wealthP = api.get<any>('/wealth/dashboard', ctrl.signal).catch(() => null);
        const dashboardP = api.get<any>('/dashboard/personal', ctrl.signal).catch(() => null);

        const [statsRes, goalRes, notifRes, budgetsRes, wealthRes, dashboardRes] =
          await Promise.allSettled([statsP, goalP, notifP, budgetsP, wealthP, dashboardP]);

        if (ctrl.signal.aborted) {
          return;
        }

        if (dashboardRes.status === 'fulfilled' && dashboardRes.value) {
          const d = dashboardRes.value;
          if (d.netWorth) {
            setNetWorth(d.netWorth.total ?? d.netWorth.netWorth ?? null);
          }
          if (d.monthlySnapshot) {
            setMonthlyIncome(d.monthlySnapshot.income ?? 0);
            setMonthlySpent(d.monthlySnapshot.expense ?? 0);
          }
          if (d.healthScore) {
            setHealthScore(d.healthScore.score ?? null);
          }
          if (d.goals) {
            setGoals(Array.isArray(d.goals) ? d.goals : []);
          }
          if (d.budgetsOverview) {
            setBudgets(Array.isArray(d.budgetsOverview) ? d.budgetsOverview : []);
          }
          if (d.greeting?.balance !== null && d.greeting?.balance !== undefined) {
            setTotalBalance(d.greeting.balance);
          }
        }

        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value?.data ?? statsRes.value;
          if (monthlyIncome === 0) {
            setMonthlyIncome(s.summary?.totalIncome ?? 0);
          }
          if (monthlySpent === 0) {
            setMonthlySpent(s.summary?.totalExpense ?? 0);
          }
          if (totalBalance === null) {
            const bal = s.summary?.netSavings ?? s.totalBalance ?? null;
            if (bal !== null && bal !== undefined) {
              setTotalBalance(bal);
            }
          }
        }

        if (goalRes.status === 'fulfilled') {
          setGoals(listFromResponse(goalRes.value));
        }

        if (notifRes.status === 'fulfilled') {
          const n = notifRes.value;
          setUnreadCount(n.count ?? n.data?.count ?? 0);
        }

        if (budgetsRes.status === 'fulfilled') {
          setBudgets(listFromResponse(budgetsRes.value));
        }

        if (wealthRes.status === 'fulfilled' && wealthRes.value?.data) {
          const w = wealthRes.value.data;
          if (
            w.netWorth?.netWorth !== null &&
            w.netWorth?.netWorth !== undefined &&
            netWorth === null
          ) {
            setNetWorth(w.netWorth.netWorth);
          }
          if (w.healthScore !== null && w.healthScore !== undefined && healthScore === null) {
            setHealthScore(w.healthScore);
          }
        }

        await Promise.all([
          fetchImprovements(),
          fetchComponents(),
          loadAiFeed(),
          loadSavingsTips(),
          loadAiInsights(),
        ]);
      } catch {
        if (!ctrl.signal.aborted) {
          setError('Failed to load dashboard');
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, fetchImprovements, fetchComponents],
  );

  const loadAiFeed = useCallback(async () => {
    setAiFeedLoading(true);
    try {
      const res = await api.get<any>('/ai/today-feed').catch(() => null);
      if (res) {
        const feed = Array.isArray(res)
          ? res
          : Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.cards)
              ? res.cards
              : [];
        setAiFeed(feed.slice(0, 5));
      }
    } catch {
      // silent
    } finally {
      setAiFeedLoading(false);
    }
  }, []);

  const loadSavingsTips = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/savings-opportunities').catch(() => null);
      if (res) {
        const tips = Array.isArray(res)
          ? res
          : Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.opportunities)
              ? res.opportunities
              : [];
        setSavingsTips(tips.slice(0, 3));
      }
    } catch {
      // silent
    }
  }, []);

  const loadAiInsights = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/insights?section=dashboard').catch(() => null);
      if (res) {
        const items = Array.isArray(res)
          ? res
          : Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.insights)
              ? res.insights
              : [];
        setAiInsights(items.slice(0, 3));
      }
    } catch {
      // silent
    }
  }, []);

  const loadCoupleDashboard = useCallback(async () => {
    try {
      const res = await api.get<any>('/dashboard/couple').catch(() => null);
      const data = res?.data || res;
      setCoupleData(data);
    } catch {
      setCoupleData({ error: true });
    }
  }, []);

  const loadFamilyDashboard = useCallback(async () => {
    try {
      const res = await api.get<any>('/dashboard/family').catch(() => null);
      const data = res?.data || res;
      setFamilyData(data);
    } catch {
      setFamilyData({ error: true });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeLens === 'PERSONAL' || activeLens === 'FULL') {
        loadData();
      } else if (activeLens === 'PARTNERED') {
        setLensLoading(true);
        Promise.all([loadCoupleDashboard(), loadData()]).finally(() => setLensLoading(false));
      } else if (activeLens === 'FAMILY') {
        setLensLoading(true);
        Promise.all([loadFamilyDashboard(), loadData()]).finally(() => setLensLoading(false));
      }
    }, [activeLens, loadData, loadCoupleDashboard, loadFamilyDashboard]),
  );

  const displayHealthScore =
    healthScore ??
    (() => {
      if (monthlyIncome > 0) {
        const sr = Math.min((monthlySavings / monthlyIncome) * 100, 100);
        return Math.round(sr * 0.5 + 50);
      }
      return 70;
    })();

  const scoreColor =
    displayHealthScore >= 80
      ? '#22C55E'
      : displayHealthScore >= 60
        ? '#22C55E'
        : displayHealthScore >= 40
          ? '#F59E0B'
          : '#EF4444';
  const scoreLabel =
    displayHealthScore >= 80
      ? 'Excellent'
      : displayHealthScore >= 60
        ? 'Good'
        : displayHealthScore >= 40
          ? 'Fair'
          : 'Needs Work';

  if (loading || lensLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <View style={styles.greetingBlock}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                {greeting}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                {userName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab', { screen: 'Profile' })}
              style={[styles.avatarBtn, { backgroundColor: colors.bg.card }]}
            >
              <AntDesign name="user" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>
              Building your dashboard...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (activeLens === 'PARTNERED') {
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1 }}
        >
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.headerRow}>
              <View style={styles.greetingBlock}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                  {greeting}
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: colors.text.primary,
                    marginTop: 1,
                  }}
                >
                  {userName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileTab', { screen: 'Profile' })}
                style={[styles.avatarBtn, { backgroundColor: colors.bg.card }]}
              >
                <AntDesign name="user" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
          {coupleData ? (
            <DashboardGrid
              data={coupleData}
              mode="couple"
              refreshing={refreshing}
              onRefresh={() => {
                clearCache();
                loadCoupleDashboard();
              }}
              onNavigate={(screen, params) => navigation.navigate(screen, params)}
              hideTitle
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 32,
                gap: 12,
              }}
            >
              <View style={[styles.emptyIconBox, { backgroundColor: '#F472B615' }]}>
                <AntDesign name="heart" size={32} color="#F472B6" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.text.primary,
                  textAlign: 'center',
                }}
              >
                Not Connected
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: colors.text.tertiary,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                Link with your partner to track shared finances, goals, and more together.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('HomeTab', {
                    screen: 'CreateSpace',
                    params: { type: 'COUPLE' },
                  })
                }
                style={[styles.emptyCta, { backgroundColor: '#F472B6' }]}
                activeOpacity={0.8}
              >
                <AntDesign name="heart" size={16} color="#FFF" />
                <Text style={styles.emptyCtaText}>Connect with Partner</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  }

  if (activeLens === 'FAMILY') {
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1 }}
        >
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.headerRow}>
              <View style={styles.greetingBlock}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                  {greeting}
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: colors.text.primary,
                    marginTop: 1,
                  }}
                >
                  {userName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileTab', { screen: 'Profile' })}
                style={[styles.avatarBtn, { backgroundColor: colors.bg.card }]}
              >
                <AntDesign name="user" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
          {familyData ? (
            <DashboardGrid
              data={familyData}
              mode="family"
              refreshing={refreshing}
              onRefresh={() => {
                clearCache();
                loadFamilyDashboard();
              }}
              onNavigate={(screen, params) => navigation.navigate(screen, params)}
              hideTitle
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 32,
                gap: 12,
              }}
            >
              <View style={[styles.emptyIconBox, { backgroundColor: '#8B5CF615' }]}>
                <AntDesign name="team" size={32} color="#8B5CF6" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.text.primary,
                  textAlign: 'center',
                }}
              >
                No Family Yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: colors.text.tertiary,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                Create or join a family to manage shared expenses, goals, and bills together.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('HomeTab', {
                    screen: 'CreateSpace',
                    params: { type: 'FAMILY' },
                  })
                }
                style={[styles.emptyCta, { backgroundColor: '#8B5CF6' }]}
                activeOpacity={0.8}
              >
                <AntDesign name="addusergroup" size={16} color="#FFF" />
                <Text style={styles.emptyCtaText}>Create Family</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
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
          {/* ─── HEADER: GREETING + ACTIONS ─── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.headerRow}>
              <View style={styles.greetingBlock}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                  {greeting}
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: colors.text.primary,
                    marginTop: 1,
                  }}
                >
                  {userName}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Notifications')}
                  style={[styles.iconBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="bells" size={20} color={colors.text.secondary} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'SettingsMain' })}
                  style={[styles.avatarBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="user" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ─── THIS MONTH BREAKDOWN CARD ─── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('HomeTab', { screen: 'NetWorth' })}
              style={[styles.thisMonthCard, { backgroundColor: colors.bg.card }]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.tertiary }}>
                  This Month
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
                    Net Worth{' '}
                    {netWorth !== null && netWorth !== undefined
                      ? fmtShort(netWorth)
                      : fmtShort(totalBalance ?? 0)}
                  </Text>
                  <AntDesign name="right" size={12} color={colors.text.tertiary} />
                </View>
              </View>

              <View style={styles.thisMonthRow}>
                <View style={styles.thisMonthItem}>
                  <View style={[styles.tmDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.tmLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[styles.tmValue, { color: colors.text.primary }]}>
                    {fmt(monthlyIncome)}
                  </Text>
                </View>
                <View style={styles.thisMonthItem}>
                  <View style={[styles.tmDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.tmLabel, { color: colors.text.tertiary }]}>Expense</Text>
                  <Text style={[styles.tmValue, { color: colors.text.primary }]}>
                    {fmt(monthlySpent)}
                  </Text>
                </View>
                <View style={styles.thisMonthItem}>
                  <View style={[styles.tmDot, { backgroundColor: '#7C3AED' }]} />
                  <Text style={[styles.tmLabel, { color: colors.text.tertiary }]}>Left</Text>
                  <Text style={[styles.tmValue, { color: colors.text.primary, fontWeight: '800' }]}>
                    {fmt(monthlySavings)}
                  </Text>
                </View>
              </View>

              {/* Savings bar */}
              {monthlyIncome > 0 && (
                <View style={styles.savingsBarOuter}>
                  <View style={[styles.savingsBarBg, { backgroundColor: colors.border.subtle }]}>
                    <View
                      style={[
                        styles.savingsBarFill,
                        {
                          width: `${Math.min(savingsRate, 100)}%`,
                          backgroundColor:
                            savingsRate >= 30
                              ? '#22C55E'
                              : savingsRate >= 15
                                ? '#F59E0B'
                                : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.savingsBarLabel, { color: colors.text.tertiary }]}>
                    {savingsRate.toFixed(0)}% saved
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ─── DABBU SCORE + FINANCE HEALTH ─── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('HealthScore')}
              style={[styles.healthCard, { backgroundColor: colors.bg.card }]}
            >
              <View style={styles.healthHeader}>
                <View style={styles.healthTitleRow}>
                  <AntDesign name="heart" size={16} color={scoreColor} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: colors.text.primary,
                      marginLeft: 6,
                    }}
                  >
                    Finance Health
                  </Text>
                </View>
                <View style={styles.healthScoreBadge}>
                  <Text style={[styles.healthScoreText, { color: scoreColor }]}>
                    {displayHealthScore}
                  </Text>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: scoreColor }}>
                    {scoreLabel}
                  </Text>
                </View>
              </View>

              {/* Strengths & Weaknesses from real data */}
              {improvements.length > 0 ? (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {improvements.slice(0, 3).map((imp: any, i: number) => {
                    const isPositive =
                      imp.priority === 'low' ||
                      imp.category === 'savings' ||
                      imp.category === 'goals';
                    return (
                      <View key={i} style={styles.healthItem}>
                        <AntDesign
                          name={isPositive ? 'upcircle' : 'exclamationcircleo'}
                          size={12}
                          color={isPositive ? '#22C55E' : '#F59E0B'}
                        />
                        <Text
                          style={[styles.healthItemText, { color: colors.text.secondary }]}
                          numberOfLines={2}
                        >
                          {imp.message || imp.action || imp.description}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 8,
                    lineHeight: 18,
                  }}
                >
                  {monthlyIncome > 0
                    ? monthlySpent > monthlyIncome * 0.8
                      ? 'Your expenses are high. Try to keep spending below 80% of income.'
                      : `You're saving ${fmtShort(monthlySavings)} this month (${Math.round(savingsRate)}% rate). Keep it up!`
                    : 'Add your transactions to see your financial health breakdown.'}
                </Text>
              )}

              {/* Score components from real data */}
              {(scoreComponents as any)?.savingsRate !== null &&
                (scoreComponents as any)?.savingsRate !== undefined && (
                  <View style={{ marginTop: 10, gap: 4 }}>
                    {[
                      {
                        label: 'Savings',
                        score: (scoreComponents as any).savingsRate,
                        maxScore: 100,
                      },
                      {
                        label: 'Expenses',
                        score: 100 - ((scoreComponents as any).expenseRatio || 0),
                        maxScore: 100,
                      },
                      {
                        label: 'Goals',
                        score: (scoreComponents as any).goalProgress || 0,
                        maxScore: 100,
                      },
                      {
                        label: 'Stability',
                        score: (scoreComponents as any).stability || 0,
                        maxScore: 100,
                      },
                    ].map((comp: any, i: number) => {
                      const pct =
                        comp.maxScore > 0
                          ? Math.min(Math.round((comp.score / comp.maxScore) * 100), 100)
                          : 0;
                      const compColor = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
                      return (
                        <View
                          key={i}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: colors.text.tertiary,
                              width: 60,
                            }}
                          >
                            {comp.label}
                          </Text>
                          <View style={[styles.compBar, { backgroundColor: colors.border.subtle }]}>
                            <View
                              style={[
                                styles.compBarFill,
                                { width: `${pct}%`, backgroundColor: compColor },
                              ]}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: compColor,
                              width: 30,
                              textAlign: 'right',
                            }}
                          >
                            {pct}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
            </TouchableOpacity>
          </View>

          {/* ─── AI SAVINGS CARD ─── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={[styles.aiSavingsCard, { backgroundColor: colors.bg.card }]}>
              <View style={styles.aiSavingsHeader}>
                <View style={[styles.aiSavingsIcon, { backgroundColor: '#7C3AED15' }]}>
                  <AntDesign name="bulb1" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                    How to Boost Savings
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>
                    Personalized AI recommendation
                  </Text>
                </View>
                <AntDesign name="right" size={14} color={colors.text.tertiary} />
              </View>

              {savingsTips.length > 0 ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {savingsTips.map((tip: any, i: number) => (
                    <View key={i} style={styles.savingsTip}>
                      <AntDesign name="checkcircle" size={14} color="#22C55E" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '500',
                          color: colors.text.secondary,
                          flex: 1,
                        }}
                      >
                        {tip.suggestion || tip.title || tip.description || tip.action}
                      </Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DabbuAI')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED', marginTop: 4 }}
                    >
                      See all savings tips →
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}>
                    {monthlyIncome > 0
                      ? `You're saving ${fmtShort(monthlySavings)} this month. Try setting a monthly savings goal to optimize.`
                      : 'Start tracking your income and expenses to get personalized savings tips.'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ─── AI INSIGHTS ─── */}
          {aiInsights.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AntDesign name="bulb1" size={14} color="#7C3AED" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                    AI Insights
                  </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('DabbuAI')}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 8 }}>
                {aiInsights.slice(0, 2).map((insight: any, i: number) => {
                  const isWarning = insight.severity === 'warning' || insight.type === 'warning';
                  const isMilestone =
                    insight.severity === 'milestone' || insight.type === 'milestone';
                  const iconColor = isWarning ? '#F59E0B' : isMilestone ? '#22C55E' : '#7C3AED';
                  const bgColor = isWarning ? '#F59E0B10' : isMilestone ? '#22C55E10' : '#7C3AED10';
                  return (
                    <TouchableOpacity
                      key={insight.id || i}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('DabbuAI')}
                      style={[
                        styles.insightCard,
                        { backgroundColor: colors.bg.secondary, borderLeftColor: iconColor },
                      ]}
                    >
                      <View style={[styles.insightIcon, { backgroundColor: bgColor }]}>
                        <AntDesign
                          name={isWarning ? 'warning' : isMilestone ? 'star' : 'bulb1'}
                          size={16}
                          color={iconColor}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }}
                        >
                          {insight.title || ''}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '500',
                            color: colors.text.tertiary,
                            marginTop: 2,
                          }}
                        >
                          {insight.description || insight.text || ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── AI FEED ─── */}
          {aiFeed.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AntDesign name="star" size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                    AI Feed
                  </Text>
                </View>
              </View>
              <View style={{ gap: 6 }}>
                {aiFeed.map((card: any, i: number) => {
                  const feedColors: Record<string, string> = {
                    tip: '#7C3AED',
                    warning: '#F59E0B',
                    milestone: '#22C55E',
                    forecast: '#06B6D4',
                    achievement: '#22C55E',
                    insight: '#7C3AED',
                  };
                  const fc = feedColors[card.type] || '#7C3AED';
                  return (
                    <TouchableOpacity
                      key={card.id || i}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('DabbuAI')}
                      style={[
                        styles.feedCard,
                        { backgroundColor: colors.bg.secondary, borderLeftColor: fc },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: colors.text.secondary,
                          flex: 1,
                        }}
                      >
                        {card.title || card.message || card.description || card.text}
                      </Text>
                      <AntDesign name="right" size={12} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── ACTIVE SPACES ─── */}
          {spaces.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Active Spaces
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SpacesDashboard')}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                    Show All ({spaces.length})
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 8 }}>
                {spaces.slice(0, 4).map((space) => (
                  <TouchableOpacity
                    key={space.id}
                    onPress={() => {
                      useSpaceStore.getState().setActiveSpace(space.id);
                      navigation.navigate('HomeTab', { screen: 'SpaceDetail' });
                    }}
                    style={[styles.spaceCard, { backgroundColor: colors.bg.card }]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.spaceCardLeft}>
                      <Text style={{ fontSize: 22 }}>{SPACE_EMOJIS[space.type] || '📁'}</Text>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}
                          numberOfLines={1}
                        >
                          {space.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '500',
                            color: colors.text.tertiary,
                            marginTop: 1,
                          }}
                        >
                          {space.memberCount || 0} members · {space.transactionCount || 0}{' '}
                          transactions
                        </Text>
                      </View>
                    </View>
                    <View style={styles.spaceCardRight}>
                      <Text
                        style={{ fontSize: 11, fontWeight: '600', color: colors.brand.primary }}
                      >
                        {space.role === 'ADMIN'
                          ? 'Admin'
                          : space.role === 'MANAGER'
                            ? 'Manager'
                            : 'Member'}
                      </Text>
                      <AntDesign name="right" size={12} color={colors.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ─── QUICK ACTIONS ─── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: { type: 'expense' },
                  })
                }
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIconBox, { backgroundColor: '#EF444415' }]}>
                  <AntDesign name="minuscircle" size={24} color="#EF4444" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>
                  Add{'\n'}Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: { type: 'income' },
                  })
                }
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIconBox, { backgroundColor: '#22C55E15' }]}>
                  <AntDesign name="pluscircle" size={24} color="#22C55E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>
                  Add{'\n'}Income
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('LifeHubTab')}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIconBox, { backgroundColor: '#7C3AED15' }]}>
                  <AntDesign name="calendar" size={24} color="#7C3AED" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Life{'\n'}Hub</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIconBox, { backgroundColor: '#F59E0B15' }]}>
                  <AntDesign name="flag" size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>
                  Goal{'\n'}Contribution
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── GOALS PREVIEW ─── */}
          {goals.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Active Goals
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 8 }}>
                {goals.slice(0, 3).map((g: any) => {
                  const pct =
                    g.targetAmount > 0
                      ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100)
                      : 0;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('HomeTab', {
                          screen: 'GoalDetail',
                          params: { goalId: g.id },
                        })
                      }
                      style={[styles.goalCard, { backgroundColor: colors.bg.card }]}
                    >
                      <View style={styles.goalHeader}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: colors.text.primary,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {g.name || g.title}
                        </Text>
                        <Text
                          style={{ fontSize: 12, fontWeight: '700', color: colors.brand.primary }}
                        >
                          {fmtShort(g.currentAmount)} / {fmtShort(g.targetAmount)}
                        </Text>
                      </View>
                      <View style={[styles.goalBarBg, { backgroundColor: colors.border.subtle }]}>
                        <View
                          style={[
                            styles.goalBarFill,
                            { width: `${pct}%`, backgroundColor: g.color || '#7C3AED' },
                          ]}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: colors.text.tertiary,
                          marginTop: 2,
                        }}
                      >
                        {pct}% complete
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── ERROR STATE ─── */}
          {error && (
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <View
                style={[
                  styles.errorCard,
                  { backgroundColor: colors.status.errorLight, borderColor: colors.status.error },
                ]}
              >
                <AntDesign name="exclamationcircleo" size={16} color={colors.status.error} />
                <Text
                  style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}
                >
                  {error}
                </Text>
                <TouchableOpacity onPress={() => loadData(true)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand.primary }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingBlock: {
    gap: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  thisMonthCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  thisMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  thisMonthItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tmLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tmValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  savingsBarOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  savingsBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  savingsBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  savingsBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 65,
    textAlign: 'right',
  },
  healthCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreBadge: {
    alignItems: 'center',
    gap: 1,
  },
  healthScoreText: {
    fontSize: 20,
    fontWeight: '800',
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  healthItemText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  compBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  aiSavingsCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  aiSavingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiSavingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  spaceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spaceCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  qaCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
  goalCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalBarBg: {
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
