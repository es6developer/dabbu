import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard } from '../../components/ui/AnimatedSkeleton';
import { Avatar } from '../../components/ui/Avatar';

const H_PADDING = 20;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CIRCLE_GRADIENTS: Record<string, [string, string]> = {
  friends: ['#6366F1', '#8B5CF6'],
  trip: ['#0EA5E9', '#06B6D4'],
  family: ['#F59E0B', '#F97316'],
  couple: ['#EC4899', '#F43F5E'],
  roommates: ['#14B8A6', '#10B981'],
  office: ['#3B82F6', '#2563EB'],
  event: ['#8B5CF6', '#A855F7'],
  apartment: ['#10B981', '#059669'],
  sports: ['#EF4444', '#DC2626'],
  default: ['#6366F1', '#8B5CF6'],
};

const CIRCLE_ICONS: Record<string, string> = {
  friends: 'people',
  trip: 'airplane',
  family: 'home',
  couple: 'heart',
  roommates: 'business',
  office: 'briefcase',
  event: 'calendar',
  apartment: 'building',
  sports: 'football',
  default: 'people',
};

function fmt(v: number) {
  if (v >= 10000000) {
    return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  }
  if (v >= 100000) {
    return '₹' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '₹' + (v / 1000).toFixed(1) + 'K';
  }
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function timeAgo(d: string) {
  if (!d) {
    return '';
  }
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) {
    return 'Good Morning';
  }
  if (h < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={stat.card}>
      <View style={[stat.iconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[stat.value, { color }]}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

function CircleCard({
  item,
  groupExpenses,
  navigation,
  colors,
  index,
  isDark,
}: {
  item: any;
  groupExpenses: Record<string, { total: number; count: number; latest: any }>;
  navigation: any;
  colors: any;
  index: number;
  isDark: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const cfg = CIRCLE_GRADIENTS[item.type] || CIRCLE_GRADIENTS.default;
  const icon = CIRCLE_ICONS[item.type] || CIRCLE_ICONS.default;
  const ed = groupExpenses[item.id] || { total: 0, count: 0, latest: null };
  const balance = ed.total;
  const isPositive = balance >= 0;
  const memberList: any[] = item.members || [];
  const members = memberList.length || item._count?.members || 0;
  const displayAvatars = Math.min(members, 4);
  const overflow = Math.max(members - 4, 0);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() =>
          navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name })
        }
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()
        }
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      >
        <Animated.View style={[card.outer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={card.inner}>
            <LinearGradient
              colors={cfg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={card.cover}
            >
              <View style={card.coverOverlay}>
                <View style={card.coverTop}>
                  <View style={card.typePill}>
                    <Ionicons name={icon as any} size={13} color="#FFF" />
                    <Text style={card.typeText}>{item.type || 'circle'}</Text>
                  </View>
                  {item.updatedAt && <Text style={card.timeText}>{timeAgo(item.updatedAt)}</Text>}
                </View>
                <Text style={card.coverName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={card.coverBottom}>
                  <View style={card.avatarCluster}>
                    {memberList.slice(0, displayAvatars).map((m: any, i: number) => {
                      const u = m.user || m;
                      return (
                        <View
                          key={u?.id || i}
                          style={[
                            card.avatarItem,
                            { marginLeft: i > 0 ? -10 : 0, zIndex: displayAvatars - i },
                          ]}
                        >
                          <Avatar
                            uri={u.avatarUrl}
                            name={`${u.firstName || ''} ${u.lastName || ''}`.trim()}
                            size={24}
                          />
                        </View>
                      );
                    })}
                    {overflow > 0 && (
                      <View style={[card.overflowBadge, { marginLeft: -10 }]}>
                        <Text style={card.overflowText}>+{overflow}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={card.memberCount}>
                    {members} member{members !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={[card.body, { backgroundColor: isDark ? '#121214' : '#FFF' }]}>
              <View style={card.statsRow}>
                <View style={card.statItem}>
                  <Text style={[card.statLabel, { color: colors.text.tertiary }]}>Total spent</Text>
                  <Text style={[card.statValue, { color: colors.text.primary }]}>
                    {fmt(ed.total)}
                  </Text>
                </View>
                <View style={card.statItem}>
                  <Text style={[card.statLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[card.statValue, { color: colors.text.primary }]}>{ed.count}</Text>
                </View>
                <View style={card.statItem}>
                  <Text style={[card.statLabel, { color: colors.text.tertiary }]}>Balance</Text>
                  <Text
                    style={[
                      card.statValue,
                      { color: isPositive ? colors.status.success : colors.status.error },
                    ]}
                  >
                    {balance === 0 ? '—' : `${isPositive ? '+' : '-'}${fmt(Math.abs(balance))}`}
                  </Text>
                </View>
              </View>

              <View style={[card.divider, { backgroundColor: colors.border.subtle }]} />

              <View style={card.actions}>
                <TouchableOpacity
                  style={[card.actionBtn, { backgroundColor: colors.accent.primary + '12' }]}
                  onPress={() =>
                    navigation.navigate('SharedExpenseForm', { groupId: item.id, edit: false })
                  }
                >
                  <Ionicons name="add-circle-outline" size={15} color={colors.accent.primary} />
                  <Text style={[card.actionText, { color: colors.accent.primary }]}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[card.actionBtn, { backgroundColor: colors.bg.tertiary }]}
                  onPress={() => navigation.navigate('Settlement', { groupId: item.id })}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={15}
                    color={colors.text.secondary}
                  />
                  <Text style={[card.actionText, { color: colors.text.secondary }]}>Settle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
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
      const hasCachedData = groups.length > 0;
      if (refresh) {
        setRefreshing(true);
      } else if (!hasCachedData) {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [grpResult] = await Promise.allSettled([
          api.get<any>('/expense-groups/dashboard', ctrl.signal),
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
        if (g.length > 0 || !hasCachedData) {
          setGroups(g);
        }

        const allTx: any[] = [];
        for (const grp of g) {
          if (grp.transactions?.length) {
            allTx.push(...grp.transactions);
          }
        }
        setTransactions(allTx);

        if (!hasCachedData) {
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
      } catch (e) {
        /* ignore */
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, fadeAnim, groups.length],
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

  const totalMembers = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((g) =>
      (g.members || []).forEach((m: any) => {
        if (m.userId) {
          ids.add(m.userId);
        }
      }),
    );
    return ids.size;
  }, [groups]);

  const totalBalance = useMemo(
    () => Object.values(groupExpenses).reduce((s, e) => s + e.total, 0),
    [groupExpenses],
  );

  const activeCount = useMemo(
    () =>
      groups.filter((g: any) => {
        const d = new Date(g.updatedAt || g.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    [groups],
  );

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

  const userName = groups[0]?.createdBy?.firstName || 'User';

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 12 }}>
          <Skeleton width={100} height={13} borderRadius={6} />
          <Skeleton width={160} height={24} style={{ marginTop: 4 }} borderRadius={6} />
        </View>
        <View style={{ marginTop: 20, paddingHorizontal: H_PADDING }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                width={(SCREEN_WIDTH - H_PADDING * 2 - 20) / 3}
                height={80}
                borderRadius={16}
              />
            ))}
          </View>
        </View>
        <View style={{ marginTop: 20, paddingHorizontal: H_PADDING, gap: 14 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={200} borderRadius={20} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          filtered.length === 0 ? s.emptyContainer : { paddingBottom: insets.bottom + 100 }
        }
      >
        {/* ─── Header ─── */}
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 12 }}>
          <Text style={[s.greeting, { color: colors.text.tertiary }]}>{getGreeting()}</Text>
          <View style={s.headerRow}>
            <Text style={[s.title, { color: colors.text.primary }]}>My Circles</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.accent.primary + '12' }]}
                onPress={() => navigation.navigate('Analytics')}
              >
                <Ionicons name="bar-chart-outline" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Stats Row ─── */}
        {groups.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 20 }}>
            <View style={s.statsRow}>
              <StatCard
                icon="people"
                value={String(totalMembers)}
                label="Members"
                color={colors.accent.primary}
              />
              <StatCard
                icon="layers"
                value={String(groups.length)}
                label="Circles"
                color={colors.status.success}
              />
              <StatCard
                icon="trending-up"
                value={String(activeCount)}
                label="Active"
                color={colors.status.warning}
              />
            </View>
          </View>
        )}

        {/* ─── Plan Info ─── */}
        {planInfo.tier === 'free' && groups.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 14 }}>
            <View
              style={[
                s.planBar,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <View style={s.planBarLeft}>
                <View style={[s.planBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      s.planBarFill,
                      {
                        width: `${(groups.length / planInfo.maxGroups) * 100}%`,
                        backgroundColor:
                          groups.length >= planInfo.maxGroups
                            ? colors.status.error
                            : colors.accent.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.planText, { color: colors.text.secondary }]}>
                  {groups.length} of {planInfo.maxGroups} circles
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
              >
                <Text style={[s.planUpgrade, { color: colors.accent.primary }]}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Empty state before first circle ─── */}
        {groups.length === 0 && !loading && (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: colors.accent.primary + '12' }]}>
              <Ionicons name="people-circle-outline" size={52} color={colors.accent.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No circles yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Create your first circle to split expenses with friends, family, or roommates
            </Text>
            <TouchableOpacity
              style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
              onPress={handleCreateGroup}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={s.emptyCtaText}>Create Circle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Search & Filter ─── */}
        {groups.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 20 }}>
            <View
              style={[
                s.searchBar,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
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
            <View style={s.filterRow}>
              {(['all', 'recent', 'active'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    s.filterChip,
                    { borderColor: colors.border.default },
                    sortBy === option && {
                      backgroundColor: colors.accent.primary,
                      borderColor: colors.accent.primary,
                    },
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
            <View style={s.circleCount}>
              <Text style={[s.circleCountText, { color: colors.text.secondary }]}>
                {filtered.length} {filtered.length === 1 ? 'circle' : 'circles'}
              </Text>
            </View>
          </View>
        )}

        {/* ─── Circle Cards ─── */}
        {filtered.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 4, gap: 16 }}>
            {filtered.map((item, i) => (
              <CircleCard
                key={item.id}
                item={item}
                groupExpenses={groupExpenses}
                navigation={navigation}
                colors={colors}
                index={i}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        {/* ─── No results search empty ─── */}
        {filtered.length === 0 && groups.length > 0 && (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: colors.accent.primary + '12' }]}>
              <Ionicons name="search-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No circles found</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Try a different search term
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  emptyContainer: { flexGrow: 1 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  planBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  planBarLeft: { flex: 1, gap: 6 },
  planBarOuter: { height: 4, borderRadius: 2, overflow: 'hidden' },
  planBarFill: { height: '100%', borderRadius: 2 },
  planText: { fontSize: 12, fontWeight: '500' },
  planUpgrade: { fontSize: 12, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  circleCount: { marginTop: 16, marginBottom: 4 },
  circleCountText: { fontSize: 13, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: H_PADDING },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

const stat = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
});

const card = StyleSheet.create({
  outer: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inner: { borderRadius: 20, overflow: 'hidden' },
  cover: { height: 130 },
  coverOverlay: { flex: 1, padding: 16, justifyContent: 'space-between' },
  coverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  typeText: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500' },
  coverName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  coverBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCluster: { flexDirection: 'row', alignItems: 'center' },
  avatarItem: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  overflowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  memberCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500' },
  body: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '500' },
  statValue: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1 },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
});
