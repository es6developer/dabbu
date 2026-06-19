import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken, clearCache, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSpaceStore } from '../../store/spaceStore';
import { useLifeEventStore } from '../../store/lifeEventStore';
import { useDabbuScoreStore } from '../../store/dabbuScoreStore';
import { useAIStore } from '../../store/aiStore';
import { SpaceSwitcher } from '../../components/global/SpaceSwitcher';
import { DabbuScoreMini } from '../../components/global/DabbuScoreMini';
import { AIInsightCard } from '../../components/global/AIInsightCard';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';

const W = Dimensions.get('window').width;

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return fmt(v);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function listFromResponse(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.items) return Array.isArray(res.items) ? res.items : [];
  return [];
}

const LIFE_EVENT_ICONS: Record<string, string> = {
  HOUSE: 'home',
  BABY: 'smileo',
  WEDDING: 'heart',
  CAR: 'car',
  VACATION: 'earth',
  EDUCATION: 'book',
  RETIREMENT: 'trophy',
  BUSINESS: 'briefcase',
  MOVING: 'swap',
  JOB_CHANGE: 'swap',
  SALARY_INCREASE: 'linechart',
  CUSTOM: 'flag',
};

const QUICK_ACTIONS: {
  label: string;
  icon: string;
  desc: string;
  route: string;
  screen: string;
  params?: any;
}[] = [
  { label: 'Add Expense', icon: 'add-circle', desc: 'Record a new expense', route: 'WalletTab', screen: 'AddExpense', params: { type: 'expense' } },
  { label: 'Add Income', icon: 'cash', desc: 'Money received', route: 'WalletTab', screen: 'AddExpense', params: { type: 'income' } },
  { label: 'My Wallet', icon: 'wallet', desc: 'View transactions', route: 'WalletTab', screen: 'MyWallet' },
  { label: 'Goal Contribution', icon: 'gift', desc: 'Add to a savings goal', route: 'HomeTab', screen: 'GoalsList' },
];

