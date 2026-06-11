import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton, SkeletonList } from '../../components/ui/AnimatedSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { useTheme } from '../../theme';
import { getCategoryIcon } from '../../config/categoryIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';
const PURPLE_LIGHT = '#A78BFA';
const GREEN = '#10B981';
const RED = '#EF4444';

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F97316',
  Travel: '#4A90D9',
  Shopping: '#E056A0',
  Medical: '#10B981',
  Fuel: '#F59E0B',
  Rent: '#14B8A6',
  EMI: '#EF4444',
  Bills: '#3B82F6',
  Entertainment: '#8B5CF6',
  Education: '#06B6D4',
  Grocery: '#22C55E',
  Investment: '#6366F1',
  Salary: '#10B981',
  Transfer: '#6B7280',
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || '#8B5CF6';
}

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function groupByDate(tx: any[]) {
  const groups: Record<string, any[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toDateString();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  for (const t of tx) {
    const d = new Date(t.date || t.createdAt);
    const ds = d.toDateString();
    let key: string;
    if (ds === today) {
      key = 'Today';
    } else if (ds === yStr) {
      key = 'Yesterday';
    } else if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      key = 'This Month';
    } else {
      key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    (groups[key] ||= []).push(t);
  }
  const order = ['Today', 'Yesterday', 'This Month'];
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) {
        return ai - bi;
      }
      if (ai !== -1) {
        return -1;
      }
      if (bi !== -1) {
        return 1;
      }
      return b.localeCompare(a);
    })
    .map(([title, data]) => ({ title, data }));
}

const QUICK_ACTIONS = [
  { icon: 'add-circle', label: 'Add', color: PURPLE, screen: 'AddExpense' },
  { icon: 'scan', label: 'Scan', color: '#F97316', screen: 'BillScanner' },
  { icon: 'receipt', label: 'Bills', color: '#3B82F6', screen: 'BillsList' },
  { icon: 'sparkles', label: 'AI Insights', color: PURPLE_LIGHT, screen: 'AiHomeDashboard' },
];

