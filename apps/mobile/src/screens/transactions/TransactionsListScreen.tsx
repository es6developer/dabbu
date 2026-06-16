import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PADDING, borderRadius, shadows, fabShadow } from '../../theme/design';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';
import { getCategoryColor } from '../../config/categoryIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const categoryIcons: Record<string, string> = {
  Food: 'fast-food',
  Transport: 'car',
  Shopping: 'bag',
  Bills: 'document-text',
  Entertainment: 'film',
  Health: 'fitness',
  Education: 'school',
  Travel: 'airplane',
  Groceries: 'cart',
  Rent: 'home',
  Salary: 'cash',
  Investment: 'trending-up',
  Utilities: 'flash',
  Insurance: 'shield',
  Dining: 'restaurant',
  Other: 'ellipsis-horizontal',
};

function getIcon(cat: string): string {
  return categoryIcons[cat] || 'ellipsis-horizontal';
}

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

function groupByDate(txs: any[]): { title: string; data: any[] }[] {
  const groups: Record<string, any[]> = {};
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  for (const t of txs) {
    const d = new Date(t.date || t.createdAt);
    const dStr = d.toDateString();
    let key: string;
    if (dStr === todayStr) {
      key = 'Today';
    } else if (dStr === yesterdayStr) {
      key = 'Yesterday';
    } else if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      key = 'This Month';
    } else {
      key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(t);
  }
  const order = ['Today', 'Yesterday', 'This Month'];
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = order.indexOf(a),
        bi = order.indexOf(b);
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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
] as const;

export function TransactionsListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<any>({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });

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
        const [txRes, sumRes] = await Promise.allSettled([
          api.get<any>('/transactions?limit=200', ctrl.signal),
          api.get<any>('/transactions/summary', ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }
        const txs =
          txRes.status === 'fulfilled'
            ? Array.isArray(txRes.value)
              ? txRes.value
              : txRes.value?.data || []
            : [];
        setTransactions(txs);
        if (sumRes.status === 'fulfilled') {
          setSummary(sumRes.value || {});
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

  const filtered = useMemo(() => {
    let txs = transactions;
    if (activeFilter === 'income') {
      txs = txs.filter((t: any) => t.type === 'income');
    }
    if (activeFilter === 'expense') {
      txs = txs.filter((t: any) => t.type === 'expense');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(
        (t: any) =>
          (t.description || t.note || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q),
      );
    }
    return groupByDate(txs);
  }, [transactions, activeFilter, searchQuery]);

  const renderTx = useCallback(
    ({ item }: any) => {
      const isIncome = item.type === 'income';
      const amount = Number(item.amount || 0);
      const txColor = isIncome ? colors.status.success : colors.status.error;
      const catName = item.category || item.categoryName || 'Other';
      const catColor = getCategoryColor(catName);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: colors.bg.card,
            borderRadius: borderRadius.md,
            marginBottom: 4,
            ...shadows.sm,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: `${catColor}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AntDesign name={getIcon(catName) as any} size={20} color={catColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
              numberOfLines={1}
            >
              {item.description || item.note || catName}
            </Text>
            {item.paymentMode || item.category ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {item.category && (
                  <View
                    style={{
                      backgroundColor: `${catColor}12`,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: catColor }}>
                      {catName}
                    </Text>
                  </View>
                )}
                {item.paymentMode && (
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}>
                    {item.paymentMode}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: txColor, marginLeft: 8 }}>
            {isIncome ? '+' : '-'}
            {fmt(amount)}
          </Text>
        </TouchableOpacity>
      );
    },
    [colors, navigation],
  );

  const renderSectionHeader = useCallback(
    ({ section }: any) => (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          paddingTop: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View
          style={{
            backgroundColor: `${colors.accent.primary}10`,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.accent.primary,
              letterSpacing: 0.3,
            }}
          >
            {section.title.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border.subtle }} />
      </View>
    ),
    [colors],
  );

  const totalIncome = summary.monthlyIncome || 0;
  const totalExpense = summary.monthlySpending || 0;

  if (loading && transactions.length === 0) {
    return (
      <View
        style={[s.screen, { backgroundColor: colors.bg.primary }, { paddingTop: insets.top + 60 }]}
      >
        <View style={{ padding: PADDING, gap: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                height: 64,
                backgroundColor: colors.bg.tertiary,
                borderRadius: borderRadius.md,
                opacity: Math.max(0.3, 1 - i * 0.12),
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <Animated.View style={{ opacity: headerOpacity }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: PADDING, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text.primary,
                letterSpacing: -0.5,
              }}
            >
              Transactions
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SearchTransactions')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${colors.accent.primary}10`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign  name="search1" size={20} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>

          {/* Summary Bar */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 4,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.card.income,
                borderRadius: borderRadius.md,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: `${colors.status.success}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AntDesign  name="down" size={14} color={colors.status.success} />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: colors.text.tertiary,
                    letterSpacing: 0.3,
                  }}
                >
                  INCOME
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  {fmt(totalIncome)}
                </Text>
              </View>
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.card.expense,
                borderRadius: borderRadius.md,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: `${colors.status.error}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AntDesign  name="up" size={14} color={colors.status.error} />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: colors.text.tertiary,
                    letterSpacing: 0.3,
                  }}
                >
                  EXPENSES
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  {fmt(totalExpense)}
                </Text>
              </View>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.7}
                onPress={() => setActiveFilter(f.key)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  backgroundColor:
                    activeFilter === f.key ? colors.accent.primary : colors.bg.tertiary,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: activeFilter === f.key ? '#FFFFFF' : colors.text.secondary,
                    letterSpacing: 0.2,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>

      {filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.title}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: PADDING, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.accent.primary}
            />
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
          renderItem={({ item: section }: any) => (
            <View style={{ marginBottom: 4 }}>
              {renderSectionHeader({ section })}
              {section.data.map((tx: any, i: number) => (
                <View key={tx.id || i}>{renderTx({ item: tx })}</View>
              ))}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={{ flex: 1, justifyContent: 'center', padding: PADDING }}
          ListEmptyComponent={
            <PremiumEmptyState
              icon={
                activeFilter === 'income'
                  ? 'wallet'
                  : activeFilter === 'expense'
                    ? 'filetext1'
                    : 'filetext1'
              }
              title={searchQuery ? 'No matching transactions' : 'No transactions yet'}
              message={
                searchQuery
                  ? 'Try a different search term'
                  : 'Add your first expense or income to start tracking'
              }
              action={
                !searchQuery ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddExpense')}
                    style={{
                      backgroundColor: colors.accent.primary,
                      paddingVertical: 14,
                      paddingHorizontal: 28,
                      borderRadius: 14,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                      Add Transaction
                    </Text>
                  </TouchableOpacity>
                ) : undefined
              }
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddExpense')}
        style={[s.fab, { backgroundColor: colors.accent.primary }, fabShadow]}
      >
        <AntDesign  name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  fab: {
    position: 'absolute',
    right: PADDING,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
