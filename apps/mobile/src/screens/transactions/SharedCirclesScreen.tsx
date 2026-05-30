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
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

const GROUP_ICONS: Record<string, string> = {
  users: 'people',
  home: 'home',
  heart: 'heart',
  star: 'star',
  briefcase: 'briefcase',
  cart: 'cart',
  airplane: 'airplane',
  restaurant: 'restaurant',
  car: 'car',
  fitness: 'fitness',
};

function formatCurrency(val: number) {
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function SharedCirclesScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'all' | 'recent' | 'active'>('all');

  const loadData = useCallback(async () => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const [grpRes, txRes] = await Promise.all([
        api.get<any>('/expense-groups'),
        api.get<any>('/transactions'),
      ]);
      const g = Array.isArray(grpRes) ? grpRes : Array.isArray(grpRes?.data) ? grpRes.data : [];
      setGroups(g);
      const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
      setTransactions(txData);
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

  const planInfo = groups[0]?._plan || { tier: 'free', maxGroups: 5, maxMembersPerGroup: 2 };

  const groupExpenses = useMemo(() => {
    const map: Record<string, { total: number; count: number; latest: any }> = {};
    for (const tx of transactions) {
      const gid = tx.expenseGroupId;
      if (!gid) {
        continue;
      }
      if (!map[gid]) {
        map[gid] = { total: 0, count: 0, latest: null };
      }
      map[gid].total += Number(tx.amount);
      map[gid].count += 1;
      if (!map[gid].latest || new Date(tx.date) > new Date(map[gid].latest.date)) {
        map[gid].latest = tx;
      }
    }
    return map;
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...groups];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.name?.toLowerCase().includes(q));
    }
    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'active') {
      list.sort((a, b) => (groupExpenses[b.id]?.count || 0) - (groupExpenses[a.id]?.count || 0));
    }
    return list;
  }, [groups, search, sortBy, groupExpenses]);

  function handleCreateGroup() {
    const currentCount = groups.length;
    if (currentCount >= planInfo.maxGroups) {
      Alert.alert(
        'Plan Limit Reached',
        `Free plan allows up to ${planInfo.maxGroups} groups. Upgrade to Premium for up to 30 groups or Gold for unlimited.`,
        [
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('Settings', { screen: 'Subscription' }),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    navigation.navigate('CreateExpenseGroup');
  }

  function renderGroupCard({ item }: { item: any }) {
    const expenseData = groupExpenses[item.id] || { total: 0, count: 0, latest: null };
    const iconName = GROUP_ICONS[item.icon] || 'people';
    const budgetRemaining = item.monthlyBudget ? item.monthlyBudget - expenseData.total : null;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name })
        }
        onLongPress={() => {
          Alert.alert(item.name, '', [
            {
              text: 'View Details',
              onPress: () =>
                navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name }),
            },
            { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item.id) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.groupCard}
        >
          <View style={styles.groupCardTop}>
            <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.groupCardAvatar}>
              <Ionicons name={iconName as any} size={22} color="#FFF" />
            </LinearGradient>
            <View style={styles.groupCardInfo}>
              <Text style={styles.groupCardName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.groupCardMembers}>
                <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.5)" />{' '}
                {item._count?.members || 0} member{(item._count?.members || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </View>

          <View style={styles.groupCardStats}>
            <View style={styles.groupCardStat}>
              <Text style={styles.groupCardStatLabel}>Total Expense</Text>
              <Text style={styles.groupCardStatValue}>{formatCurrency(expenseData.total)}</Text>
            </View>
            {budgetRemaining !== null && (
              <View style={styles.groupCardStat}>
                <Text style={styles.groupCardStatLabel}>Budget Left</Text>
                <Text
                  style={[
                    styles.groupCardStatValue,
                    { color: budgetRemaining >= 0 ? '#00B894' : '#FF6B6B' },
                  ]}
                >
                  {formatCurrency(Math.abs(budgetRemaining))}
                </Text>
              </View>
            )}
            <View style={styles.groupCardStat}>
              <Text style={styles.groupCardStatLabel}>Transactions</Text>
              <Text style={styles.groupCardStatValue}>{expenseData.count}</Text>
            </View>
          </View>

          {expenseData.latest && (
            <View style={styles.groupCardLatest}>
              <Text style={styles.groupCardLatestLabel}>Latest</Text>
              <Text style={styles.groupCardLatestText} numberOfLines={1}>
                {expenseData.latest.description || 'Expense'} ·{' '}
                {formatCurrency(Number(expenseData.latest.amount))}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  async function confirmDelete(id: string) {
    Alert.alert('Delete Group', 'All group data will be lost. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/expense-groups/${id}`);
            setGroups((prev) => prev.filter((g) => g.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.loadingHeader, { paddingTop: insets.top + 16 }]}>
          <View
            style={[
              styles.skeletonBlock,
              { width: 140, height: 28, backgroundColor: colors.bg.tertiary },
            ]}
          />
          <View
            style={[
              styles.skeletonBlock,
              { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg.tertiary },
            ]}
          />
        </View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.bg.tertiary }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={[styles.headerGreeting, { color: colors.text.tertiary }]}>
                  Shared Circles
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Groups</Text>
              </View>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={[styles.planBar, { backgroundColor: colors.bg.tertiary }]}>
              <View style={styles.planBarLeft}>
                <Ionicons
                  name={
                    planInfo.tier === 'free'
                      ? 'shield-outline'
                      : planInfo.tier === 'gold'
                        ? 'shield-checkmark'
                        : 'shield-half-outline'
                  }
                  size={16}
                  color={planInfo.tier === 'free' ? '#FF6B6B' : '#00B894'}
                />
                <Text style={[styles.planBarText, { color: colors.text.secondary }]}>
                  {groups.length} / {planInfo.maxGroups} groups used
                </Text>
              </View>
              {planInfo.tier === 'free' && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
                >
                  <Text style={[styles.planBarAction, { color: colors.accent.primary }]}>
                    Upgrade
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.searchRow}>
              <View style={[styles.searchBar, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search groups"
                  placeholderTextColor={colors.text.tertiary}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.filterRow}>
              {(['all', 'recent', 'active'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterChip,
                    sortBy === s
                      ? styles.filterChipActive
                      : { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSortBy(s)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: sortBy === s ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={renderGroupCard}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient colors={['#6C5CE720', '#A29BFE20']} style={styles.emptyIcon}>
              <Ionicons name="people" size={44} color="#6C5CE7" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {search ? 'No groups found' : 'No groups yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              {search
                ? 'Try a different search'
                : 'Create your first circle to track expenses together'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyCtaText}>Create Group</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  skeletonBlock: { borderRadius: 8 },
  skeletonCard: { marginHorizontal: 24, height: 160, borderRadius: 20, marginBottom: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerGreeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  planBar: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  planBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planBarText: { fontSize: 13, fontWeight: '500' },
  planBarAction: { fontSize: 13, fontWeight: '700' },

  searchRow: { paddingHorizontal: 24, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipActive: { backgroundColor: '#f7892c', borderColor: '#f7892c' },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  groupCard: { marginHorizontal: 24, marginBottom: 12, borderRadius: 20, padding: 18, gap: 14 },
  groupCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCardInfo: { flex: 1 },
  groupCardName: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  groupCardMembers: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  groupCardStats: { flexDirection: 'row', gap: 12 },
  groupCardStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  groupCardStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCardStatValue: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  groupCardLatest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 10,
  },
  groupCardLatestLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCardLatestText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

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
    marginTop: 8,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
