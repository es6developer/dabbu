import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  TextInput, Alert, Dimensions, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton, SkeletonList } from '../../components/ui/AnimatedSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 56) / 3;

const CATEGORY_ICONS: Record<string, string> = {
  Food: 'fast-food-outline', Travel: 'airplane-outline', Shopping: 'cart-outline',
  Medical: 'medkit-outline', Fuel: 'flame-outline', Rent: 'home-outline',
  EMI: 'card-outline', Bills: 'receipt-outline', Entertainment: 'tv-outline',
  Education: 'school-outline', Grocery: 'basket-outline', Investment: 'trending-up-outline',
  Salary: 'cash-outline', Transfer: 'swap-horizontal-outline',
};
const CATEGORY_COLORS: Record<string, string[]> = {
  Food: ['#FF6B35', '#F7931E'], Travel: ['#4A90D9', '#357ABD'],
  Shopping: ['#E056A0', '#C94D8B'], Medical: ['#00B894', '#00A381'],
  Fuel: ['#FDCB6E', '#F0A830'], Rent: ['#6C5CE7', '#5A4BD1'],
  EMI: ['#E17055', '#D63031'], Bills: ['#0984E3', '#0768B8'],
  Entertainment: ['#A29BFE', '#817CE8'], Education: ['#55EFC4', '#00CEC9'],
  Grocery: ['#81ECEC', '#00CEC9'], Investment: ['#74B9FF', '#4D96FF'],
  Salary: ['#00B894', '#00A381'], Transfer: ['#DFE6E9', '#B2BEC3'],
};

