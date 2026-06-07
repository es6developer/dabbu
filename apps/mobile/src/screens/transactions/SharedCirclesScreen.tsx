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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
const GROUP_COLORS: Record<string, string[]> = {
  users: ['#6C5CE7', '#A29BFE'],
  home: ['#0984E3', '#74B9FF'],
  heart: ['#FF6B6B', '#FF9F9F'],
  star: ['#FDCB6E', '#FFEAA7'],
  briefcase: ['#00B894', '#55EFC4'],
  cart: ['#E17055', '#FAB1A0'],
  airplane: ['#4A90D9', '#74B9FF'],
  restaurant: ['#F7892C', '#F9A44A'],
  car: ['#636E72', '#B2BEC3'],
  fitness: ['#00CEC9', '#81ECEC'],
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

function getGroupColors(icon: string) {
  return GROUP_COLORS[icon] || ['#F7892C', '#F9A44A'];
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
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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
        (g) => g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q),
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
            <Skeleton width={140} height={28} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={44} height={44} borderRadius={14} />
        </View>
        <Skeleton
          width="90%"
          height={44}
          borderRadius={12}
          style={{ marginHorizontal: 20, marginBottom: 12 }}
        />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 12 }} />
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
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: colors.bg.secondary }]}
                  onPress={() => navigation.navigate('Analytics')}
                >
                  <Ionicons name="bar-chart" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={s.addBtnPrimary} onPress={handleCreateGroup}>
                  <LinearGradient
                    colors={[...colors.accent.gradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.addBtnGrad}
                  >
                    <Ionicons name="add" size={22} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.planBar, { backgroundColor: colors.bg.secondary }]}>
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
              <View style={[s.searchBar, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search circles..."
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
                      : { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
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
          const colors2 = getGroupColors(item.icon);
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name })
              }
              style={s.cardOuter}
            >
              <LinearGradient
                colors={[`${colors2[0]}18`, `${colors2[1]}08`, colors.bg.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.card}
              >
                <View style={s.cardTop}>
                  <LinearGradient
                    colors={colors2}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.cardAvatar}
                  >
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    ]}
                    onPress={() => confirmDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
                <View style={s.statsRow}>
                  <LinearGradient
                    colors={[`${colors2[0]}15`, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.stat}
                  >
                    <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Total</Text>
                    <Text style={[s.statVal, { color: colors.text.primary }]}>{fmt(ed.total)}</Text>
                  </LinearGradient>
                  {budgetLeft !== null ? (
                    <LinearGradient
                      colors={[`${colors2[0]}15`, 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.stat}
                    >
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>
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
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={[`${colors2[0]}15`, 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.stat}
                    >
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Created</Text>
                      <Text style={[s.statVal, { color: colors.text.primary, fontSize: 12 }]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={[`${colors2[0]}15`, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.stat}
                  >
                    <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Txns</Text>
                    <Text style={[s.statVal, { color: colors.text.primary }]}>{ed.count}</Text>
                  </LinearGradient>
                </View>
                {ed.latest && (
                  <View
                    style={[
                      s.latest,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                    ]}
                  >
                    <Ionicons name="flash-outline" size={14} color={colors.accent.primary} />
                    <Text style={[s.latestText, { color: colors.text.tertiary }]} numberOfLines={1}>
                      {ed.latest.description || 'Expense'} · {fmt(Number(ed.latest.amount))}
                    </Text>
                  </View>
                )}
                <View style={[s.cardFooter, { borderTopColor: colors.border.subtle }]}>
                  <Text style={[s.viewText, { color: colors.accent.primary }]}>View Details</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient colors={['#F7892C20', '#FF6B6B18']} style={s.emptyIcon}>
              <Ionicons name="people" size={44} color="#F7892C" />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              {search ? 'No circles found' : 'No circles yet'}
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {search ? 'Try a different search term' : 'Create your first expense circle'}
            </Text>
            {!search && (
              <TouchableOpacity style={s.emptyCta} onPress={handleCreateGroup}>
                <LinearGradient
                  colors={[...colors.accent.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.emptyCtaGrad}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={s.emptyCtaText}>Create Circle</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subtitle: { fontSize: 12, fontWeight: '500', marginBottom: 2, letterSpacing: 0.3 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPrimary: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  planBar: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  planText: { fontSize: 13, fontWeight: '500' },
  planAction: { fontSize: 13, fontWeight: '700' },
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  filterChipActive: { backgroundColor: '#F7892C', borderColor: '#F7892C' },
  filterText: { fontSize: 12, fontWeight: '600' },
  cardOuter: { marginHorizontal: 16, marginBottom: 12 },
  card: { borderRadius: 24, padding: 20, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
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
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 14, padding: 12, gap: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 15, fontWeight: '700' },
  latest: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, padding: 10 },
  latestText: { flex: 1, fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  viewText: { fontSize: 12, fontWeight: '600' },
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
  emptyCta: { marginTop: 4 },
  emptyCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
