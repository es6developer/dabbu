import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { PremiumLoaderScreen } from '../../components/ui/PremiumLoaderScreen';
import { useAuth } from '../../store/AuthContext';
import { Skeleton, SkeletonList } from '../../components/ui/AnimatedSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PURPLE_LIGHT = '#A78BFA';
const GREEN = '#10B981';
const RED = '#EF4444';

const fmt = (n: number) => {
  const prefix = n < 0 ? '-₹' : '₹';
  const abs = Math.abs(n);
  if (abs >= 10000000) {
    return prefix + (abs / 10000000).toFixed(1) + 'Cr';
  }
  if (abs >= 100000) {
    return prefix + (abs / 100000).toFixed(1) + 'L';
  }
  return prefix + abs.toLocaleString('en-IN');
};

function groupByDate(txns: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  for (const t of txns) {
    const d = new Date(t.date || t.createdAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) {
      label = 'Today';
    } else if (d.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      label = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(t);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const order = ['Today', 'Yesterday'];
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
  const [loadingProgress, setLoadingProgress] = useState(0);
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
        setLoadingProgress(0);
      }
      const totalCalls = 2;
      let completed = 0;
      const tick = () => {
        completed++;
        setLoadingProgress(Math.min(Math.round((completed / totalCalls) * 100), 95));
      };
      const settleTimer = setTimeout(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }, 15000);
      try {
        const txP = api.get<any>('/transactions', ctrl.signal).finally(tick);
        const statsP = api.get<any>('/transactions/stats', ctrl.signal).finally(tick);
        const [txRes, statsRes] = await Promise.all([txP, statsP]);
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
          setLoadingProgress(100);
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
      const res: any = await api.post('/devices/test-push', {
        title: 'Test Push',
        body: 'This is a test notification from Dabbu 🎉',
      });
      const detailLines = (res?.devices || [])
        .filter((d: any) => !d.success)
        .map((d: any) => `  ${d.deviceName || d.platform}: ${d.error}`);
      const msg = res?.message || 'Request sent.';
      Alert.alert('Test Push', detailLines.length > 0 ? `${msg}\n\nErrors:\n${detailLines.join('\n')}` : msg,);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send test push');
    } finally {
      setSendingTest(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const categories = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach((t) => {
      const catName = t.category?.name || t.category || 'Other';
      s.add(catName);
    });
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
    return { total, foodTotal, dailyAvg };
  }, [transactions]);

  if (loading) {
    return (
      <PremiumLoaderScreen progress={loadingProgress} title="Loading Wallet" icon="wallet-outline" />
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[s.wrapper, { backgroundColor: colors.bg.primary }]}>
      <AnimatedSectionList
        sections={filtered}
        keyExtractor={(item, i) => `${(item as any).id || i}`}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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

            {/* Filter bar */}
            <View style={[s.filterRow, { paddingHorizontal: 20 }]}>
              <View style={[s.searchBox, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="search" size={16} color={colors.text.tertiary} />
                <TextInput
                  placeholder="Search transactions..."
                  placeholderTextColor={colors.text.tertiary}
                  style={[s.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  s.filterBtn,
                  {
                    backgroundColor: selectedCategory ? PURPLE : colors.bg.secondary,
                    borderColor: selectedCategory ? PURPLE : colors.border.subtle,
                  },
                ]}
                onPress={() => {
                  const nextCat =
                    categories.length > 0
                      ? categories[(categories.indexOf(selectedCategory) + 1) % categories.length]
                      : '';
                  setSelectedCategory(
                    selectedCategory
                      ? nextCat === selectedCategory
                        ? ''
                        : nextCat
                      : categories[0] || '',
                  );
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="funnel"
                  size={16}
                  color={selectedCategory ? '#FFF' : colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        renderSectionHeader={({ section }: any) => (
          <Text
            style={[
              s.sectionHeader,
              { color: colors.text.secondary, backgroundColor: colors.bg.primary },
            ]}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }: any) => {
          const isExpense = item.type === 'expense';
          return (
            <TouchableOpacity
              style={[s.txCard, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
              activeOpacity={0.7}
            >
              <View style={s.txLeft}>
                <View
                  style={[s.txIcon, { backgroundColor: isExpense ? `${RED}15` : `${GREEN}15` }]}
                >
                  <Ionicons
                    name={isExpense ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={isExpense ? RED : GREEN}
                  />
                </View>
                <View style={s.txInfo}>
                  <Text style={[s.txDesc, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.description || 'No description'}
                  </Text>
                  <Text style={[s.txCat, { color: colors.text.tertiary }]}>
                    {item.category?.name || item.category || 'Uncategorized'}
                  </Text>
                </View>
              </View>
              <Text style={[s.txAmount, { color: isExpense ? RED : GREEN }]}>
                {isExpense ? '-' : '+'}₹{Math.abs(Number(item.amount)).toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={56} color={colors.text.tertiary} />
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No transactions yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Tap the + button to add your first expense or income.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 8,
    overflow: 'hidden',
  },
  balanceDecor1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  balanceDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  balanceDecor3: {
    position: 'absolute',
    top: 20,
    right: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  balanceRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceRingText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 6,
    letterSpacing: -1,
  },
  balancePills: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 12,
  },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  pillValue: { fontSize: 15, fontWeight: '700', color: '#FFF', marginTop: 1 },
  pillDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 },
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 3,
    padding: 14,
    borderRadius: 16,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txCat: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
});