function getCategoryIcon(cat: string) { return CATEGORY_ICONS[cat] || 'ellipse-outline'; }
function getCategoryColors(cat: string) { return CATEGORY_COLORS[cat] || ['#F7892C', '#F9A44A']; }
function fmt(v: number) { return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

function groupByDate(tx: any[]) {
  const groups: Record<string, any[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toDateString();
  const thisMonth = now.getMonth(), thisYear = now.getFullYear();
  for (const t of tx) {
    const d = new Date(t.date || t.createdAt);
    const ds = d.toDateString();
    let key: string;
    if (ds === today) key = 'Today';
    else if (ds === yStr) key = 'Yesterday';
    else if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) key = 'This Month';
    else key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    (groups[key] ||= []).push(t);
  }
  const order = ['Today', 'Yesterday', 'This Month'];
  return Object.entries(groups).sort(([a], [b]) => {
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1; if (bi !== -1) return 1;
    return b.localeCompare(a);
  }).map(([title, data]) => ({ title, data }));
}

const PREMIUM_CATEGORIES = [
  { icon: 'add-circle', label: 'Add', color: '#00B894', screen: 'AddExpense' },
  { icon: 'scan', label: 'Scan', color: '#F7892C', screen: 'BillScanner' },
  { icon: 'receipt', label: 'Bills', color: '#4A90D9', screen: 'BillsList' },
  { icon: 'trending-up', label: 'Analytics', color: '#6C5CE7', screen: 'Analytics' },
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
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const [txRes, statsRes] = await Promise.all([
        api.get<any>('/transactions', ctrl.signal),
        api.get<any>('/transactions/stats', ctrl.signal),
      ]);
      if (ctrl.signal.aborted) return;
      const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
      setTransactions(txData.filter((t: any) => !t.expenseGroupId));
      if (statsRes?.summary) setSummary({
        totalIncome: Number(statsRes.summary.totalIncome) || 0,
        totalExpense: Number(statsRes.summary.totalExpense) || 0,
      });
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    } catch (e) { /* ignore */ }
    finally { if (!ctrl.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [accessToken, fadeAnim, cardScale]);

  useFocusEffect(useCallback(() => { loadData(); return () => abortRef.current?.abort(); }, [loadData]));

  async function handleDelete(id: string) {
    Alert.alert('Delete Transaction', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (accessToken) setAccessToken(accessToken);
          await api.delete(`/transactions/${id}`);
          setTransactions(p => p.filter(t => t.id !== id));
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  const categories = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach(t => s.add(t.category?.name || t.category || 'Other'));
    return Array.from(s).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.description||'').toLowerCase().includes(q) || (t.category?.name||t.category||'').toLowerCase().includes(q));
    }
    if (selectedCategory) list = list.filter(t => (t.category?.name || t.category) === selectedCategory);
    return groupByDate(list);
  }, [transactions, search, selectedCategory]);

  const remaining = summary.totalIncome - summary.totalExpense;
  const expensePct = summary.totalIncome > 0 ? Math.min(Math.round((summary.totalExpense / summary.totalIncome) * 100), 100) : 0;

  const insight = useMemo(() => {
    const now = new Date();
    const m = transactions.filter(t => { const d = new Date(t.date || t.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const total = m.reduce((s, t) => s + Number(t.amount), 0);
    const foodTotal = m.filter(t => (t.category?.name||t.category) === 'Food' && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const dailyAvg = m.length > 0 ? total / m.length : 0;
    const catSpending: Record<string, number> = {};
    m.filter(t => t.type === 'expense').forEach(t => { const c = t.category?.name||t.category||'Other'; catSpending[c] = (catSpending[c]||0) + Number(t.amount); });
    const top = Object.entries(catSpending).sort(([,a],[,b]) => b - a)[0];
    return { total, foodTotal, dailyAvg, topCat: top ? { name: top[0], amount: top[1] } : null };
  }, [transactions]);

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0], extrapolate: 'clamp' });

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Skeleton width={90} height={12} />
            <Skeleton width={130} height={26} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={42} height={42} borderRadius={12} />
        </View>
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Skeleton width="100%" height={200} borderRadius={28} />
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} width={(SCREEN_WIDTH-70)/4} height={80} borderRadius={18} />)}
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.title}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent.primary} />}
        contentContainerStyle={transactions.length === 0 && !search && !selectedCategory ? s.emptyContainer : { paddingBottom: 100 }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <Animated.View style={[s.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
              <View>
                <Text style={[s.greeting, { color: colors.text.tertiary }]}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                </Text>
                <Text style={[s.headerTitle, { color: colors.text.primary }]}>My Wallet</Text>
              </View>
              <TouchableOpacity style={[s.avatar, { backgroundColor: `${colors.accent.primary}18` }]} onPress={() => navigation.navigate('AddExpense')}>
                <LinearGradient colors={colors.accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarGrad}>
                  <Ionicons name="wallet-outline" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: cardScale }] }}>
              <LinearGradient colors={['#1A1A3E', '#16213E', '#0F3460']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.balanceCard}>
                <View style={s.balanceTop}>
                  <View>
                    <Text style={s.balanceLabel}>Total Balance</Text>
                    <Text style={s.balanceAmount}>{fmt(remaining)}</Text>
                  </View>
                  <View style={s.balanceRing}>
                    <Text style={s.balanceRingText}>{expensePct}%</Text>
                  </View>
                </View>
                <View style={s.barRow}>
                  <View style={s.barItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[s.dot, { backgroundColor: '#00B894' }]} />
                      <Text style={s.barLabel}>Income</Text>
                      <Text style={s.barValue}>{fmt(summary.totalIncome)}</Text>
                    </View>
                    <View style={s.track}><View style={[s.fill, { width: `${100 - expensePct}%`, backgroundColor: '#00B894' }]} /></View>
                  </View>
                  <View style={s.barItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[s.dot, { backgroundColor: '#FF6B6B' }]} />
                      <Text style={s.barLabel}>Expense</Text>
                      <Text style={s.barValue}>{fmt(summary.totalExpense)}</Text>
                    </View>
                    <View style={s.track}><View style={[s.fill, { width: `${expensePct}%`, backgroundColor: '#FF6B6B' }]} /></View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            <View style={s.quickActions}>
              {PREMIUM_CATEGORIES.map(a => (
                <TouchableOpacity key={a.label} style={[s.qaBtn, { backgroundColor: colors.bg.secondary }]} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.7}>
                  <LinearGradient colors={[`${a.color}25`, `${a.color}10`]} style={s.qaIcon}>
                    <Ionicons name={a.icon as any} size={22} color={a.color} />
                  </LinearGradient>
                  <Text style={[s.qaLabel, { color: colors.text.secondary }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {transactions.length > 0 && (
              <View style={s.insightsRow}>
                {[
                  { icon: 'trending-up', color: '#00B894', value: insight.total, label: 'This Month' },
                  { icon: 'calendar', color: '#6C5CE7', value: insight.dailyAvg, label: 'Daily Avg' },
                  { icon: 'fast-food', color: '#F7892C', value: insight.foodTotal, label: 'Food' },
                ].map((c, i) => (
                  <LinearGradient key={i} colors={[`${c.color}12`, `${c.color}05`]} style={s.insightCard}>
                    <Ionicons name={c.icon as any} size={16} color={c.color} />
                    <Text style={[s.insightVal, { color: colors.text.primary }]}>{fmt(c.value)}</Text>
                    <Text style={[s.insightLabel, { color: colors.text.tertiary }]}>{c.label}</Text>
                  </LinearGradient>
                ))}
              </View>
            )}

            <View style={s.searchRow}>
              <View style={[s.searchBar, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput style={[s.searchInput, { color: colors.text.primary }]} value={search} onChangeText={setSearch} placeholder="Search transactions..." placeholderTextColor={colors.text.tertiary} />
                {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.text.tertiary} /></TouchableOpacity> : null}
              </View>
            </View>

            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
                <TouchableOpacity style={[s.chip, !selectedCategory ? s.chipActive : { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]} onPress={() => setSelectedCategory('')}>
                  <Text style={[s.chipText, { color: !selectedCategory ? '#FFF' : colors.text.secondary }]}>All</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity key={cat} style={[s.chip, selectedCategory === cat ? s.chipActive : { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]} onPress={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}>
                    <Ionicons name={getCategoryIcon(cat) as any} size={14} color={selectedCategory === cat ? '#FFF' : colors.text.secondary} style={{ marginRight: 4 }} />
                    <Text style={[s.chipText, { color: selectedCategory === cat ? '#FFF' : colors.text.secondary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {transactions.length > 0 && <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Recent Activity</Text>}
          </Animated.View>
        }
        renderItem={({ item: section }) => (
          <View>
            <Text style={[s.dateLabel, { color: colors.text.tertiary }]}>{section.title}</Text>
            {section.data.map((t: any) => {
              const isIncome = t.type === 'income';
              const cat = t.category?.name || t.category || 'Other';
              const time = new Date(t.date || t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              const catColors = getCategoryColors(cat);
              return (
                <TouchableOpacity key={t.id} style={[s.txCard, { backgroundColor: colors.bg.secondary }]} activeOpacity={0.7}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: t.id })}
                  onLongPress={() => handleDelete(t.id)}>
                  <LinearGradient colors={catColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.txIcon}>
                    <Ionicons name={getCategoryIcon(cat) as any} size={18} color="#FFF" />
                  </LinearGradient>
                  <View style={s.txBody}>
                    <Text style={[s.txDesc, { color: colors.text.primary }]} numberOfLines={1}>{t.description || cat}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.txMeta, { color: colors.text.tertiary }]}>{time}</Text>
                      <View style={[s.txDot, { backgroundColor: colors.text.tertiary }]} />
                      <Text style={[s.txMeta, { color: catColors[0] }]}>{cat}</Text>
                    </View>
                  </View>
                  <Text style={[s.txAmount, { color: isIncome ? '#00B894' : '#FF6B6B' }]}>{isIncome ? '+' : '-'}{fmt(Number(t.amount))}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient colors={['#F7892C20', '#FF6B6B15']} style={s.emptyIcon}>
              <Ionicons name="wallet-outline" size={44} color="#F7892C" />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              {search || selectedCategory ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {search || selectedCategory ? 'Try a different search or filter' : 'Tap + to add your first transaction'}
            </Text>
            {!search && !selectedCategory && (
              <TouchableOpacity style={s.emptyCta} onPress={() => navigation.navigate('AddExpense')} activeOpacity={0.8}>
                <LinearGradient colors={colors.accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyCtaGrad}>
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={s.emptyCtaText}>Add Transaction</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  emptyContainer: { flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  greeting: { fontSize: 12, fontWeight: '500', marginBottom: 2, letterSpacing: 0.3 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  avatar: { width: 42, height: 42, borderRadius: 12, overflow: 'hidden' },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { marginHorizontal: 20, borderRadius: 28, padding: 24, gap: 20, marginBottom: 16 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFF', letterSpacing: -1, marginTop: 4 },
  balanceRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  balanceRingText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  barRow: { gap: 12 },
  barItem: { gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  barLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  barValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  fill: { height: '100%', borderRadius: 2 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  qaBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 20, gap: 8 },
  qaIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '600' },
  insightsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  insightCard: { flex: 1, padding: 14, borderRadius: 18, gap: 6, alignItems: 'center' },
  insightVal: { fontSize: 14, fontWeight: '700' },
  insightLabel: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 18, height: 48 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },
  filterRow: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  chipActive: { backgroundColor: '#F7892C', borderColor: '#F7892C' },
  chipText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  dateLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, paddingVertical: 10 },
  txCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 3, padding: 14, borderRadius: 20 },
  txIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txBody: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txMeta: { fontSize: 12, marginTop: 2 },
  txDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.4, marginTop: 2 },
  txAmount: { fontSize: 17, fontWeight: '700', marginLeft: 8 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyIcon: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48, lineHeight: 18 },
  emptyCta: { marginTop: 4 },
  emptyCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16 },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
