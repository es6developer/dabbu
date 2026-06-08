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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard } from '../../components/ui/AnimatedSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BILL_CARD_W = 165;

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

function BillCarouselCard({
  item,
  colors,
  navigation,
}: {
  item: any;
  colors: any;
  navigation: any;
}) {
  return (
    <View
      style={[
        s.billCard,
        { backgroundColor: colors.bg.card, borderColor: 'rgba(255,255,255,0.05)' },
      ]}
    >
      <View style={s.billCardBody}>
        <View style={s.billIconWrap}>
          <Ionicons name="receipt-outline" size={20} color={colors.accent.primary} />
        </View>
        <Text style={[s.billVendor, { color: colors.text.primary }]} numberOfLines={1}>
          {item.description || 'Expense'}
        </Text>
        <Text style={[s.billDate, { color: colors.text.secondary }]}>
          {timeAgo(item.date || item.createdAt)}
        </Text>
        <Text style={[s.billAmount, { color: colors.text.primary }]}>
          {fmt(Number(item.amount))}
        </Text>
      </View>
    </View>
  );
}

function GroupCard({ item, groupExpenses, navigation, colors }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const ed = groupExpenses[item.id] || { total: 0, count: 0, latest: null };
  const balance = ed.total;
  const isPositive = balance >= 0;
  const memberList: any[] = item.members || [];
  const members = memberList.length || item._count?.members || 0;
  const displayAvatars = Math.min(members, 3);
  const overflow = Math.max(members - 3, 0);
  const getInitial = (m: any) => {
    const u = m.user || m;
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).trim() || '?';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() =>
        navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name })
      }
      onPressIn={() => {
        Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }}
    >
      <Animated.View
        style={[
          s.groupCard,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.subtle,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={s.groupInner}>
          <View style={s.groupLeft}>
            <Text style={[s.groupName, { color: colors.text.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={s.memberBadge}>
              <Ionicons name="people-outline" size={12} color={colors.text.secondary} />
              <Text style={[s.memberCountText, { color: colors.text.secondary }]}>
                {members} members
              </Text>
            </View>
          </View>

          <View style={s.avatarCluster}>
            {Array.from({ length: displayAvatars }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.avatarCircle,
                  {
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.bg.card,
                    marginLeft: i === 0 ? 0 : -8,
                    zIndex: displayAvatars - i,
                  },
                ]}
              >
                <Text style={[s.avatarLetter, { color: colors.text.secondary }]}>
                  {memberList[i] ? getInitial(memberList[i]) : '?'}
                </Text>
              </View>
            ))}
            <View
              style={[
                s.avatarCircle,
                s.overflowBadge,
                {
                  backgroundColor: colors.brand.light,
                  borderColor: colors.bg.card,
                  marginLeft: -8,
                },
              ]}
            >
              {overflow > 0 ? (
                <Text style={[s.overflowText, { color: colors.accent.primary }]}>+{overflow}</Text>
              ) : (
                <Ionicons name="add" size={14} color={colors.accent.primary} />
              )}
            </View>
          </View>

          <View style={s.groupRight}>
            <Text style={[s.balanceText, { color: isPositive ? '#27D376' : '#FF4545' }]}>
              {isPositive ? '+' : '-'}
              {fmt(Math.abs(balance))}
            </Text>
            {ed.latest && (
              <Text style={[s.recentLabel, { color: colors.text.secondary }]}>
                Recent: {timeAgo(ed.latest.date || ed.latest.createdAt)}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
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

  const recentBills = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime(),
      )
      .slice(0, 8);
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={filtered.length === 0 ? s.emptyContainer : { paddingBottom: 140 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ─── Header ─── */}
          <View style={[s.header, { paddingTop: insets.top + 8 }]}>
            <View>
              <Text style={[s.subtitle, { color: colors.text.secondary }]}>Expense Groups</Text>
              <Text style={[s.title, { color: colors.text.primary }]}>Circles</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[
                  s.iconBtn,
                  {
                    backgroundColor: colors.bg.secondary,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => navigation.navigate('Analytics')}
              >
                <Ionicons name="bar-chart" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Plan Pill ─── */}
          {planInfo.tier === 'free' && (
            <View
              style={[
                s.planPill,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
              ]}
            >
              <Ionicons name="shield-outline" size={14} color={colors.text.secondary} />
              <Text style={[s.planText, { color: colors.text.secondary }]}>
                {groups.length}/{planInfo.maxGroups} groups
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
              >
                <Text style={[s.planAction, { color: colors.accent.primary }]}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Recent Active Bills Carousel ─── */}
          {recentBills.length > 0 && (
            <View style={s.sectionBlock}>
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
                  Recent Active Bills
                </Text>
                <TouchableOpacity>
                  <Text style={[s.seeAllText, { color: colors.accent.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.carouselContent}
                decelerationRate="fast"
                snapToInterval={BILL_CARD_W + 12}
              >
                {recentBills.map((bill, i) => (
                  <BillCarouselCard
                    key={bill.id || i}
                    item={bill}
                    colors={colors}
                    navigation={navigation}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ─── Search & Filter ─── */}
          <View style={s.searchRow}>
            <View
              style={[
                s.searchBar,
                {
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border.default,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
              <TextInput
                style={[s.searchInput, { color: colors.text.primary }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search circles..."
                placeholderTextColor={colors.text.secondary}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
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

          {/* ─── All Circles Section ─── */}
          {filtered.length > 0 && (
            <View style={s.sectionBlock}>
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: colors.text.primary }]}>All Circles</Text>
                <Text style={[s.groupCount, { color: colors.text.secondary }]}>
                  {filtered.length} {filtered.length === 1 ? 'circle' : 'circles'}
                </Text>
              </View>
            </View>
          )}

          {filtered.map((item) => (
            <GroupCard
              key={item.id}
              item={item}
              groupExpenses={groupExpenses}
              navigation={navigation}
              colors={colors}
            />
          ))}

          {/* ─── Empty State ─── */}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="people" size={44} color={colors.accent.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
                {search ? 'No circles found' : 'No circles yet'}
              </Text>
              <Text style={[s.emptyDesc, { color: colors.text.secondary }]}>
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
          )}
        </Animated.View>
      </ScrollView>
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
    paddingBottom: 4,
  },
  subtitle: { fontSize: 12, fontWeight: '500', marginBottom: 2, letterSpacing: 0.3 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPill: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  planText: { fontSize: 12, fontWeight: '500', flex: 1 },
  planAction: { fontSize: 12, fontWeight: '700' },

  /* ─── Section ─── */
  sectionBlock: { marginTop: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  groupCount: { fontSize: 13, fontWeight: '500' },

  /* ─── Bill Carousel ─── */
  carouselContent: { paddingHorizontal: 20, gap: 12 },
  billCard: {
    width: BILL_CARD_W,
    height: 150,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  billCardBody: { gap: 4 },
  billIconWrap: { marginBottom: 6 },
  billVendor: { fontSize: 14, fontWeight: '700' },
  billDate: { fontSize: 11, fontWeight: '400' },
  billAmount: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  splitBtn: {
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitBtnText: { fontSize: 11, fontWeight: '700' },

  /* ─── Search & Filter ─── */
  searchRow: { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' },

  /* ─── Group Cards ─── */
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 96,
    padding: 16,
  },
  groupInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLeft: {
    flex: 1,
    marginRight: 12,
  },
  groupName: { fontSize: 16, fontWeight: '600' },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  memberCountText: { fontSize: 12, fontWeight: '400' },

  /* ─── Avatar Cluster ─── */
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarLetter: { fontSize: 11, fontWeight: '600' },
  overflowBadge: { borderWidth: 1.5 },
  overflowText: { fontSize: 10, fontWeight: '700' },

  /* ─── Financial Status ─── */
  groupRight: { alignItems: 'flex-end' },
  balanceText: { fontSize: 16, fontWeight: '800' },
  recentLabel: { fontSize: 11, fontWeight: '400', marginTop: 2 },

  /* ─── Empty State ─── */
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
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
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
