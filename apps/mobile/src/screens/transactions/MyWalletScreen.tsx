import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_ICONS: Record<string, string> = {
  Food: 'fast-food-outline',
  Travel: 'airplane-outline',
  Shopping: 'cart-outline',
  Medical: 'medkit-outline',
  Fuel: 'flame-outline',
  Rent: 'home-outline',
  EMI: 'card-outline',
  Bills: 'receipt-outline',
  Entertainment: 'tv-outline',
  Education: 'school-outline',
  Grocery: 'basket-outline',
  Investment: 'trending-up-outline',
  Salary: 'cash-outline',
  Transfer: 'swap-horizontal-outline',
};

function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat] || 'ellipse-outline';
}

function formatCurrency(val: number) {
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function groupByDate(transactions: any[]): { title: string; data: any[] }[] {
  const groups: Record<string, any[]> = {};
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  for (const t of transactions) {
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
  { icon: 'add-circle', label: 'Add', color: '#00B894', screen: 'AddExpense' },
  { icon: 'scan', label: 'Scan', color: '#f7892c', screen: 'BillScanner' },
  { icon: 'receipt', label: 'Bills', color: '#0984E3', screen: 'BillsList' },
  { icon: 'trending-up', label: 'Analytics', color: '#6C5CE7', screen: 'MonthlyComparison' },
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

  const loadData = useCallback(async () => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const [txRes, statsRes] = await Promise.all([
        api.get<any>('/transactions'),
        api.get<any>('/transactions/stats'),
      ]);
      const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
      const personalTx = txData.filter((t: any) => !t.expenseGroupId);
      setTransactions(personalTx);
      if (statsRes?.summary) {
        setSummary({
          totalIncome: Number(statsRes.summary.totalIncome) || 0,
          totalExpense: Number(statsRes.summary.totalExpense) || 0,
        });
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  async function handleDelete(id: string) {
    Alert.alert('Delete Transaction', 'Are you sure?', [
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
            setTransactions((prev) => prev.filter((t) => t.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const cat = t.category?.name || t.category || 'Other';
      set.add(cat);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.category?.name || t.category || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q),
      );
    }
    if (selectedCategory) {
      list = list.filter((t) => (t.category?.name || t.category) === selectedCategory);
    }
    return groupByDate(list);
  }, [transactions, search, selectedCategory]);

  const remaining = summary.totalIncome - summary.totalExpense;
  const expensePct =
    summary.totalIncome > 0 ? Math.round((summary.totalExpense / summary.totalIncome) * 100) : 0;

  const insight = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const total = thisMonth.reduce((s, t) => s + Number(t.amount), 0);
    const foodTotal = thisMonth
      .filter((t) => (t.category?.name || t.category) === 'Food' && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const dailyAvg = thisMonth.length > 0 ? total / thisMonth.length : 0;
    const catSpending: Record<string, number> = {};
    thisMonth
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category?.name || t.category || 'Other';
        catSpending[cat] = (catSpending[cat] || 0) + Number(t.amount);
      });
    const topCat = Object.entries(catSpending).sort(([, a], [, b]) => b - a)[0];

    return {
      total,
      foodTotal,
      dailyAvg,
      topCat: topCat ? { name: topCat[0], amount: topCat[1] } : null,
    };
  }, [transactions]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View
            style={[
              styles.skeletonBlock,
              { width: 120, height: 20, backgroundColor: colors.bg.tertiary },
            ]}
          />
          <View
            style={[
              styles.skeletonBlock,
              { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.bg.tertiary },
            ]}
          />
        </View>
        <View style={[styles.skeletonCard, { backgroundColor: colors.bg.tertiary }]} />
        <View style={styles.quickActions}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.skeletonQa, { backgroundColor: colors.bg.tertiary }]} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.title}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          transactions.length === 0 && !search && !selectedCategory
            ? styles.emptyContainer
            : { paddingBottom: 100 }
        }
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={[styles.headerGreeting, { color: colors.text.tertiary }]}>
                  {new Date().getHours() < 12
                    ? 'Good morning'
                    : new Date().getHours() < 18
                      ? 'Good afternoon'
                      : 'Good evening'}
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>My Wallet</Text>
              </View>
              <TouchableOpacity
                style={[styles.avatarBtn, { backgroundColor: `${colors.accent.primary}20` }]}
              >
                <Ionicons name="person" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(remaining)}</Text>
              <View style={styles.balanceBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.balanceDot, { backgroundColor: '#00B894' }]} />
                  <Text style={styles.balanceBarText}>
                    Income {formatCurrency(summary.totalIncome)}
                  </Text>
                </View>
                <View style={styles.balanceBarTrack}>
                  <View
                    style={[
                      styles.balanceBarFill,
                      { width: `${Math.min(100 - expensePct, 100)}%`, backgroundColor: '#00B894' },
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.balanceDot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.balanceBarText}>
                    Expense {formatCurrency(summary.totalExpense)}
                  </Text>
                </View>
                <View style={styles.balanceBarTrack}>
                  <View
                    style={[
                      styles.balanceBarFill,
                      { width: `${Math.min(expensePct, 100)}%`, backgroundColor: '#FF6B6B' },
                    ]}
                  />
                </View>
              </View>
            </LinearGradient>

            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.quickAction, { backgroundColor: colors.bg.tertiary }]}
                  onPress={() => navigation.navigate(action.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                    <Ionicons name={action.icon as any} size={22} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text.secondary }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {transactions.length > 0 && (
              <View style={styles.insightsRow}>
                <View style={[styles.insightCard, { backgroundColor: colors.bg.tertiary }]}>
                  <Ionicons name="trending-up" size={16} color="#00B894" />
                  <Text style={[styles.insightValue, { color: colors.text.primary }]}>
                    {formatCurrency(insight.total)}
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.text.tertiary }]}>
                    This Month
                  </Text>
                </View>
                <View style={[styles.insightCard, { backgroundColor: colors.bg.tertiary }]}>
                  <Ionicons name="calendar" size={16} color="#6C5CE7" />
                  <Text style={[styles.insightValue, { color: colors.text.primary }]}>
                    {formatCurrency(insight.dailyAvg)}
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.text.tertiary }]}>
                    Daily Avg
                  </Text>
                </View>
                <View style={[styles.insightCard, { backgroundColor: colors.bg.tertiary }]}>
                  <Ionicons name="fast-food" size={16} color="#f7892c" />
                  <Text style={[styles.insightValue, { color: colors.text.primary, fontSize: 11 }]}>
                    {formatCurrency(insight.foodTotal)}
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.text.tertiary }]}>Food</Text>
                </View>
              </View>
            )}

            <View style={styles.searchRow}>
              <View style={[styles.searchBar, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search transactions"
                  placeholderTextColor={colors.text.tertiary}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
                contentContainerStyle={styles.filterContent}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !selectedCategory
                      ? styles.filterChipActive
                      : { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSelectedCategory('')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: !selectedCategory ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      selectedCategory === cat
                        ? styles.filterChipActive
                        : {
                            backgroundColor: colors.bg.tertiary,
                            borderColor: colors.border.subtle,
                          },
                    ]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  >
                    <Ionicons
                      name={getCategoryIcon(cat) as any}
                      size={14}
                      color={selectedCategory === cat ? '#FFF' : colors.text.secondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedCategory === cat ? '#FFF' : colors.text.secondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {transactions.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
                Transactions
              </Text>
            )}
          </View>
        }
        renderItem={({ item: section }) => (
          <View>
            <Text style={[styles.dateLabel, { color: colors.text.tertiary }]}>{section.title}</Text>
            {section.data.map((t: any) => {
              const isIncome = t.type === 'income';
              const catName = t.category?.name || t.category || 'Other';
              const timeStr = new Date(t.date || t.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.card, { backgroundColor: colors.bg.secondary }]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: t.id })}
                  onLongPress={() => handleDelete(t.id)}
                >
                  <LinearGradient
                    colors={isIncome ? ['#00B894', '#00CEC9'] : ['#FF6B6B', '#EE5A24']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardIcon}
                  >
                    <Ionicons name={getCategoryIcon(catName) as any} size={18} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.cardBody}>
                    <Text
                      style={[styles.cardDesc, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {t.description || catName}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>
                      {timeStr} · {catName}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: isIncome ? '#00B894' : '#FF6B6B' }]}>
                    {isIncome ? '+' : '-'}
                    {formatCurrency(Number(t.amount))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient colors={['#f7892c20', '#FF6B6B20']} style={styles.emptyIcon}>
              <Ionicons name="wallet-outline" size={44} color="#f7892c" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {search || selectedCategory ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              {search || selectedCategory
                ? 'Try a different search or filter'
                : 'Tap + to add your first transaction'}
            </Text>
            {!search && !selectedCategory && (
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('AddExpense')}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyCtaText}>Add Transaction</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <LinearGradient
        colors={['#f7892c', '#FF6B6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('AddExpense')}
          activeOpacity={0.85}
          style={styles.fabTouch}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeletonBlock: { borderRadius: 8 },
  skeletonCard: { marginHorizontal: 24, height: 160, borderRadius: 20, marginBottom: 12 },
  skeletonQa: { flex: 1, height: 72, borderRadius: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerGreeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceCard: { marginHorizontal: 24, borderRadius: 24, padding: 24, gap: 14, marginBottom: 16 },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceAmount: { fontSize: 34, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  balanceBar: { gap: 6 },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceBarText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  balanceBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 4,
  },
  balanceBarFill: { height: '100%', borderRadius: 2 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 16 },
  quickAction: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, gap: 8 },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600' },

  insightsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  insightCard: { flex: 1, padding: 12, borderRadius: 14, gap: 4, alignItems: 'center' },
  insightValue: { fontSize: 14, fontWeight: '700' },
  insightLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },

  searchRow: { paddingHorizontal: 24, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10 },

  filterRow: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 24, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: { backgroundColor: '#f7892c', borderColor: '#f7892c' },
  filterChipText: { fontSize: 13, fontWeight: '500' },

  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },

  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 3,
    padding: 14,
    borderRadius: 18,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardDesc: { fontSize: 15, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2, opacity: 0.6 },
  cardAmount: { fontSize: 17, fontWeight: '700', marginLeft: 8 },

  empty: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48, lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    elevation: 12,
    shadowColor: '#f7892c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  fabTouch: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
