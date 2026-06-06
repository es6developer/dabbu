import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard } from '../../components/ui/AnimatedSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function SharedCirclesScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const cardGradient = [colors.bg.secondary, colors.bg.tertiary];
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'all' | 'recent' | 'active'>('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [grpResult, txResult] = await Promise.allSettled([
          api.get<any>('/expense-groups', ctrl.signal),
          api.get<any>('/transactions', ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }
        const g =
          grpResult.status === 'fulfilled'
            ? Array.isArray(grpResult.value)
              ? grpResult.value
              : []
            : [];
        const txData =
          txResult.status === 'fulfilled'
            ? Array.isArray(txResult.value)
              ? txResult.value
              : []
            : [];
        setGroups(g);
        setTransactions(txData);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      } catch (e) {
        /* ignore */
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, fadeAnim],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

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
      list = list.filter(
        (g) =>
          g.name?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          String(g._count?.members || 0).includes(q),
      );
    }
    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'active') {
      list.sort((a, b) => (groupExpenses[b.id]?.count || 0) - (groupExpenses[a.id]?.count || 0));
    }
    return list;
  }, [groups, search, sortBy, groupExpenses]);

  function handleCreateGroup() {
    if (groups.length >= planInfo.maxGroups) {
      Alert.alert(
        'Plan Limit',
        `Free plan allows ${planInfo.maxGroups} circles. Upgrade for more.`,
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

  async function confirmDelete(id: string) {
    Alert.alert('Delete Circle', 'All circle data will be lost.', [
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
            setGroups((p) => p.filter((g) => g.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Skeleton width={100} height={14} />
            <Skeleton width={100} height={28} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={44} height={44} borderRadius={14} />
        </View>
        <Skeleton
          width="90%"
          height={44}
          borderRadius={12}
          style={{ marginHorizontal: 24, marginBottom: 12 }}
        />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 24, marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={groups.length === 0 ? s.emptyContainer : { paddingBottom: 100 }}
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
              <View>
                <Text style={[s.subtitle, { color: colors.text.tertiary }]}>Shared Circles</Text>
                <Text style={[s.title, { color: colors.text.primary }]}>Circles</Text>
              </View>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={[s.planBar, { backgroundColor: colors.bg.tertiary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={planInfo.tier === 'free' ? 'shield-outline' : 'shield-checkmark'}
                  size={16}
                  color={planInfo.tier === 'free' ? '#FF6B6B' : '#00B894'}
                />
                <Text style={[s.planText, { color: colors.text.secondary }]}>
                  {groups.length}/{planInfo.maxGroups} circles
                </Text>
              </View>
              {planInfo.tier === 'free' && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
                >
                  <Text style={[s.planAction, { color: colors.accent.primary }]}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.searchRow}>
              <View style={[s.searchBar, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search circles by name, description..."
                  placeholderTextColor={colors.text.tertiary}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={s.filterRow}>
              {(['all', 'recent', 'active'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    s.filterChip,
                    sortBy === option
                      ? s.filterChipActive
                      : { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => setSortBy(option)}
                >
                  <Text
                    style={[
                      s.filterText,
                      { color: sortBy === option ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {option === 'all' ? 'All' : option === 'recent' ? 'Recent' : 'Active'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        }
        renderItem={({ item }) => {
          const ed = groupExpenses[item.id] || { total: 0, count: 0, latest: null };
          const budgetLeft = item.monthlyBudget ? item.monthlyBudget - ed.total : null;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name })
              }
              style={s.cardOuter}
            >
              <LinearGradient
                colors={cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.card}
              >
                <View style={s.cardTop}>
                  <LinearGradient colors={[...colors.accent.gradient]} style={s.cardAvatar}>
                    <Ionicons
                      name={(GROUP_ICONS[item.icon] || 'people') as any}
                      size={22}
                      color="#FFF"
                    />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardName, { color: colors.text.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={[s.cardMeta, { color: colors.text.secondary }]}>
                        <Ionicons name="people-outline" size={11} color={colors.text.secondary} />{' '}
                        {item._count?.members || 0}
                      </Text>
                      {item.description ? (
                        <Text
                          style={[s.cardMeta, { color: colors.text.secondary }]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      s.deleteBtn,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                    ]}
                    onPress={() => confirmDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={s.statsRow}>
                  <View
                    style={[
                      s.stat,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    ]}
                  >
                    <Text
                      style={[
                        s.statLabel,
                        { color: isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary },
                      ]}
                    >
                      Total
                    </Text>
                    <Text style={[s.statVal, { color: colors.text.primary }]}>{fmt(ed.total)}</Text>
                  </View>
                  {budgetLeft !== null ? (
                    <View
                      style={[
                        s.stat,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      ]}
                    >
                      <Text
                        style={[
                          s.statLabel,
                          { color: isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary },
                        ]}
                      >
                        Budget Left
                      </Text>
                      <Text
                        style={[
                          s.statVal,
                          { color: budgetLeft >= 0 ? colors.status.success : colors.status.error },
                        ]}
                      >
                        {fmt(Math.abs(budgetLeft))}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        s.stat,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      ]}
                    >
                      <Text
                        style={[
                          s.statLabel,
                          { color: isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary },
                        ]}
                      >
                        Created
                      </Text>
                      <Text style={[s.statVal, { color: colors.text.primary, fontSize: 12 }]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      s.stat,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    ]}
                  >
                    <Text
                      style={[
                        s.statLabel,
                        { color: isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary },
                      ]}
                    >
                      Txns
                    </Text>
                    <Text style={[s.statVal, { color: colors.text.primary }]}>{ed.count}</Text>
                  </View>
                </View>
                {ed.latest && (
                  <View
                    style={[
                      s.latest,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                    ]}
                  >
                    <Ionicons name="flash-outline" size={14} color={colors.accent.primary} />
                    <Text style={[s.latestText, { color: colors.text.tertiary }]} numberOfLines={1}>
                      {ed.latest.description || 'Expense'} · {fmt(Number(ed.latest.amount))}
                    </Text>
                  </View>
                )}
                <View style={[s.cardFooter, { borderTopColor: colors.border.subtle }]}>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
              style={s.emptyIcon}
            >
              <Ionicons name="people" size={44} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              {search ? 'No circles found' : 'No circles yet'}
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {search ? 'Try a different search term' : 'Create your first expense circle'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={s.emptyCtaText}>Create Circle</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
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
  planText: { fontSize: 13, fontWeight: '500' },
  planAction: { fontSize: 13, fontWeight: '700' },
  searchRow: { paddingHorizontal: 24, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipActive: { backgroundColor: '#f7892c', borderColor: '#f7892c' },
  filterText: { fontSize: 12, fontWeight: '600' },
  cardOuter: { marginHorizontal: 24, marginBottom: 12 },
  card: { borderRadius: 20, padding: 18, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 12, padding: 10, gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 15, fontWeight: '700' },
  latest: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10 },
  latestText: { flex: 1, fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48 },
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