export function MyWalletScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(30)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }
      warmupBackend().catch(() => {});
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const settleTimer = setTimeout(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }, 3000);
      try {
        const [txRes, statsRes] = await Promise.all([
          api.get<any>('/transactions', ctrl.signal),
          api.get<any>('/transactions/stats', ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }
        const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
        setTransactions(txData.filter((t: any) => !t.expenseGroupId));
        if (statsRes?.summary) {
          setSummary({
            totalIncome: Number(statsRes.summary.totalIncome) || 0,
            totalExpense: Number(statsRes.summary.totalExpense) || 0,
          });
        }
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(cardTranslate, {
            toValue: 0,
            tension: 60,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();
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
    [accessToken, fadeAnim, cardTranslate],
  );

  const [sendingTest, setSendingTest] = useState(false);

  async function sendTestPush() {
    if (sendingTest) {
      return;
    }
    setSendingTest(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post('/devices/test-push', {
        title: 'Test Push',
        body: 'This is a test notification from Dabbu 🎉',
      });
      Alert.alert('Sent', 'Test push notification sent to your devices.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send test push');
    } finally {
      setSendingTest(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  async function handleDelete(id: string) {
    Alert.alert('Delete Transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/transactions/${id}`);
            setTransactions((p) => p.filter((t) => t.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  const categories = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach((t) => s.add(t.category?.name || t.category || 'Other'));
    return Array.from(s).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.category?.name || t.category || '').toLowerCase().includes(q),
      );
    }
    if (selectedCategory) {
      list = list.filter((t) => (t.category?.name || t.category) === selectedCategory);
    }
    return groupByDate(list);
  }, [transactions, search, selectedCategory]);

  const { remaining, expensePct } = useMemo(() => {
    const r = summary.totalIncome - summary.totalExpense;
    const pct =
      summary.totalIncome > 0
        ? Math.min(Math.round((summary.totalExpense / summary.totalIncome) * 100), 100)
        : 0;
    return { remaining: r, expensePct: pct };
  }, [summary]);

  const insight = useMemo(() => {
    const now = new Date();
    const m = transactions.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const total = m.reduce((s, t) => s + Number(t.amount), 0);
    const foodTotal = m
      .filter((t) => (t.category?.name || t.category) === 'Food' && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const dailyAvg = m.length > 0 ? total / m.length : 0;
    const catSpending: Record<string, number> = {};
    m.filter((t) => t.type === 'expense').forEach((t) => {
      const c = t.category?.name || t.category || 'Other';
      catSpending[c] = (catSpending[c] || 0) + Number(t.amount);
    });
    const top = Object.entries(catSpending).sort(([, a], [, b]) => b - a)[0];
    return { total, foodTotal, dailyAvg, topCat: top ? { name: top[0], amount: top[1] } : null };
  }, [transactions]);

  const headerOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );

  const renderTxItem = useCallback(
    ({ item: section }: { item: any }) => (
      <View style={s.sectionWrap}>
        <View style={s.dateHeader}>
          <Text style={[s.dateLabel, { color: colors.text.tertiary }]}>{section.title}</Text>
          <View style={[s.dateBadge, { backgroundColor: `${PURPLE}18` }]}>
            <Text style={[s.dateBadgeText, { color: PURPLE }]}>{section.data.length}</Text>
          </View>
        </View>
        {section.data.map((t: any) => {
          const isIncome = t.type === 'income';
          const cat = t.category?.name || t.category || 'Other';
          const catColor = getCategoryColor(cat);
          const time = new Date(t.date || t.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <TouchableOpacity
              key={t.id}
              style={[s.txCard, { backgroundColor: colors.bg.secondary }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: t.id })}
              onLongPress={() => handleDelete(t.id)}
            >
              <View style={[s.txIconOuter, { backgroundColor: `${catColor}18` }]}>
                <View style={[s.txIconInner, { backgroundColor: catColor }]}>
                  <Ionicons name={getCategoryIcon(cat) as any} size={18} color="#FFF" />
                </View>
              </View>
              <View style={s.txBody}>
                <Text style={[s.txDesc, { color: colors.text.primary }]} numberOfLines={1}>
                  {t.description || cat}
                </Text>
                <View style={s.txMetaRow}>
                  <Text style={[s.txMeta, { color: colors.text.tertiary }]}>{time}</Text>
                  <View style={[s.txDot, { backgroundColor: colors.text.tertiary }]} />
                  <View style={[s.txCatPill, { backgroundColor: `${catColor}15` }]}>
                    <Text style={[s.txCatText, { color: catColor }]}>{cat}</Text>
                  </View>
                </View>
              </View>
              <View style={s.txRight}>
                <Text style={[s.txAmount, { color: isIncome ? GREEN : RED }]}>
                  {isIncome ? '+' : '-'}
                  {fmt(Number(t.amount))}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [colors, navigation],
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Skeleton width={90} height={12} />
            <Skeleton width={140} height={28} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={40} height={40} borderRadius={12} />
        </View>
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Skeleton width="100%" height={220} borderRadius={32} />
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={(SCREEN_WIDTH - 70) / 4} height={84} borderRadius={20} />
          ))}
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.title}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={PURPLE}
            colors={[PURPLE]}
          />
        }
        contentContainerStyle={
          transactions.length === 0 && !search && !selectedCategory
            ? s.emptyContainer
            : { paddingBottom: 100 }
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <Animated.View
              style={[s.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}
            >
              <View>
                <Text style={[s.greeting, { color: colors.text.tertiary }]}>
                  {new Date().getHours() < 12
                    ? 'Good morning'
                    : new Date().getHours() < 18
                      ? 'Good afternoon'
                      : 'Good evening'}
                </Text>
                <Text style={[s.headerTitle, { color: colors.text.primary }]}>My Wallet</Text>
              </View>
              <TouchableOpacity
                style={[s.headerBtn, { backgroundColor: `${PURPLE}15` }]}
                onPress={() => navigation.navigate('AddExpense')}
                onLongPress={sendTestPush}
                delayLongPress={800}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={sendingTest ? 'hourglass-outline' : 'wallet-outline'}
                  size={20}
                  color={PURPLE}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Balance Card */}
            <Animated.View style={{ transform: [{ translateY: cardTranslate }] }}>
              <LinearGradient
                colors={[PURPLE, PURPLE_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.balanceCard}
              >
                {/* decorative circles */}
                <View style={s.balanceDecor1} />
                <View style={s.balanceDecor2} />
                <View style={s.balanceDecor3} />

                <View style={s.balanceTop}>
                  <Text style={s.balanceLabel}>Total Balance</Text>
                  <View style={s.balanceRing}>
                    <Text style={s.balanceRingText}>{expensePct}%</Text>
                  </View>
                </View>
                <Text style={s.balanceAmount}>{fmt(remaining)}</Text>

                {/* Income / Expense pills */}
                <View style={s.balancePills}>
                  <View style={s.pill}>
                    <View style={[s.pillDot, { backgroundColor: GREEN }]} />
                    <View>
                      <Text style={s.pillLabel}>Income</Text>
                      <Text style={s.pillValue}>{fmt(summary.totalIncome)}</Text>
                    </View>
                  </View>
                  <View style={s.pillDivider} />
                  <View style={s.pill}>
                    <View style={[s.pillDot, { backgroundColor: RED }]} />
                    <View>
                      <Text style={s.pillLabel}>Expenses</Text>
                      <Text style={s.pillValue}>{fmt(summary.totalExpense)}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Upgrade banner */}
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <UpgradeBanner message="Get premium insights, unlimited OCR scans & more" />
            </View>

            {/* Quick Actions */}
            <View style={s.quickActions}>
              {QUICK_ACTIONS.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[
                    s.qaBtn,
                    { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => navigation.navigate(a.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[s.qaIcon, { backgroundColor: `${a.color}18` }]}>
                    <Ionicons name={a.icon as any} size={24} color={a.color} />
                  </View>
                  <Text style={[s.qaLabel, { color: colors.text.secondary }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Monthly Insights */}
            {transactions.length > 0 && (
              <View style={s.insightsRow}>
                <View style={[s.insightCard, { backgroundColor: `${PURPLE}10` }]}>
                  <Ionicons name="trending-up" size={18} color={PURPLE} />
                  <Text style={[s.insightVal, { color: colors.text.primary }]}>
                    {fmt(insight.total)}
                  </Text>
                  <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>This Month</Text>
                </View>
                <View style={[s.insightCard, { backgroundColor: `${GREEN}10` }]}>
                  <Ionicons name="calendar" size={18} color={GREEN} />
                  <Text style={[s.insightVal, { color: colors.text.primary }]}>
                    {fmt(insight.dailyAvg)}
                  </Text>
                  <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>Daily Avg</Text>
                </View>
                <View style={[s.insightCard, { backgroundColor: `${PURPLE_LIGHT}12` }]}>
                  <Ionicons name="flame" size={18} color={PURPLE_LIGHT} />
                  <Text style={[s.insightVal, { color: colors.text.primary }]} numberOfLines={1}>
                    {insight.topCat ? fmt(insight.topCat.amount) : fmt(0)}
                  </Text>
                  <Text style={[s.insightLabel, { color: colors.text.tertiary }]} numberOfLines={1}>
                    {insight.topCat ? insight.topCat.name : 'Top Category'}
                  </Text>
                </View>
              </View>
            )}

            {/* Today's Feed — AI summary */}
            {transactions.length > 0 && (
              <TouchableOpacity
                style={[s.feedCard, { backgroundColor: `${PURPLE}10` }]}
                onPress={() => navigation.navigate('TodayFeed')}
                activeOpacity={0.7}
              >
                <View style={s.feedCardLeft}>
                  <View style={[s.feedIcon, { backgroundColor: `${PURPLE}20` }]}>
                    <Ionicons name="sparkles" size={20} color={PURPLE} />
                  </View>
                </View>
                <View style={s.feedCardBody}>
                  <Text style={[s.feedCardTitle, { color: colors.text.primary }]}>
                    Today's AI Feed
                  </Text>
                  <Text style={[s.feedCardDesc, { color: colors.text.tertiary }]} numberOfLines={1}>
                    {transactions.length} transactions analyzed ·{' '}
                    {insight.topCat ? `Top: ${insight.topCat.name}` : 'No insights yet'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

            {/* Search */}
            <View style={s.searchRow}>
              <View style={[s.searchBar, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search transactions..."
                  placeholderTextColor={colors.text.tertiary}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Category Filters */}
            {categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.filterRow}
                contentContainerStyle={s.filterContent}
              >
                <TouchableOpacity
                  style={[
                    s.chip,
                    !selectedCategory
                      ? { backgroundColor: PURPLE, borderColor: PURPLE }
                      : { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSelectedCategory('')}
                >
                  <Text
                    style={[
                      s.chipText,
                      { color: !selectedCategory ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => {
                  const cc = getCategoryColor(cat);
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        s.chip,
                        isActive
                          ? { backgroundColor: cc, borderColor: cc }
                          : {
                              backgroundColor: colors.bg.secondary,
                              borderColor: colors.border.subtle,
                            },
                      ]}
                      onPress={() => setSelectedCategory(isActive ? '' : cat)}
                    >
                      <Ionicons
                        name={getCategoryIcon(cat) as any}
                        size={14}
                        color={isActive ? '#FFF' : colors.text.secondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[s.chipText, { color: isActive ? '#FFF' : colors.text.secondary }]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Section title */}
            {transactions.length > 0 && (
              <View style={s.activityHeader}>
                <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
                  Recent Activity
                </Text>
              </View>
            )}
          </Animated.View>
        }
        renderItem={renderTxItem}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: `${PURPLE}15` }]}>
              <Ionicons name="wallet-outline" size={48} color={PURPLE} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              {search || selectedCategory ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {search || selectedCategory
                ? 'Try a different search or filter'
                : 'Tap + to add your first transaction'}
            </Text>
            {!search && !selectedCategory && (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddExpense')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[PURPLE, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.emptyCta}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={s.emptyCtaText}>Add Transaction</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Ask AI FAB */}
      <TouchableOpacity
        style={s.aiFab}
        onPress={() => navigation.navigate('AIDashboard')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[PURPLE, PURPLE_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.aiFabGrad}
        >
          <Ionicons name="sparkles" size={22} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  emptyContainer: { flexGrow: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 12, fontWeight: '500', marginBottom: 2, letterSpacing: 0.3 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 28,
    paddingBottom: 24,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceDecor1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  balanceDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  balanceDecor3: {
    position: 'absolute',
    top: 20,
    right: 60,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  balanceRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceRingText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 20,
  },
  balancePills: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 12,
    gap: 0,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 8 },
  pillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  pillValue: { fontSize: 14, color: '#FFF', fontWeight: '700', marginTop: 1 },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  qaBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 22,
    gap: 8,
    borderWidth: 1,
  },
  qaIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: { fontSize: 11, fontWeight: '600' },

  insightsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  insightCard: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    gap: 6,
    alignItems: 'center',
  },
  insightVal: { fontSize: 15, fontWeight: '800' },
  insightLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },

  filterRow: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  activityHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },

  sectionWrap: { marginBottom: 4 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  dateLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dateBadgeText: { fontSize: 10, fontWeight: '700' },

  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 3,
    padding: 14,
    borderRadius: 22,
  },
  txIconOuter: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txIconInner: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  txMeta: { fontSize: 11, fontWeight: '500' },
  txDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.4 },
  txCatPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  txCatText: { fontSize: 10, fontWeight: '600' },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  txAmount: { fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48, lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 22,
    gap: 12,
  },
  feedCardLeft: {},
  feedIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCardBody: { flex: 1 },
  feedCardTitle: { fontSize: 14, fontWeight: '700' },
  feedCardDesc: { fontSize: 12, marginTop: 2 },

  aiFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 50,
    ...Platform.select({
      ios: {
        shadowColor: PURPLE,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  aiFabGrad: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
