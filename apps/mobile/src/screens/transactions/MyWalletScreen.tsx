import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const fmt = (n: number) => {
  const prefix = n < 0 ? '-₹' : '₹';
  const abs = Math.abs(n);
  if (abs >= 10000000) return prefix + (abs / 10000000).toFixed(1) + 'Cr';
  if (abs >= 100000) return prefix + (abs / 100000).toFixed(1) + 'L';
  return prefix + abs.toLocaleString('en-IN');
};

function groupByDate(txns: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  for (const t of txns) {
    const d = new Date(t.date || t.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const order = ['Today', 'Yesterday'];
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1; if (bi !== -1) return 1;
    return b.localeCompare(a);
  }).map(([title, data]) => ({ title, data }));
}

export function MyWalletScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const scrollY = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    if (accessToken) setAccessToken(accessToken);
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [txRes, statsRes] = await Promise.all([
        api.get<any>('/transactions', ctrl.signal),
        api.get<any>('/transactions/stats', ctrl.signal),
      ]);
      if (ctrl.signal.aborted) return;
      const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
      setTransactions(txData.filter((t: any) => !t.expenseGroupId));
      if (statsRes?.summary) setSummary({ totalIncome: Number(statsRes.summary.totalIncome) || 0, totalExpense: Number(statsRes.summary.totalExpense) || 0 });
    } catch {}
    finally { if (!ctrl.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const safeCat = (t: any) => { const c = t.category; return typeof c === 'string' ? c : c?.name || ''; };

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(t => (t.description || '').toLowerCase().includes(q) || safeCat(t).toLowerCase().includes(q)); }
    return groupByDate(list);
  }, [transactions, search]);

  const balance = summary.totalIncome - summary.totalExpense;

  const monthlyReport = useMemo(() => {
    const now = new Date();
    const m = transactions.filter(t => { const d = new Date(t.date || t.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    return { income: m.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), expense: m.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), count: m.length };
  }, [transactions]);

  if (loading) {
    return (
      <View style={[st.wrapper, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={{ color: colors.text.tertiary, fontSize: 14, fontWeight: '500' }}>Loading wallet...</Text>
        </View>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={[st.wrapper, { backgroundColor: colors.bg.primary }]}>
      <SectionList
        sections={filtered}
        keyExtractor={(item, i) => `${(item as any).id || i}`}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent.primary} colors={[colors.accent.primary]} />}
        contentContainerStyle={transactions.length === 0 && !search ? st.emptyContainer : { paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <Animated.View style={[st.header, { paddingTop: insets.top + spacing.sm, opacity: headerOpacity }]}>
              <View>
                <Text style={[st.greeting, { color: colors.text.tertiary }]}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                </Text>
                <Text style={[st.headerTitle, { color: colors.text.primary }]}>My Wallet</Text>
              </View>
            </Animated.View>

            <View style={[st.balanceCard, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[st.balanceLabel, { color: colors.text.tertiary }]}>Net Balance</Text>
              <Text style={[st.balanceAmount, { color: colors.text.primary }]}>{fmt(balance)}</Text>
              <View style={st.balanceRow}>
                <View style={st.balanceItem}>
                  <Text style={[st.balanceItemLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[st.balanceItemValue, { color: colors.status.success }]}>{fmt(summary.totalIncome)}</Text>
                </View>
                <View style={st.balanceItem}>
                  <Text style={[st.balanceItemLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[st.balanceItemValue, { color: colors.status.error }]}>{fmt(summary.totalExpense)}</Text>
                </View>
              </View>
            </View>

            <View style={st.addRow}>
              <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.navigate('CreateTransaction', { prefill: { type: 'expense' } })} activeOpacity={0.85}>
                <Text style={st.addBtnText}>+ Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.subtle }]} onPress={() => navigation.navigate('CreateTransaction', { prefill: { type: 'income' } })} activeOpacity={0.85}>
                <Text style={[st.addBtnSecondaryText, { color: colors.text.primary }]}>+ Add Income</Text>
              </TouchableOpacity>
            </View>

            <View style={[st.reportCard, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[st.reportTitle, { color: colors.text.primary }]}>This Month</Text>
              <View style={st.reportRow}>
                <View style={st.reportItem}>
                  <Text style={[st.reportLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[st.reportValue, { color: colors.status.success }]}>{fmt(monthlyReport.income)}</Text>
                </View>
                <View style={st.reportItem}>
                  <Text style={[st.reportLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[st.reportValue, { color: colors.status.error }]}>{fmt(monthlyReport.expense)}</Text>
                </View>
                <View style={st.reportItem}>
                  <Text style={[st.reportLabel, { color: colors.text.tertiary }]}>Count</Text>
                  <Text style={[st.reportValue, { color: colors.text.primary }]}>{monthlyReport.count}</Text>
                </View>
              </View>
            </View>

            <View style={[st.searchBox, { backgroundColor: colors.bg.secondary }]}>
              <AntDesign name="search1" size={14} color={colors.text.tertiary} />
              <TextInput placeholder="Search transactions..." placeholderTextColor={colors.text.tertiary} style={[st.searchInput, { color: colors.text.primary }]} value={search} onChangeText={setSearch} />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><AntDesign name="closecircleo" size={14} color={colors.text.tertiary} /></TouchableOpacity>}
            </View>
          </View>
        }
        renderSectionHeader={({ section }: any) => (
          <Text style={[st.sectionHeader, { color: colors.text.secondary, backgroundColor: colors.bg.primary }]}>{section.title}</Text>
        )}
        renderItem={({ item }: any) => {
          const isExpense = item.type === 'expense';
          return (
            <TouchableOpacity style={[st.txCard]} onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })} activeOpacity={0.7}>
              <View style={[st.txIcon, { backgroundColor: isExpense ? `${colors.status.error}12` : `${colors.status.success}12` }]}>
                <AntDesign name={(isExpense ? 'arrowup' : 'arrowdown') as any} size={14} color={isExpense ? colors.status.error : colors.status.success} />
              </View>
              <View style={st.txInfo}>
                <Text style={[st.txDesc, { color: colors.text.primary }]} numberOfLines={1}>{item.description || 'No description'}</Text>
                <Text style={[st.txCat, { color: colors.text.tertiary }]}>{safeCat(item) || 'Uncategorized'}</Text>
              </View>
              <Text style={[st.txAmount, { color: isExpense ? colors.status.error : colors.status.success }]}>
                {isExpense ? '-' : '+'}₹{Math.abs(Number(item.amount)).toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={st.empty}>
            <AntDesign name="wallet" size={48} color={colors.text.tertiary} />
            <Text style={[st.emptyTitle, { color: colors.text.primary }]}>No transactions yet</Text>
            <Text style={[st.emptyDesc, { color: colors.text.tertiary }]}>Tap one of the buttons above to add your first expense or income.</Text>
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['2xl'], paddingBottom: spacing.md },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', marginTop: spacing.xs },
  balanceCard: { marginHorizontal: spacing['2xl'], borderRadius: borderRadius['3xl'], padding: spacing['2xl'], marginBottom: spacing.lg },
  balanceLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  balanceAmount: { fontSize: 34, fontWeight: '800', marginTop: spacing.sm, letterSpacing: -1 },
  balanceRow: { flexDirection: 'row', marginTop: spacing['2xl'], gap: spacing['3xl'] },
  balanceItem: { gap: spacing.xs },
  balanceItemLabel: { fontSize: 12, fontWeight: '500' },
  balanceItemValue: { fontSize: 18, fontWeight: '700' },
  addRow: { flexDirection: 'row', paddingHorizontal: spacing['2xl'], gap: spacing.sm, marginBottom: spacing.lg },
  addBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius['2xl'] },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  addBtnSecondaryText: { fontSize: 15, fontWeight: '600' },
  reportCard: { marginHorizontal: spacing['2xl'], borderRadius: borderRadius['2xl'], padding: spacing.xl, marginBottom: spacing.lg },
  reportTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
  reportRow: { flexDirection: 'row', gap: spacing.sm },
  reportItem: { flex: 1, gap: spacing.xs },
  reportLabel: { fontSize: 11, fontWeight: '500' },
  reportValue: { fontSize: 16, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing['2xl'], borderRadius: borderRadius['2xl'], paddingHorizontal: spacing.md, height: 40, gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: spacing['2xl'], paddingVertical: spacing.sm },
  txCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing['2xl'], marginVertical: spacing.xs, padding: spacing.md, borderRadius: borderRadius['2xl'] },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  txIcon: { width: 36, height: 36, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txCat: { fontSize: 11, marginTop: spacing.xs, fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: spacing['4xl'] },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
});
