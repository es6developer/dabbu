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
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PURPLE = '#7C3AED';
const GREEN = '#16A34A';
const RED = '#DC2626';

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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b.localeCompare(a);
    })
    .map(([title, data]) => ({ title, data }));
}

export function MyWalletScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });

  const scrollY = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const [txRes, statsRes] = await Promise.all([
          api.get<any>('/transactions', ctrl.signal),
          api.get<any>('/transactions/stats', ctrl.signal),
        ]);
        if (ctrl.signal.aborted) return;
        const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
        setTransactions(txData.filter((t: any) => !t.expenseGroupId));
        if (statsRes?.summary) {
          setSummary({
            totalIncome: Number(statsRes.summary.totalIncome) || 0,
            totalExpense: Number(statsRes.summary.totalExpense) || 0,
          });
        }
      } catch {
        /* ignore */
      } finally {
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

  const safeCat = (t: any) => {
    const c = t.category;
    return typeof c === 'string' ? c : c?.name || '';
  };

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          safeCat(t).toLowerCase().includes(q),
      );
    }
    return groupByDate(list);
  }, [transactions, search]);

  const balance = summary.totalIncome - summary.totalExpense;

  const monthlyReport = useMemo(() => {
    const now = new Date();
    const m = transactions.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const income = m.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = m.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, count: m.length };
  }, [transactions]);

  if (loading) {
    return (
      <View style={[s.wrapper, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={{ color: colors.text.tertiary, fontSize: 14, fontWeight: '500' }}>Loading wallet...</Text>
        </View>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[s.wrapper, { backgroundColor: colors.bg.primary }]}>
      <SectionList
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
          transactions.length === 0 && !search
            ? s.emptyContainer
            : { paddingBottom: 100 }
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <Animated.View style={[s.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
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
            </Animated.View>

            {/* Balance Card */}
            <View style={[s.balanceCard, { backgroundColor: colors.card.balance }]}>
              <Text style={[s.balanceLabel, { color: colors.text.tertiary }]}>Net Balance</Text>
              <Text style={[s.balanceAmount, { color: balance >= 0 ? GREEN : RED }]}>
                {fmt(balance)}
              </Text>
              <View style={s.balanceRow}>
                <View style={s.balanceItem}>
                  <View style={[s.balanceDot, { backgroundColor: GREEN }]} />
                  <Text style={[s.balanceItemLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[s.balanceItemValue, { color: colors.text.primary }]}>
                    {fmt(summary.totalIncome)}
                  </Text>
                </View>
                <View style={s.balanceItem}>
                  <View style={[s.balanceDot, { backgroundColor: RED }]} />
                  <Text style={[s.balanceItemLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[s.balanceItemValue, { color: colors.text.primary }]}>
                    {fmt(summary.totalExpense)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Add Buttons */}
            <View style={s.addRow}>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: RED }]}
                onPress={() => navigation.navigate('CreateTransaction', { prefill: { type: 'expense' } })}
                activeOpacity={0.8}
              >
                <AntDesign name="minuscircle" size={20} color="#FFF" />
                <Text style={s.addBtnText}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: GREEN }]}
                onPress={() => navigation.navigate('CreateTransaction', { prefill: { type: 'income' } })}
                activeOpacity={0.8}
              >
                <AntDesign name="pluscircle" size={20} color="#FFF" />
                <Text style={s.addBtnText}>Add Income</Text>
              </TouchableOpacity>
            </View>

            {/* Monthly Report */}
            <View style={[s.reportCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
              <Text style={[s.reportTitle, { color: colors.text.primary }]}>
                This Month
              </Text>
              <View style={s.reportRow}>
                <View style={s.reportItem}>
                  <Text style={[s.reportLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[s.reportValue, { color: GREEN }]}>{fmt(monthlyReport.income)}</Text>
                </View>
                <View style={s.reportItem}>
                  <Text style={[s.reportLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[s.reportValue, { color: RED }]}>{fmt(monthlyReport.expense)}</Text>
                </View>
                <View style={s.reportItem}>
                  <Text style={[s.reportLabel, { color: colors.text.tertiary }]}>Transactions</Text>
                  <Text style={[s.reportValue, { color: colors.text.primary }]}>{monthlyReport.count}</Text>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={[s.searchBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
              <AntDesign name="search1" size={16} color={colors.text.tertiary} />
              <TextInput
                placeholder="Search transactions..."
                placeholderTextColor={colors.text.tertiary}
                style={[s.searchInput, { color: colors.text.primary }]}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <AntDesign name="closecircleo" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderSectionHeader={({ section }: any) => (
          <Text style={[s.sectionHeader, { color: colors.text.secondary, backgroundColor: colors.bg.primary }]}>
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
                <View style={[s.txIcon, { backgroundColor: isExpense ? `${RED}15` : `${GREEN}15` }]}>
                  <AntDesign
                    name={(isExpense ? 'arrowup' : 'arrowdown') as any}
                    size={16}
                    color={isExpense ? RED : GREEN}
                  />
                </View>
                <View style={s.txInfo}>
                  <Text style={[s.txDesc, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.description || 'No description'}
                  </Text>
                  <Text style={[s.txCat, { color: colors.text.tertiary }]}>
                    {safeCat(item) || 'Uncategorized'}
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
            <AntDesign name="wallet" size={56} color={colors.text.tertiary} />
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No transactions yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Tap one of the buttons above to add your first expense or income.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  balanceAmount: { fontSize: 38, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  balanceRow: { flexDirection: 'row', marginTop: 20, gap: 24 },
  balanceItem: { flex: 1, gap: 4 },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceItemLabel: { fontSize: 12, fontWeight: '500' },
  balanceItemValue: { fontSize: 18, fontWeight: '700' },
  addRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  reportCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  reportTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  reportRow: { flexDirection: 'row', gap: 12 },
  reportItem: { flex: 1, gap: 4 },
  reportLabel: { fontSize: 11, fontWeight: '500' },
  reportValue: { fontSize: 16, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
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
  txIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txCat: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
});
