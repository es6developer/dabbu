import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchSection } from '../../components/ui/SearchSection';
import { FilterSection } from '../../components/ui/FilterSection';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const H_PADDING = 16;

const SPACE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; gradient: [string, string] }
> = {
  friends: { label: 'Friends', icon: 'people', gradient: ['#4F6EF7', '#7C8FF8'] },
  trip: { label: 'Trip', icon: 'airplane', gradient: ['#00B894', '#00D9A6'] },
  family: { label: 'Family', icon: 'home', gradient: ['#E85D04', '#FF8A3C'] },
  couple: { label: 'Couple', icon: 'heart', gradient: ['#FF6B9D', '#FF8FB3'] },
  roommates: { label: 'Roommates', icon: 'business', gradient: ['#F3D28F', '#F5DBA0'] },
  office: { label: 'Office', icon: 'briefcase', gradient: ['#247BA0', '#4A9FC7'] },
  event: { label: 'Event', icon: 'calendar', gradient: ['#D64550', '#FF6B6B'] },
  apartment: { label: 'Apartment', icon: 'building', gradient: ['#F3D28F', '#F5DBA0'] },
  default: { label: 'Group', icon: 'people', gradient: ['#4F6EF7', '#7C8FF8'] },
};

const GROUP_TYPES = [
  { key: 'all', label: 'All' },
  ...Object.entries(SPACE_TYPE_CONFIG)
    .filter(([k]) => k !== 'default')
    .map(([k, v]) => ({ key: k, label: v.label })),
];

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtCompact(v: number) {
  if (v >= 100000) {
    return '₹' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '₹' + (v / 1000).toFixed(1) + 'K';
  }
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function deriveGroupBalance(group: any, currentUserId?: string) {
  const members = group.members || [];
  const expenses = group.expenses || [];
  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const share = members.length > 0 ? totalSpent / members.length : 0;
  let owedToMe = 0,
    iOwe = 0;

  let anyUnsettled = false;

  members.forEach((m: any) => {
    let bal: number;
    if (m.balance !== undefined) {
      bal = Number(m.balance);
    } else {
      const paid = expenses
        .filter((e: any) => e.paidBy === m.userId)
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      bal = paid - share;
    }
    if (m.userId === currentUserId) {
      if (bal < 0) {
        iOwe += Math.abs(bal);
      } else {
        owedToMe += bal;
      }
    }
    if (Math.abs(bal) > 0.99) {
      anyUnsettled = true;
    }
  });

  const netUnsettled = owedToMe + iOwe;
  return {
    owedToMe,
    iOwe,
    isSettled: !anyUnsettled,
    unsettledRatio: totalSpent > 0 ? Math.min(netUnsettled / totalSpent, 1) : 0,
    totalSpent,
    memberCount: group._count?.members || group.members?.length || 0,
    txnCount: group._count?.expenses || group.expenseCount || 0,
  };
}

function computeFinancialSummary(groups: any[], currentUserId?: string) {
  let totalOwedToMe = 0,
    totalIOwe = 0,
    pendingSettlements = 0;
  groups.forEach((g) => {
    const { owedToMe, iOwe, isSettled } = deriveGroupBalance(g, currentUserId);
    totalOwedToMe += owedToMe;
    totalIOwe += iOwe;
    if (!isSettled) {
      pendingSettlements++;
    }
  });
  return { totalOwedToMe, totalIOwe, pendingSettlements, activeGroups: groups.length };
}

function NetBadge({ net, colors, typography }: any) {
  const isPositive = net >= 0;
  const bg = isPositive ? colors.status.success + '15' : colors.status.error + '15';
  const fg = isPositive ? colors.status.success : colors.status.error;
  const icon = isPositive ? 'trending-up' : 'trending-down';
  return (
    <View style={[sCard.netBadge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={fg} />
      <Text style={[typography.caption, { color: fg, fontWeight: '700' }]}>
        {isPositive ? '+' : ''}
        {fmtCompact(Math.abs(net))}
      </Text>
    </View>
  );
}

function SummaryCard({ summary, anim, colors, typography }: any) {
  const net = summary.totalOwedToMe - summary.totalIOwe;
  return (
    <Animated.View
      style={[
        sCard.wrap,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
    >
      <View style={[sCard.card, { borderColor: colors.border.subtle }]}>
        <View style={sCard.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[sCard.iconWrap, { backgroundColor: colors.accent.primary + '22' }]}>
              <Ionicons name="wallet-outline" size={16} color={colors.accent.primary} />
            </View>
            <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
              Financial Summary
            </Text>
          </View>
          <View style={[sCard.badge, { backgroundColor: colors.accent.primary + '20' }]}>
            <Text
              style={[typography.caption2, { color: colors.accent.primary, fontWeight: '700' }]}
            >
              {summary.activeGroups} active
            </Text>
          </View>
        </View>

        <View style={sCard.metricsRow}>
          <View style={sCard.metric}>
            <Text style={[typography.caption1, { color: colors.text.tertiary }]}>You're owed</Text>
            <Text style={[typography.expenseAmount, { color: colors.status.success }]}>
              {fmtCompact(summary.totalOwedToMe)}
            </Text>
          </View>
          <View style={[sCard.divider, { backgroundColor: colors.border.subtle }]} />
          <View style={sCard.metric}>
            <Text style={[typography.caption1, { color: colors.text.tertiary }]}>You owe</Text>
            <Text style={[typography.expenseAmount, { color: colors.status.error }]}>
              {fmtCompact(summary.totalIOwe)}
            </Text>
          </View>
          <View style={[sCard.divider, { backgroundColor: colors.border.subtle }]} />
          <View style={sCard.metric}>
            <Text style={[typography.caption1, { color: colors.text.tertiary }]}>Net</Text>
            <Text
              style={[
                typography.expenseAmount,
                { color: net >= 0 ? colors.status.success : colors.status.error },
              ]}
            >
              {net >= 0 ? '' : '-'}
              {fmtCompact(Math.abs(net))}
            </Text>
          </View>
        </View>

        <View style={[sCard.netRow, { borderTopColor: colors.border.subtle }]}>
          <NetBadge net={net} colors={colors} typography={typography} />
          {summary.pendingSettlements > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="swap-horizontal" size={13} color={colors.status.warning} />
              <Text
                style={[typography.caption, { color: colors.status.warning, fontWeight: '500' }]}
              >
                {summary.pendingSettlements} pending
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function GroupCard({ group, currentUserId, colors, typography, anim, onPress, onLongPress }: any) {
  const cfg = SPACE_TYPE_CONFIG[group.type] || SPACE_TYPE_CONFIG.default;
  const { owedToMe, iOwe, isSettled, unsettledRatio, totalSpent, memberCount, txnCount } =
    deriveGroupBalance(group, currentUserId);

  const barColor =
    unsettledRatio < 0.3
      ? colors.status.success
      : unsettledRatio < 0.7
        ? colors.status.warning
        : colors.status.error;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[gCard.outer, { borderColor: colors.border.subtle }]}
      >
        <View style={[gCard.card, { backgroundColor: colors.bg.card }]}>
          <View style={gCard.cover}>
            <View style={gCard.coverOverlay}>
              <View style={gCard.coverMeta}>
                <View style={gCard.coverIcon}>
                  <Ionicons name={cfg.icon as any} size={18} color="#FFF" />
                </View>
                <View style={gCard.typeBadge}>
                  <Text style={gCard.typeBadgeText}>{cfg.label}</Text>
                </View>
              </View>
              <Text style={gCard.coverName} numberOfLines={1}>
                {group.name}
              </Text>
              {group.description ? (
                <Text style={gCard.coverDesc} numberOfLines={1}>
                  {group.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={gCard.body}>
            {totalSpent === 0 ? (
              <View style={gCard.balanceRow}>
                <View style={[gCard.balanceChip, { backgroundColor: colors.text.tertiary + '12' }]}>
                  <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                  <Text
                    style={[typography.caption, { color: colors.text.tertiary, fontWeight: '500' }]}
                  >
                    No activity yet
                  </Text>
                </View>
              </View>
            ) : !isSettled ? (
              <View style={gCard.balanceRow}>
                {owedToMe > 0 && (
                  <View
                    style={[gCard.balanceChip, { backgroundColor: colors.status.success + '12' }]}
                  >
                    <Ionicons name="arrow-down" size={12} color={colors.status.success} />
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.status.success, fontWeight: '600' },
                      ]}
                    >
                      Owed {fmtCompact(owedToMe)}
                    </Text>
                  </View>
                )}
                {iOwe > 0 && (
                  <View
                    style={[gCard.balanceChip, { backgroundColor: colors.status.error + '12' }]}
                  >
                    <Ionicons name="arrow-up" size={12} color={colors.status.error} />
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.status.error, fontWeight: '600' },
                      ]}
                    >
                      Owe {fmtCompact(iOwe)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={gCard.balanceRow}>
                <View
                  style={[gCard.balanceChip, { backgroundColor: colors.status.success + '12' }]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={12}
                    color={colors.status.success}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.status.success, fontWeight: '600' },
                    ]}
                  >
                    All settled
                  </Text>
                </View>
              </View>
            )}

            <View style={[gCard.statsRow, { borderTopColor: colors.border.subtle }]}>
              <View style={gCard.stat}>
                <Text style={[typography.caption2, { color: colors.text.tertiary }]}>Spent</Text>
                <Text style={[typography.subheadBold, { color: colors.text.primary }]}>
                  {fmtCompact(totalSpent)}
                </Text>
              </View>
              <View style={gCard.stat}>
                <Text style={[typography.caption2, { color: colors.text.tertiary }]}>Members</Text>
                <Text style={[typography.subheadBold, { color: colors.text.primary }]}>
                  {memberCount}
                </Text>
              </View>
              <View style={gCard.stat}>
                <Text style={[typography.caption2, { color: colors.text.tertiary }]}>Txns</Text>
                <Text style={[typography.subheadBold, { color: colors.text.primary }]}>
                  {txnCount}
                </Text>
              </View>
            </View>

            {totalSpent > 0 && (
              <View style={gCard.barOuter}>
                <View
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    },
                  ]}
                >
                  <Text style={[typography.caption2, { color: colors.text.tertiary }]}>
                    {isSettled
                      ? 'Fully settled'
                      : unsettledRatio < 0.5
                        ? 'Nearly settled'
                        : 'Needs attention'}
                  </Text>
                  <Text style={[typography.caption2, { color: barColor, fontWeight: '600' }]}>
                    {Math.round(unsettledRatio * 100)}% unsettled
                  </Text>
                </View>
                <View style={[gCard.barTrack, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      gCard.barFill,
                      { width: `${Math.max(unsettledRatio * 100, 2)}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SharedFinanceHomeScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Record<string, Animated.Value>>({});
  const abortRef = useRef<AbortController | null>(null);
  const hasAnimated = useRef(false);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });

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
        const [groupsRes, goalsRes] = await Promise.allSettled([
          api.get<any>('/shared-finance/groups', ctrl.signal),
          api.get<any>('/goals', ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }
        const groupsData =
          groupsRes.status === 'fulfilled'
            ? Array.isArray(groupsRes.value)
              ? groupsRes.value
              : Array.isArray(groupsRes.value?.data)
                ? groupsRes.value.data
                : []
            : [];
        const goalsData =
          goalsRes.status === 'fulfilled'
            ? Array.isArray(goalsRes.value?.data)
              ? goalsRes.value.data
              : Array.isArray(goalsRes.value)
                ? goalsRes.value
                : []
            : [];
        setGroups(groupsData);
        setGoals(goalsData);
        const currentIds = new Set(groupsData.map((g: any) => g.id));
        Object.keys(cardAnims.current).forEach((id) => {
          if (!currentIds.has(id)) {
            delete cardAnims.current[id];
          }
        });
        groupsData.forEach((g: any, i: number) => {
          if (!cardAnims.current[g.id]) {
            const v = new Animated.Value(0);
            cardAnims.current[g.id] = v;
            Animated.spring(v, {
              toValue: 1,
              tension: 50,
              friction: 11,
              delay: i * 60,
              useNativeDriver: true,
            }).start();
          }
        });
        if (!hasAnimated.current) {
          hasAnimated.current = true;
          headerAnim.setValue(0);
          Animated.spring(headerAnim, {
            toValue: 1,
            tension: 70,
            friction: 12,
            useNativeDriver: true,
          }).start();
        } else {
          headerAnim.setValue(1);
        }
      } catch (e: any) {
        if (!ctrl.signal.aborted && e.message !== 'Session expired. Please login again.') {
          setGroups([]);
          setGoals([]);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, headerAnim],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const financialSummary = useMemo(
    () => computeFinancialSummary(groups, user?.id),
    [groups, user?.id],
  );

  const filtered = useMemo(() => {
    let list = [...groups];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) => g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter((g) => g.type === typeFilter);
    }
    return list;
  }, [groups, search, typeFilter]);

  async function handleDelete(group: any) {
    Alert.alert('Delete Space', `Delete "${group.name}"? All shared data will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/shared-finance/groups/${group.id}`);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete space');
          }
        },
      },
    ]);
  }

  const goalTotal = useMemo(() => {
    let saved = 0,
      target = 0;
    goals.forEach((g) => {
      saved += Number(g.saved || g.currentAmount || 0);
      target += Number(g.target || g.targetAmount || 0);
    });
    return { saved, target, pct: target > 0 ? Math.min((saved / target) * 100, 100) : 0 };
  }, [goals]);

  const typeFilterOptions = GROUP_TYPES.map((g) => ({ key: g.key, label: g.label }));

  if (loading) {
    return (
      <BaseScreen noPadding>
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: 4 }}>
          <Skeleton width={90} height={12} borderRadius={6} />
          <Skeleton width={170} height={26} style={{ marginTop: 4 }} borderRadius={6} />
        </View>
        <View style={{ marginHorizontal: H_PADDING, marginTop: 16 }}>
          <Skeleton width="100%" height={134} borderRadius={16} />
        </View>
        <View style={{ marginHorizontal: H_PADDING, marginTop: 16 }}>
          <Skeleton width="100%" height={76} borderRadius={16} />
        </View>
        <View style={{ marginHorizontal: H_PADDING, marginTop: 12 }}>
          <Skeleton width="100%" height={44} borderRadius={8} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: H_PADDING, marginTop: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={56 + i * 10} height={34} borderRadius={17} />
          ))}
        </View>
        <View style={{ marginTop: 24, gap: 16, paddingHorizontal: H_PADDING }}>
          <Skeleton width="100%" height={212} borderRadius={16} />
          <Skeleton width="100%" height={212} borderRadius={16} />
          <Skeleton width="100%" height={212} borderRadius={16} />
        </View>
      </BaseScreen>
    );
  }

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <GroupCard
        group={item}
        currentUserId={user?.id}
        colors={colors}
        typography={typography}
        anim={cardAnims.current[item.id] ?? new Animated.Value(1)}
        onPress={() =>
          navigation.navigate('SharedGroupDetail', { groupId: item.id, groupName: item.name })
        }
        onLongPress={() => handleDelete(item)}
      />
    ),
    [user?.id, colors, typography, navigation, handleDelete],
  );

  return (
    <BaseScreen noPadding>
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          filtered.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 100 }
        }
        ListHeaderComponent={
          <Animated.View
            style={{
              opacity: Animated.multiply(headerAnim, headerOpacity),
              transform: [
                {
                  translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                },
              ],
              paddingHorizontal: H_PADDING,
            }}
          >
            <View style={{ paddingTop: 4 }}>
              <Text
                style={[
                  typography.caption2,
                  {
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 2,
                  },
                ]}
              >
                Shared Finance
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={[typography.sectionHeader, { color: colors.text.primary, flex: 1 }]}>
                  Your Spaces
                </Text>
                <TouchableOpacity
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.accent.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => navigation.navigate('CreateSharedGroup')}
                >
                  <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <SummaryCard
              summary={financialSummary}
              anim={headerAnim}
              colors={colors}
              typography={typography}
            />

            <UpgradeBanner message="Unlimited groups, members & premium features" />

            {goals.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Dashboard',
                    params: { screen: 'GoalsList' },
                  })
                }
                style={{ marginBottom: 16 }}
              >
                <View
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: colors.accent.primary + '22',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="trophy-outline" size={16} color={colors.accent.primary} />
                      </View>
                      <Text style={[typography.cardTitle, { color: colors.text.primary }]}>
                        Goal Progress
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                  </View>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}
                  >
                    <View
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: colors.bg.tertiary,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${goalTotal.pct}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: colors.accent.primary,
                        }}
                      />
                    </View>
                    <Text style={[typography.calloutBold, { color: colors.accent.primary }]}>
                      {Math.round(goalTotal.pct)}%
                    </Text>
                  </View>
                  <View
                    style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}
                  >
                    <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                      <Text style={{ color: colors.status.success }}>{fmt(goalTotal.saved)}</Text>{' '}
                      saved of {fmt(goalTotal.target)}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.text.tertiary, fontWeight: '600' },
                      ]}
                    >
                      {goals.length} goal{goals.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <SearchSection
              value={search}
              onChangeText={setSearch}
              placeholder="Search spaces..."
              onClear={() => setSearch('')}
            />
            <FilterSection
              options={typeFilterOptions}
              selected={typeFilter}
              onSelect={setTypeFilter}
            />
            <View style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 8 }} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                {filtered.length > 0
                  ? `${filtered.length} group${filtered.length > 1 ? 's' : ''}`
                  : 'Groups'}
              </Text>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                {financialSummary.activeGroups - filtered.length > 0
                  ? `${financialSummary.activeGroups - filtered.length} filtered out`
                  : ''}
              </Text>
            </View>
          </Animated.View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 32 }}>
            <EmptyState
              icon="grid-outline"
              title={search || typeFilter !== 'all' ? 'No spaces found' : 'No spaces yet'}
              message={
                search || typeFilter !== 'all'
                  ? 'Try a different search or filter'
                  : 'Create a space to split expenses with your people'
              }
              actionLabel={!search && typeFilter === 'all' ? 'Create Space' : undefined}
              onAction={
                !search && typeFilter === 'all'
                  ? () => navigation.navigate('CreateSharedGroup')
                  : undefined
              }
            />
          </View>
        }
      />
    </BaseScreen>
  );
}

const sCard = StyleSheet.create({
  wrap: { marginBottom: 16, marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 16 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  metric: { flex: 1, gap: 3, alignItems: 'center' },
  divider: { width: 1, height: 40, marginHorizontal: 8 },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});

const gCard = StyleSheet.create({
  outer: {
    marginHorizontal: H_PADDING,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  card: { borderRadius: 16, overflow: 'hidden' },
  cover: { height: 100 },
  coverOverlay: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  coverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
  },
  coverIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  coverName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  coverDesc: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  body: { padding: 14, gap: 10 },
  balanceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statsRow: { flexDirection: 'row', gap: 12, paddingTop: 10, borderTopWidth: 1 },
  stat: { flex: 1, gap: 1 },
  barOuter: { marginTop: 2 },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});
