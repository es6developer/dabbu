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
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
  { icon: 'people', label: 'Group', color: '#6C5CE7', screen: 'CreateExpenseGroup' },
  { icon: 'receipt', label: 'Bills', color: '#0984E3', screen: 'BillsList' },
];

export function TransactionsListScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [settlementStatus, setSettlementStatus] = useState<'all' | 'pending' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });

  const loadData = useCallback(async () => {
    try {
      const [txResult, statsResult, grpResult] = await Promise.allSettled([
        api.get<any>('/transactions'),
        api.get<any>('/transactions/stats'),
        api.get<any>('/expense-groups'),
      ]);
      const txRes = txResult.status === 'fulfilled' ? txResult.value : [];
      const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const grpRes = grpResult.status === 'fulfilled' ? grpResult.value : [];
      const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
      setTransactions(txData);
      if (statsRes?.summary) {
        setSummary({
          totalIncome: Number(statsRes.summary.totalIncome) || 0,
          totalExpense: Number(statsRes.summary.totalExpense) || 0,
        });
      }
      const g = Array.isArray(grpRes) ? grpRes : Array.isArray(grpRes?.data) ? grpRes.data : [];
      setGroups(g);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      loadData();
    }, [accessToken]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

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
    let list = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.category?.name || t.category || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q) ||
          (t.user?.firstName || '').toLowerCase().includes(q) ||
          (t.user?.email || '').toLowerCase().includes(q),
      );
    }
    if (selectedCategory) {
      list = list.filter((t) => (t.category?.name || t.category) === selectedCategory);
    }
    if (selectedGroupId) {
      list = list.filter((t) => t.expenseGroupId === selectedGroupId);
    }
    if (settlementStatus !== 'all') {
      list = list.filter((t) => (t.metadata?.settlementStatus || 'pending') === settlementStatus);
    }
    list.sort((a, b) => {
      if (sortBy === 'highest') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'lowest') return Number(a.amount || 0) - Number(b.amount || 0);
      const ad = new Date(a.date || a.createdAt).getTime();
      const bd = new Date(b.date || b.createdAt).getTime();
      return sortBy === 'oldest' ? ad - bd : bd - ad;
    });
    return groupByDate(list);
  }, [transactions, search, selectedCategory, selectedGroupId, settlementStatus, sortBy]);

  const remaining = summary.totalIncome - summary.totalExpense;
  const savingsPct =
    summary.totalIncome > 0 ? Math.round((remaining / summary.totalIncome) * 100) : 0;
  const expensePct =
    summary.totalIncome > 0 ? Math.round((summary.totalExpense / summary.totalIncome) * 100) : 0;

  const formatCurrency = (val: number) =>
    '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  function renderTransaction(item: any) {
    const isIncome = item.type === 'income';
    const categoryName = item.category?.name || item.category || 'Other';
    const date = new Date(item.date || item.createdAt);
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.bg.secondary }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
        onLongPress={() => handleDelete(item.id)}
      >
        <LinearGradient
          colors={isIncome ? ['#00B894', '#00CEC9'] : ['#FF6B6B', '#EE5A24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardIcon}
        >
          <Ionicons name={getCategoryIcon(categoryName) as any} size={18} color="#FFF" />
        </LinearGradient>
        <View style={styles.cardBody}>
          <Text style={[styles.cardDesc, { color: colors.text.primary }]} numberOfLines={1}>
            {item.description || categoryName}
          </Text>
          <Text style={[styles.cardDate, { color: colors.text.tertiary }]}>
          {timeStr} · {categoryName}
            {item.metadata?.settlementStatus === 'settled' ? ' · Settled' : ''}
          </Text>
        </View>
        <Text style={[styles.cardAmount, { color: isIncome ? '#00B894' : '#FF6B6B' }]}>
          {isIncome ? '+' : '-'}
          {formatCurrency(Number(item.amount))}
        </Text>
      </TouchableOpacity>
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
            : styles.listContent
        }
        ListHeaderComponent={
          <View>
            {/* ── HEADER ── */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={[styles.greeting, { color: colors.text.tertiary }]}>
                  {new Date().getHours() < 12
                    ? 'Good morning'
                    : new Date().getHours() < 18
                      ? 'Good afternoon'
                      : 'Good evening'}
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Dashboard</Text>
              </View>
              <TouchableOpacity
                style={[styles.avatar, { backgroundColor: `${colors.accent.primary}25` }]}
              >
                <Ionicons name="person" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>

            {/* ── BALANCE CARD ── */}
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(remaining)}</Text>
              <View style={styles.balanceBar}>
                <View style={[styles.balanceBarItem, { flex: expensePct || 1 }]}>
                  <View style={styles.balanceBarLabel}>
                    <View style={[styles.balanceDot, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={styles.balanceBarText}>Expense {expensePct}%</Text>
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
                <View style={[styles.balanceBarItem, { flex: 100 - expensePct || 1 }]}>
                  <View style={styles.balanceBarLabel}>
                    <View style={[styles.balanceDot, { backgroundColor: '#00B894' }]} />
                    <Text style={styles.balanceBarText}>Saved {100 - expensePct}%</Text>
                  </View>
                  <View style={styles.balanceBarTrack}>
                    <View
                      style={[
                        styles.balanceBarFill,
                        {
                          width: `${Math.min(100 - expensePct, 100)}%`,
                          backgroundColor: '#00B894',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.balanceRow}>
                <View style={styles.balanceRowItem}>
                  <Ionicons name="arrow-down" size={14} color="#00B894" />
                  <Text style={styles.balanceRowValue}>{formatCurrency(summary.totalIncome)}</Text>
                  <Text style={styles.balanceRowLabel}>Income</Text>
                </View>
                <View style={styles.balanceRowDivider} />
                <View style={styles.balanceRowItem}>
                  <Ionicons name="arrow-up" size={14} color="#FF6B6B" />
                  <Text style={styles.balanceRowValue}>{formatCurrency(summary.totalExpense)}</Text>
                  <Text style={styles.balanceRowLabel}>Expense</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── QUICK ACTIONS ── */}
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

            {/* ── GROUPS CAROUSEL ── */}
            {groups.length > 0 && (
              <View style={styles.groupsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeaderTitle, { color: colors.text.primary }]}>
                    Groups
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CreateExpenseGroup')}>
                    <Text style={[styles.sectionHeaderAction, { color: colors.accent.primary }]}>
                      See All
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupsScroll}
                >
                  {groups.map((g: any) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.groupCard, { backgroundColor: colors.bg.tertiary }]}
                      onPress={() =>
                        navigation.navigate('GroupExpenses', { groupId: g.id, groupName: g.name })
                      }
                      activeOpacity={0.7}
                    >
                      <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.groupAvatar}>
                        <Text style={styles.groupAvatarText}>
                          {(g.name || 'G')[0].toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <Text
                        style={[styles.groupName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {g.name}
                      </Text>
                      <Text style={[styles.groupMemberCount, { color: colors.text.tertiary }]}>
                        {g._count?.members || 0}{' '}
                        {(g._count?.members || 0) === 1 ? 'member' : 'members'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── SEARCH + FILTER ── */}
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
                      !selectedCategory
                        ? styles.filterChipTextActive
                        : { color: colors.text.secondary },
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              {(['newest', 'oldest', 'highest', 'lowest'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    sortBy === option
                      ? styles.filterChipActive
                      : { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSortBy(option)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: sortBy === option ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {option === 'newest'
                      ? 'Newest'
                      : option === 'oldest'
                        ? 'Oldest'
                        : option === 'highest'
                          ? 'Highest'
                          : 'Lowest'}
                  </Text>
                </TouchableOpacity>
              ))}
              {(['all', 'pending', 'settled'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    settlementStatus === status
                      ? styles.filterChipActive
                      : { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSettlementStatus(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: settlementStatus === status ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              {groups.map((group: any) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.filterChip,
                    selectedGroupId === group.id
                      ? styles.filterChipActive
                      : { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSelectedGroupId(selectedGroupId === group.id ? '' : group.id)}
                >
                  <Ionicons
                    name="people-outline"
                    size={14}
                    color={selectedGroupId === group.id ? '#FFF' : colors.text.secondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedGroupId === group.id ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text
              style={[
                styles.sectionHeaderTitle,
                {
                  color: colors.text.primary,
                  paddingHorizontal: 24,
                  paddingTop: 20,
                  paddingBottom: 12,
                },
              ]}
            >
              Recent Transactions
            </Text>
          </View>
        }
        renderItem={({ item: section }) => (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>
              {section.title}
            </Text>
            {section.data.map((t: any) => (
              <View key={t.id}>{renderTransaction(t)}</View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Ionicons name="wallet-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {search || selectedCategory ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              {search || selectedCategory
                ? 'Try a different search or filter'
                : 'Tap + to add your first transaction'}
            </Text>
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Balance Card ──
  balanceCard: { marginHorizontal: 24, borderRadius: 24, padding: 24, gap: 16, marginBottom: 20 },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  balanceBar: { gap: 8 },
  balanceBarItem: { gap: 4 },
  balanceBarLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceBarText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  balanceBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  balanceBarFill: { height: '100%', borderRadius: 2 },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
  },
  balanceRowItem: { flex: 1, alignItems: 'center', gap: 2 },
  balanceRowDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  balanceRowValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  balanceRowLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  // ── Quick Actions ──
  quickActions: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  quickAction: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, gap: 8 },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600' },

  // ── Groups ──
  groupsSection: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '700' },
  sectionHeaderAction: { fontSize: 13, fontWeight: '600' },
  groupsScroll: { paddingHorizontal: 24, gap: 12 },
  groupCard: { padding: 16, borderRadius: 20, width: 130, alignItems: 'center', gap: 8 },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  groupName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  groupMemberCount: { fontSize: 11, textAlign: 'center' },

  // ── Search ──
  searchRow: { paddingHorizontal: 24, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10 },

  // ── Filter Chips ──
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
  filterChipTextActive: { color: '#FFF' },

  // ── Section Labels ──
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },

  // ── Transaction Cards ──
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
  cardDate: { fontSize: 12, marginTop: 3, opacity: 0.6 },
  cardAmount: { fontSize: 17, fontWeight: '700', marginLeft: 8 },

  // ── Empty ──
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },

  // ── FAB ──
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
