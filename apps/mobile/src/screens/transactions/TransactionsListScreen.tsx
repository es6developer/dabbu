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
  Alert,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategoryIcon } from '../../config/categoryIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchAnim = useRef(new Animated.Value(48)).current;
  const [searchExpanded, setSearchExpanded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchExpanded((prev) => !prev);
    Animated.timing(searchAnim, {
      toValue: searchExpanded ? 48 : 120,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [searchExpanded]);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
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
    list.sort((a, b) => {
      if (sortBy === 'highest') {return Number(b.amount || 0) - Number(a.amount || 0);}
      if (sortBy === 'lowest') {return Number(a.amount || 0) - Number(b.amount || 0);}
      const ad = new Date(a.date || a.createdAt).getTime();
      const bd = new Date(b.date || b.createdAt).getTime();
      return sortBy === 'oldest' ? ad - bd : bd - ad;
    });
    return groupByDate(list);
  }, [transactions, search, selectedCategory, selectedGroupId, sortBy]);

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
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.bg.secondary}
          />
        }
        contentContainerStyle={
          transactions.length === 0 && !search && !selectedCategory
            ? styles.emptyContainer
            : styles.listContent
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <LinearGradient
              colors={
                isDark
                  ? ['#0A0A0F', '#12121A']
                  : ['#1a1a2e', '#16213e']
              }
              style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
            >
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.greetingLabel}>
                    {new Date().getHours() < 12
                      ? 'Good morning'
                      : new Date().getHours() < 18
                        ? 'Good afternoon'
                        : 'Good evening'}
                  </Text>
                  <Text style={styles.greetingName}>Dashboard</Text>
                </View>
                <TouchableOpacity
                  style={[styles.headerAvatarRing, { borderColor: colors.accent.primary }]}
                  onPress={() => navigation.navigate('AddExpense')}
                >
                  <LinearGradient
                    colors={[...colors.accent.gradient]}
                    style={styles.headerAvatar}
                  >
                    <Ionicons name="add" size={24} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <LinearGradient
              colors={
                isDark
                  ? ['#1a1a2e', '#16213e', '#0f3460']
                  : ['#1a1a2e', '#16213e', '#0f3460']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(remaining)}</Text>
              <View style={styles.balanceBar}>
                <View style={styles.balanceBarItem}>
                  <View style={styles.balanceBarLabel}>
                    <View style={[styles.balanceDot, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={styles.balanceBarText}>Expense {expensePct}%</Text>
                  </View>
                  <View style={styles.balanceBarTrack}>
                    <View style={[styles.balanceBarFill, { width: `${Math.min(expensePct, 100)}%`, backgroundColor: '#FF6B6B' }]} />
                  </View>
                </View>
                <View style={styles.balanceBarItem}>
                  <View style={styles.balanceBarLabel}>
                    <View style={[styles.balanceDot, { backgroundColor: '#00B894' }]} />
                    <Text style={styles.balanceBarText}>Saved {savingsPct}%</Text>
                  </View>
                  <View style={styles.balanceBarTrack}>
                    <View style={[styles.balanceBarFill, { width: `${Math.min(savingsPct, 100)}%`, backgroundColor: '#00B894' }]} />
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

            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.quickAction, { backgroundColor: colors.bg.glass, borderColor: colors.border.subtle }]}
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
                      <LinearGradient colors={[...colors.accent.gradient]} style={styles.groupAvatar}>
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

            <View style={styles.searchRow}>
              <Animated.View style={[styles.searchBar, { backgroundColor: colors.bg.tertiary, width: searchAnim }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                {searchExpanded && (
                  <TextInput
                    style={[styles.searchInput, { color: colors.text.primary }]}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search transactions"
                    placeholderTextColor={colors.text.tertiary}
                    autoFocus
                  />
                )}
                {search ? (
                  <TouchableOpacity onPress={() => { setSearch(''); toggleSearch(); }}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={toggleSearch}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </Animated.View>
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
                        ? styles.filterChipActiveGradient
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
                      ? styles.filterChipActiveGradient
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
              {groups.map((group: any) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.filterChip,
                    selectedGroupId === group.id
                      ? styles.filterChipActiveGradient
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
          </Animated.View>
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
            <LinearGradient
              colors={[...colors.accent.gradient]}
              style={styles.emptyIconWrap}
            >
              <Ionicons name="wallet-outline" size={44} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Track your spending
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Add your first expense to see where your money goes. Every transaction helps you understand your financial habits better.
            </Text>
            {!search && !selectedCategory && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('AddExpense')}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyBtnText}>Add Transaction</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },
  emptyContainer: { flexGrow: 1 },

  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceCard: {
    marginHorizontal: 24,
    borderRadius: 28,
    padding: 24,
    gap: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceAmount: { fontSize: 38, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  balanceBar: { gap: 10 },
  balanceBarItem: { gap: 6 },
  balanceBarLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceBarText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  balanceBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
  balanceBarFill: { height: '100%', borderRadius: 3 },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
  },
  balanceRowItem: { flex: 1, alignItems: 'center', gap: 2 },
  balanceRowDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  balanceRowValue: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  balanceRowLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  quickActions: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600' },

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
  groupCard: { padding: 16, borderRadius: 22, width: 130, alignItems: 'center', gap: 10 },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  groupName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  groupMemberCount: { fontSize: 11, textAlign: 'center' },

  searchRow: { paddingHorizontal: 24, marginBottom: 8, alignItems: 'flex-end' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 48,
    alignSelf: 'flex-end',
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
  filterChipActiveGradient: { backgroundColor: '#f7892c', borderColor: '#f7892c' },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF' },

  sectionLabel: {
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
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardDesc: { fontSize: 15, fontWeight: '600' },
  cardDate: { fontSize: 12, marginTop: 3, opacity: 0.6 },
  cardAmount: { fontSize: 17, fontWeight: '700', marginLeft: 8 },

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
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