export function LifeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, accessToken } = useAuth();
  const { spaces } = useSpaceStore();
  const lifeEvents = useLifeEventStore((s) => s.events);
  const fetchLifeEvents = useLifeEventStore((s) => s.fetchEvents);
  const aiInsights = useAIStore((s) => s.insights);
  const fetchAIInsights = useAIStore((s) => s.fetchInsights);
  const healthScoreData = useDabbuScoreStore((s) => s.score);
  const fetchHealthScore = useDabbuScoreStore((s) => s.fetchScore);

  const [activeTab, setActiveTab] = useState<'personal' | 'couple' | 'family'>('personal');
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [scoreChange, setScoreChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [coupleLoading, setCoupleLoading] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [coupleRefreshing, setCoupleRefreshing] = useState(false);
  const [familyRefreshing, setFamilyRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(false);

  const userName = user?.firstName || 'User';
  const greeting = getGreeting();

  const confirmedEvents = lifeEvents.filter((e) => e.isConfirmed);
  const unconfirmedCount = lifeEvents.filter((e) => !e.isConfirmed && !e.isDismissed).length;

  const monthlySavings = Math.max(0, monthlyIncome - monthlySpent);
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  const emergencyFundMonths = monthlySpent > 0
    ? ((totalBalance ?? 0) / monthlySpent).toFixed(1)
    : '0';

  const activeBudgetCount = budgets.filter((b: any) => {
    const limit = Number(b.limit || b.amount || 0);
    const spent = Number(b.spent || b.currentSpent || 0);
    return limit > 0 && spent < limit;
  }).length;

  const healthScore = displayScore ?? (() => {
    if (healthScoreData != null) return healthScoreData;
    const sr = monthlyIncome > 0 ? Math.min((monthlySavings / monthlyIncome) * 100, 100) : 0;
    const budgetHealthVal = budgets.length > 0
      ? budgets.reduce((s, b) => {
          const limit = Number(b.limit || b.amount || 0);
          const spent = Number(b.spent || b.currentSpent || 0);
          return limit > 0 ? s + Math.round((1 - spent / limit) * 100) : s + 100;
        }, 0) / budgets.length
      : 100;
    const gp = goals.length > 0
      ? goals.reduce((s: number, g: any) => {
          const p = (g.currentAmount ?? 0) > 0 && (g.targetAmount ?? 0) > 0
            ? Math.min((g.currentAmount / g.targetAmount) * 100, 100)
            : 0;
          return s + p;
        }, 0) / goals.length
      : 0;
    const ef = Math.min(((totalBalance ?? 0) / Math.max(monthlyIncome * 6, 1)) * 100, 100);
    return Math.round(Math.min(sr * 0.3 + budgetHealthVal * 0.2 + gp * 0.2 + ef * 0.2 + 10, 100));
  })();

  const topInsight = aiInsights.length > 0 ? aiInsights[0] : null;

  const loadData = useCallback(
    async (isRefresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) setAccessToken(accessToken);

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
        const balP = api.get<any>('/accounts/stats', ctrl.signal);
        const statsP = api.get<any>('/transactions/stats?months=1', ctrl.signal);
        const goalP = api.get<any>('/goals', ctrl.signal);
        const notifP = api.get<any>('/notifications/unread-count', ctrl.signal);
        const budgetsP = api.get<any>('/budgets', ctrl.signal).catch(() => []);
        const wealthP = api.get<any>('/wealth/dashboard', ctrl.signal).catch(() => null);

        const [balRes, statsRes, goalRes, notifRes, budgetsRes, wealthRes] =
          await Promise.allSettled([balP, statsP, goalP, notifP, budgetsP, wealthP]);

        if (ctrl.signal.aborted) return;

        if (balRes.status === 'fulfilled') {
          const b = balRes.value;
          setTotalBalance(b.totalBalance ?? b.data?.totalBalance ?? 0);
        }

        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value?.data ?? statsRes.value;
          setMonthlyIncome(s.summary?.totalIncome ?? 0);
          setMonthlySpent(s.summary?.totalExpense ?? 0);
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
          if (w.netWorth?.netWorth != null) setNetWorth(w.netWorth.netWorth);
          if (w.healthScore != null) setDisplayScore(w.healthScore);
          if (w.streak?.currentStreak != null) setStreak(w.streak.currentStreak);
          if (w.change != null) setScoreChange(w.change);
        }

        await Promise.all([
          fetchLifeEvents(),
          fetchAIInsights(accessToken),
          fetchHealthScore(),
        ]);
      } catch {
        if (!ctrl.signal.aborted) setError('Failed to load dashboard');
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, fetchLifeEvents, fetchAIInsights, fetchHealthScore],
  );

  const loadCoupleData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setCoupleRefreshing(true);
      else setCoupleLoading(true);
      try {
        const res = await api.get<any>('/dashboard/couple');
        const data = res.data || res;
        setCoupleData(data);
      } catch {
        setCoupleData({ mode: 'couple', error: 'Failed to load couple dashboard' });
      } finally {
        setCoupleLoading(false);
        setCoupleRefreshing(false);
      }
    },
    [],
  );

  const loadFamilyData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setFamilyRefreshing(true);
      else setFamilyLoading(true);
      try {
        const res = await api.get<any>('/dashboard/family');
        const data = res.data || res;
        setFamilyData(data);
      } catch {
        setFamilyData({ mode: 'family', error: 'Failed to load family dashboard' });
      } finally {
        setFamilyLoading(false);
        setFamilyRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'personal') loadData();
      else if (activeTab === 'couple') loadCoupleData();
      else if (activeTab === 'family') loadFamilyData();
    }, [activeTab, loadData, loadCoupleData, loadFamilyData]),
  );

  const renderTabBar = () => (
    <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
      <View style={[styles.tabBar, { backgroundColor: colors.bg.card }]}>
        {(['personal', 'couple', 'family'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const icons: Record<string, string> = { personal: 'user', couple: 'heart', family: 'team' };
          const labels: Record<string, string> = { personal: 'Personal', couple: 'Couple', family: 'Family' };
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                isActive && [styles.tabItemActive, { backgroundColor: colors.brand.primary }],
              ]}
              activeOpacity={0.7}
            >
              <AntDesign
                name={icons[tab] as any}
                size={14}
                color={isActive ? '#FFF' : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#FFF' : colors.text.tertiary },
                ]}
              >
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderPersonalDashboard = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: 100 }}
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
      {/* ─── NET WORTH HERO ─── */}
      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('HomeTab', { screen: 'NetWorth' })}
          style={[styles.netWorthCard, { backgroundColor: colors.bg.card }]}
        >
          <View style={styles.netWorthHeader}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary }}>
              Net Worth
            </Text>
            <AntDesign name="right" size={14} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.netWorthValue, { color: colors.text.primary }]}>
            {netWorth != null ? fmtShort(netWorth) : fmtShort(totalBalance ?? 0)}
          </Text>
          {streak > 0 && (
            <View style={styles.streakRow}>
              <AntDesign name="star" size={12} color="#F59E0B" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#F59E0B' }}>
                {streak} day streak
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── DABBU SCORE + SPACE SWITCHER ─── */}
      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <View style={styles.scoreRow}>
          <SpaceSwitcher />
          <View style={styles.scoreSection}>
            <DabbuScoreMini
              score={healthScore}
              size="sm"
              change={scoreChange}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text.tertiary,
                marginLeft: 6,
              }}
            >
              {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work'}
              {scoreChange !== 0 && (
                <Text style={{ color: scoreChange > 0 ? '#22C55E' : '#EF4444' }}>
                  {' '}{scoreChange > 0 ? '↑' : '↓'}{Math.abs(scoreChange)} pts
                </Text>
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── SNAPSHOT ROW ─── */}
      <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <View style={[styles.snapshotRow, { backgroundColor: colors.bg.card }]}>
          <View style={styles.snapshotItem}>
            <Text style={styles.snapshotIcon}>🏦</Text>
            <Text style={[styles.snapshotValue, { color: colors.text.primary }]}>
              {emergencyFundMonths}mo
            </Text>
            <Text style={[styles.snapshotLabel, { color: colors.text.tertiary }]}>
              Runway
            </Text>
          </View>
          <View style={[styles.snapshotDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.snapshotItem}>
            <Text style={styles.snapshotIcon}>🎯</Text>
            <Text style={[styles.snapshotValue, { color: colors.text.primary }]}>
              {goals.length}
            </Text>
            <Text style={[styles.snapshotLabel, { color: colors.text.tertiary }]}>
              Goals
            </Text>
          </View>
          <View style={[styles.snapshotDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.snapshotItem}>
            <Text style={styles.snapshotIcon}>📋</Text>
            <Text style={[styles.snapshotValue, { color: colors.text.primary }]}>
              {activeBudgetCount}
            </Text>
            <Text style={[styles.snapshotLabel, { color: colors.text.tertiary }]}>
              Active
            </Text>
          </View>
        </View>
      </View>

      {/* ─── AI INSIGHT ─── */}
      <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <AntDesign name="bulb1" size={14} color="#7C3AED" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>
            AI Insight
          </Text>
        </View>
        {topInsight ? (
          <AIInsightCard
            insight={topInsight.description || topInsight.title}
            type={(topInsight.severity === 'warning' ? 'warning' : topInsight.severity === 'forecast' ? 'forecast' : 'tip') as any}
            actionLabel="See details"
            onAction={() => navigation.navigate('DabbuAI')}
          />
        ) : (
          <AIInsightCard
            insight={
              totalBalance != null && totalBalance > 0
                ? `Your net worth is ${fmtShort(totalBalance)}. You're on track to meet your financial goals this year.`
                : 'Welcome to Dabbu! Start by adding your first income or expense to get personalized insights.'
            }
            type="tip"
          />
        )}
      </View>

      {/* ─── LIFE EVENTS ─── */}
      {confirmedEvents.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <View style={styles.sectionHeader}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
              Life Events
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LifeEventsList')}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 10 }}>
            {confirmedEvents.slice(0, 3).map((event) => {
              const icon = LIFE_EVENT_ICONS[event.eventType] || 'flag';
              const goalForEvent = goals.find((g: any) => g.id === event.goalId);
              const saved = Number(goalForEvent?.currentAmount || 0);
              const target = Number(goalForEvent?.targetAmount || 0);
              const pct = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
              return (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('LifeEventsList', { eventId: event.id })}
                  style={[styles.lifeEventCard, { backgroundColor: colors.bg.card }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.eventIconBox, { backgroundColor: '#8B5CF615' }]}>
                      <AntDesign name={icon as any} size={20} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                        {event.title}
                      </Text>
                      {target > 0 && (
                        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                          {pct}% to goal · {fmtShort(target)}
                        </Text>
                      )}
                    </View>
                    <AntDesign name="right" size={14} color={colors.text.tertiary} />
                  </View>
                  {target > 0 && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#8B5CF6' }]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {unconfirmedCount > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('LifeEventsList')}
            style={[styles.unconfirmedBanner, { backgroundColor: colors.bg.card, borderLeftColor: '#8B5CF6' }]}
            activeOpacity={0.8}
          >
            <AntDesign name="calendar" size={16} color="#8B5CF6" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary, flex: 1 }}>
              {unconfirmedCount} Life Event{unconfirmedCount > 1 ? 's' : ''} Detected
            </Text>
            <AntDesign name="arrowright" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── ACTIVE SPACES ─── */}
      {spaces.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 10 }}>
            Active Spaces
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {spaces.map((space) => {
              const spaceEmojis: Record<string, string> = {
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
              return (
                <TouchableOpacity
                  key={space.id}
                  onPress={() => {
                    useSpaceStore.getState().setActiveSpace(space.id);
                  }}
                  style={[styles.spaceChip, { backgroundColor: colors.bg.card }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14 }}>
                    {spaceEmojis[space.type] || '📁'}
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                    numberOfLines={1}
                  >
                    {space.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── QUICK ACTIONS ─── */}
      <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 10 }}>
          Quick Actions
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => navigation.navigate(a.route, { screen: a.screen, params: a.params })}
              style={[styles.actionCard, { backgroundColor: colors.bg.card }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: `${colors.brand.primary}12` }]}>
                <AntDesign name={a.icon as any} size={22} color={colors.brand.primary} />
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

      {/* ─── ERROR STATE ─── */}
      {error && (
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={[styles.errorCard, { backgroundColor: colors.status.errorLight, borderColor: colors.status.error }]}>
            <AntDesign name="exclamationcircleo" size={16} color={colors.status.error} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}>
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
  );

  if (loading && activeTab === 'personal') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
          <View style={styles.headerRow}>
            <View style={styles.greetingBlock}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>
                {greeting}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                {userName}
              </Text>
            </View>
          </View>
          {renderTabBar()}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>
            Building your dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      {/* ─── HEADER: GREETING + ACTIONS (shared across all tabs) ─── */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <View style={styles.headerRow}>
          <View style={styles.greetingBlock}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>
              {greeting}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
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
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
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

      {/* ─── TAB BAR ─── */}
      {renderTabBar()}

      {/* ─── CONTENT ─── */}
      {activeTab === 'personal' && renderPersonalDashboard()}

      {activeTab === 'couple' && (
        coupleLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>
              Loading couple dashboard...
            </Text>
          </View>
        ) : !coupleData || (!coupleData.coupleHero && !coupleData.combinedWealth) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
            <View style={[styles.emptyIconBox, { backgroundColor: '#F472B615' }]}>
              <AntDesign name="heart" size={32} color="#F472B6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary, textAlign: 'center' }}>
              Not Connected
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary, textAlign: 'center', lineHeight: 20 }}>
              Link with your partner to track shared finances, goals, and more together.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'CreateSpace', params: { type: 'COUPLE' } })}
              style={[styles.emptyCta, { backgroundColor: '#F472B6' }]}
              activeOpacity={0.8}
            >
              <AntDesign name="heart" size={16} color="#FFF" />
              <Text style={styles.emptyCtaText}>Connect with Partner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <DashboardGrid
              data={coupleData}
              mode="couple"
              refreshing={coupleRefreshing}
              onRefresh={() => loadCoupleData(true)}
              onNavigate={(screen, params) => navigation.navigate(screen, params)}
              hideTitle
            />
          </View>
        )
      )}

      {activeTab === 'family' && (
        familyLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>
              Loading family dashboard...
            </Text>
          </View>
        ) : !familyData || (!familyData.familyHero && !familyData.familyWealth) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
            <View style={[styles.emptyIconBox, { backgroundColor: '#8B5CF615' }]}>
              <AntDesign name="team" size={32} color="#8B5CF6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary, textAlign: 'center' }}>
              No Family Yet
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary, textAlign: 'center', lineHeight: 20 }}>
              Create or join a family to manage shared expenses, goals, and bills together.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'CreateSpace', params: { type: 'FAMILY' } })}
              style={[styles.emptyCta, { backgroundColor: '#8B5CF6' }]}
              activeOpacity={0.8}
            >
              <AntDesign name="addusergroup" size={16} color="#FFF" />
              <Text style={styles.emptyCtaText}>Create Family</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <DashboardGrid
              data={familyData}
              mode="family"
              refreshing={familyRefreshing}
              onRefresh={() => loadFamilyData(true)}
              onNavigate={(screen, params) => navigation.navigate(screen, params)}
              hideTitle
            />
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingBlock: {
    gap: 2,
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
  netWorthCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  netWorthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netWorthValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snapshotRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  snapshotIcon: {
    fontSize: 20,
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  snapshotDivider: {
    width: 1,
    height: 36,
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lifeEventCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  eventIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 99,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  unconfirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
  },
  spaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
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
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
});
