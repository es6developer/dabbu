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
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { Avatar } from '../../components/ui/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../store/ToastContext';

const H_PADDING = 20;
const SCREEN_WIDTH = Dimensions.get('window').width;

const SPACE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; gradient: [string, string] }
> = {
  friends: { label: 'Friends', icon: 'people', gradient: ['#4F6EF7', '#7C8FF8'] },
  trip: { label: 'Trip', icon: 'airplane', gradient: ['#00B894', '#00D9A6'] },
  family: { label: 'Family', icon: 'home', gradient: ['#E85D04', '#FF8A3C'] },
  couple: { label: 'Couple', icon: 'heart', gradient: ['#FF6B9D', '#FF8FB3'] },
  roommates: { label: 'Roommates', icon: 'business', gradient: ['#14B8A6', '#14B8A6'] },
  office: { label: 'Office', icon: 'briefcase', gradient: ['#247BA0', '#4A9FC7'] },
  event: { label: 'Event', icon: 'calendar', gradient: ['#D64550', '#FF6B6B'] },
  apartment: { label: 'Apartment', icon: 'building', gradient: ['#14B8A6', '#14B8A6'] },
  sports: { label: 'Sports', icon: 'football', gradient: ['#FF6B6B', '#FF8E8E'] },
  default: { label: 'Group', icon: 'people', gradient: ['#4F6EF7', '#7C8FF8'] },
};

const FREE_MAX = 3;
const DEFAULT_PLAN = { tier: 'free' as const, maxGroups: FREE_MAX, maxMembersPerGroup: 10 };

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtCompact(v: number) {
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

function timeSince(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function deriveGroupBalance(group: any, currentUserId?: string) {
  const members = group.members || [];
  const expenses = group.expenses || [];
  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const share = members.length > 0 ? totalSpent / members.length : 0;
  let owedToMe = 0,
    iOwe = 0,
    anyUnsettled = false;

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

function MemberAvatars({
  members,
  max = 3,
}: {
  members: any[];
  max?: number;
  themeColor?: string;
}) {
  const { colors } = useTheme();
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  if (members.length === 0) {
    return null;
  }

  return (
    <View style={cs.avatarRow}>
      {visible.map((m: any, i: number) => {
        const u = m.user || m;
        return (
          <View
            key={m.userId || i}
            style={[cs.avatarWrap, { marginLeft: i > 0 ? -8 : 0, zIndex: max - i }]}
          >
            <Avatar
              uri={u.avatarUrl}
              name={`${u.firstName || ''} ${u.lastName || ''}`.trim()}
              size={28}
            />
          </View>
        );
      })}
      {remaining > 0 && (
        <View style={[cs.remainBadge, { marginLeft: -8, zIndex: 0 }]}>
          <Text style={cs.remainText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

function GroupCard({
  group,
  currentUserId,
  colors,
  onPress,
  onLongPress,
  onAddExpense,
  onSettleUp,
}: any) {
  const cfg = SPACE_TYPE_CONFIG[group.type] || SPACE_TYPE_CONFIG.default;
  const { owedToMe, iOwe, isSettled, totalSpent, memberCount } = deriveGroupBalance(
    group,
    currentUserId,
  );

  const lastActivity = group.lastActivity ? new Date(group.lastActivity) : null;
  const timeAgo = lastActivity ? timeSince(lastActivity) : null;

  const members = group.members || [];

  const balanceText =
    owedToMe > 0
      ? `You are owed ${fmtCompact(owedToMe)}`
      : iOwe > 0
        ? `You owe ${fmtCompact(iOwe)}`
        : null;

  const balanceColor =
    owedToMe > 0 ? colors.status.success : iOwe > 0 ? colors.status.error : colors.text.tertiary;

  const settlementText = isSettled
    ? totalSpent > 0
      ? 'Settled'
      : null
    : owedToMe > 0
      ? 'Awaiting you'
      : iOwe > 0
        ? 'Pending from you'
        : null;

  const settlementColor = isSettled
    ? colors.status.success
    : owedToMe > 0
      ? colors.status.warning
      : colors.status.error;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[gCard.outer, { borderColor: colors.border.default }]}
    >
      <View style={[gCard.card, { backgroundColor: colors.bg.card }]}>
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={gCard.cover}
        >
          <View style={[gCard.coverOverlay, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
            <View style={gCard.coverTop}>
              <View style={[gCard.coverIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={cfg.icon as any} size={18} color="#FFF" />
              </View>
              <View style={[gCard.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={gCard.typeBadgeText}>{cfg.label}</Text>
              </View>
            </View>
            <Text style={gCard.coverName} numberOfLines={1}>
              {group.name}
            </Text>
            {timeAgo && <Text style={gCard.coverTime}>{timeAgo}</Text>}
          </View>
        </LinearGradient>

        <View style={gCard.body}>
          <View style={gCard.memberRow}>
            <MemberAvatars members={members} max={3} />
            <Text style={[gCard.memberCount, { color: colors.text.tertiary }]}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={[gCard.dividerLine, { backgroundColor: colors.border.subtle }]} />

          <View style={gCard.balanceSection}>
            {totalSpent === 0 ? (
              <Text style={[gCard.emptyText, { color: colors.text.tertiary }]}>
                No activity yet
              </Text>
            ) : (
              <>
                <Text style={[gCard.balanceLabel, { color: balanceColor }]}>{balanceText}</Text>
                {settlementText && (
                  <View style={gCard.settlementRow}>
                    <View style={[gCard.settlementDot, { backgroundColor: settlementColor }]} />
                    <Text style={[gCard.settlementText, { color: settlementColor }]}>
                      {settlementText}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={gCard.actionRow}>
            <TouchableOpacity
              style={[gCard.actionBtn, { backgroundColor: colors.accent.primary }]}
              activeOpacity={0.8}
              onPress={onAddExpense}
            >
              <Ionicons name="add-circle-outline" size={14} color={colors.text.inverse} />
              <Text style={[gCard.actionBtnText, { color: colors.text.inverse }]}>Add expense</Text>
            </TouchableOpacity>
            {totalSpent > 0 && !isSettled && (
              <TouchableOpacity
                style={[gCard.settleBtn, { borderColor: colors.accent.primary }]}
                activeOpacity={0.8}
                onPress={onSettleUp}
              >
                <Ionicons name="swap-horizontal" size={14} color={colors.accent.primary} />
                <Text style={[gCard.settleBtnText, { color: colors.accent.primary }]}>
                  Settle up
                </Text>
              </TouchableOpacity>
            )}
            <View style={gCard.spentBadge}>
              <Text style={[gCard.spentLabel, { color: colors.text.tertiary }]}>Spent</Text>
              <Text style={[gCard.spentValue, { color: colors.text.primary }]}>
                {fmtCompact(totalSpent)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function SharedFinanceHomeScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('friends');
  const [saving, setSaving] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (accessToken) {
        setAccessToken(accessToken);
      }
      warmupBackend().catch(() => {});
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const settleTimer = setTimeout(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }, 3000);
      try {
        const [groupsRes] = await Promise.allSettled([
          api.get<any>('/shared-finance/groups', ctrl.signal),
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
        setGroups(groupsData);
      } catch {
        if (!ctrl.signal.aborted) {
          setGroups([]);
        }
      } finally {
        clearTimeout(settleTimer);
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
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const financialSummary = useMemo(
    () => computeFinancialSummary(groups, user?.id),
    [groups, user?.id],
  );

  const planInfo = useMemo(() => groups[0]?._plan || DEFAULT_PLAN, [groups]);
  const maxSpaces = planInfo.maxGroups;

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

  async function handleDeleteSpace(group: any) {
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
            showToast('Space deleted');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete space');
          }
        },
      },
    ]);
  }

  async function handleCreateSpace() {
    if (!newName.trim()) {
      Alert.alert('Required', 'Space name is required');
      return;
    }
    if (groups.length >= maxSpaces) {
      Alert.alert(
        planInfo.tier === 'free' ? 'Upgrade Required' : 'Limit Reached',
        planInfo.tier === 'free'
          ? `Free plan allows ${maxSpaces} spaces. Upgrade to Premium for unlimited spaces.`
          : `You've used all ${maxSpaces} spaces.`,
      );
      return;
    }
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/shared-finance/groups', {
        name: newName.trim(),
        type: newType.toLowerCase(),
        currency: 'INR',
      });
      showToast('Space created');
      const newGroupId = res?.id || res?._id;
      setShowCreateModal(false);
      setNewName('');
      setNewType('friends');
      if (newGroupId) {
        navigation.navigate('SharedGroupDetail', {
          groupId: newGroupId,
          groupName: newName.trim(),
        });
      } else {
        loadData(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create space');
    } finally {
      setSaving(false);
    }
  }

  const userName = user?.firstName || user?.email?.[0]?.toUpperCase() || 'U';

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <GroupCard
        group={item}
        currentUserId={user?.id}
        colors={colors}
        onPress={() =>
          navigation.navigate('SharedGroupDetail', { groupId: item.id, groupName: item.name })
        }
        onLongPress={() => handleDeleteSpace(item)}
        onAddExpense={() =>
          navigation.navigate('SharedExpenseForm', { groupId: item.id, edit: false })
        }
        onSettleUp={() => navigation.navigate('Settlement', { groupId: item.id })}
      />
    ),
    [user?.id, colors, navigation, handleDeleteSpace],
  );

  if (loading) {
    return (
      <BaseScreen noPadding>
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 8 }}>
          <Skeleton width={120} height={14} borderRadius={6} />
          <Skeleton width={160} height={24} style={{ marginTop: 4 }} borderRadius={6} />
        </View>
        <View style={{ marginTop: 24, gap: 16, paddingHorizontal: H_PADDING }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={220} borderRadius={20} />
          ))}
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen noPadding>
      <FlatList
        data={groups}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        windowSize={10}
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
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 120,
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: H_PADDING }}>
            <View style={hdr.header}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Profile')}
                style={hdr.profileRow}
              >
                <Avatar
                  uri={user?.avatarUrl}
                  name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                  size={40}
                />
                <View>
                  <Text style={[hdr.greeting, { color: colors.text.tertiary }]}>Welcome back</Text>
                  <Text style={[hdr.userName, { color: colors.text.primary }]} numberOfLines={1}>
                    {userName}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={hdr.headerRight}>
                <TouchableOpacity
                  style={[hdr.iconBtn, { backgroundColor: colors.accent.primary + '12' }]}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <Ionicons name="settings-outline" size={20} color={colors.accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[hdr.iconBtn, { backgroundColor: colors.status.warning + '15' }]}
                  onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
                >
                  <Ionicons name="diamond-outline" size={18} color={colors.status.warning} />
                </TouchableOpacity>
              </View>
            </View>

            {groups.length > 0 && (
              <View style={hdr.statsBar}>
                <View style={hdr.statItem}>
                  <Text style={[hdr.statValue, { color: colors.text.primary }]}>
                    {financialSummary.activeGroups}
                  </Text>
                  <Text style={[hdr.statLabel, { color: colors.text.tertiary }]}>Spaces</Text>
                </View>
                <View style={[hdr.statDivider, { backgroundColor: colors.border.default }]} />
                <View style={hdr.statItem}>
                  <Text style={[hdr.statValue, { color: colors.text.primary }]}>
                    {totalMembers}
                  </Text>
                  <Text style={[hdr.statLabel, { color: colors.text.tertiary }]}>Members</Text>
                </View>
                <View style={[hdr.statDivider, { backgroundColor: colors.border.default }]} />
                <View style={hdr.statItem}>
                  <Text
                    style={[
                      hdr.statValue,
                      {
                        color:
                          financialSummary.totalOwedToMe >= financialSummary.totalIOwe
                            ? colors.status.success
                            : colors.status.error,
                      },
                    ]}
                  >
                    {financialSummary.totalOwedToMe >= financialSummary.totalIOwe
                      ? fmtCompact(financialSummary.totalOwedToMe - financialSummary.totalIOwe)
                      : fmtCompact(financialSummary.totalIOwe - financialSummary.totalOwedToMe)}
                  </Text>
                  <Text style={[hdr.statLabel, { color: colors.text.tertiary }]}>
                    {financialSummary.totalOwedToMe >= financialSummary.totalIOwe ? 'Owed' : 'Owe'}
                  </Text>
                </View>
              </View>
            )}

            <View style={hdr.sectionTitleRow}>
              <Text style={[hdr.sectionTitle, { color: colors.text.primary }]}>Your Spaces</Text>
              {financialSummary.pendingSettlements > 0 && (
                <View style={[hdr.pendingBadge, { backgroundColor: colors.status.warning + '15' }]}>
                  <Text style={[hdr.pendingBadgeText, { color: colors.status.warning }]}>
                    {financialSummary.pendingSettlements} pending
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={cs.emptyWrap}>
            <View style={[cs.emptyIconWrap, { backgroundColor: colors.accent.primary + '12' }]}>
              <Ionicons name="grid-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[cs.emptyTitle, { color: colors.text.primary }]}>No spaces yet</Text>
            <Text style={[cs.emptyDesc, { color: colors.text.tertiary }]}>
              Create a space to split expenses with your people
            </Text>
            <TouchableOpacity
              style={[cs.emptyCta, { backgroundColor: colors.accent.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={cs.emptyCtaText}>Create Space</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          groups.length > 0 ? (
            <View style={{ paddingHorizontal: H_PADDING, marginTop: 8 }}>
              <View
                style={[
                  flim.card,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                ]}
              >
                <View style={flim.row}>
                  <View style={flim.left}>
                    <View style={[flim.barOuter, { backgroundColor: colors.bg.tertiary }]}>
                      <View
                        style={[
                          flim.barFill,
                          {
                            width: `${Math.min((groups.length / maxSpaces) * 100, 100)}%`,
                            backgroundColor:
                              groups.length >= maxSpaces - 1
                                ? colors.status.warning
                                : colors.accent.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[flim.text, { color: colors.text.secondary }]}>
                      {groups.length} of {maxSpaces} spaces used
                    </Text>
                  </View>
                  {planInfo.tier === 'free' && groups.length >= maxSpaces && (
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          'Upgrade',
                          "You've reached the free limit. Upgrade to Premium for unlimited spaces.",
                        )
                      }
                    >
                      <Text style={[flim.upgradeText, { color: colors.accent.primary }]}>
                        Upgrade
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {groups.length > 0 && (
        <TouchableOpacity
          style={[fab.btn, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 24 }]}
          activeOpacity={0.85}
          onPress={() => {
            if (groups.length >= maxSpaces) {
              Alert.alert(
                planInfo.tier === 'free' ? 'Upgrade Required' : 'Limit Reached',
                planInfo.tier === 'free'
                  ? `Free plan allows ${maxSpaces} spaces. Upgrade to Premium for unlimited spaces.`
                  : `You've used all ${maxSpaces} spaces.`,
              );
            } else {
              setShowCreateModal(true);
            }
          }}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={fab.label}>New Space</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[mod.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              mod.sheet,
              {
                backgroundColor: colors.bg.primary,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              },
            ]}
          >
            <View style={mod.handle} />
            <Text style={[mod.title, { color: colors.text.primary }]}>New Space</Text>

            <View style={mod.field}>
              <Text style={[mod.label, { color: colors.text.tertiary }]}>Space Name</Text>
              <TextInput
                style={[
                  mod.input,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Goa Trip 2025"
                placeholderTextColor={colors.text.tertiary}
                autoFocus
              />
            </View>

            <View style={mod.field}>
              <Text style={[mod.label, { color: colors.text.tertiary }]}>Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={mod.typeRow}
              >
                {Object.entries(SPACE_TYPE_CONFIG)
                  .filter(([k]) => k !== 'default')
                  .map(([key, cfg]) => {
                    const active = newType === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          mod.typeChip,
                          {
                            borderColor: active ? cfg.gradient[0] : colors.border.default,
                            backgroundColor: active ? `${cfg.gradient[0]}1A` : colors.bg.card,
                          },
                        ]}
                        onPress={() => setNewType(key)}
                      >
                        <Ionicons
                          name={cfg.icon as any}
                          size={16}
                          color={active ? cfg.gradient[0] : colors.text.tertiary}
                        />
                        <Text
                          style={[
                            mod.typeChipText,
                            { color: active ? cfg.gradient[0] : colors.text.secondary },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>

            <View style={mod.field}>
              <Text style={[mod.label, { color: colors.text.tertiary }]}>Invite Members</Text>
              <TextInput
                style={[
                  mod.input,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="Enter phone numbers (optional)"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={mod.actionRow}>
              <TouchableOpacity
                style={[mod.cancelBtn, { borderColor: colors.border.default }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewName('');
                  setNewType('friends');
                }}
              >
                <Text style={[mod.cancelBtnText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mod.submitBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateSpace}
                disabled={saving}
              >
                {saving ? (
                  <Text style={mod.submitBtnText}>Creating...</Text>
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={mod.submitBtnText}>Create</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </BaseScreen>
  );
}

const hdr = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    maxWidth: 160,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

const gCard = StyleSheet.create({
  outer: {
    marginHorizontal: H_PADDING,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  card: { borderRadius: 20, overflow: 'hidden' },
  cover: { height: 110 },
  coverOverlay: { flex: 1, padding: 18, justifyContent: 'flex-end' },
  coverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
  },
  coverIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  coverName: { fontSize: 19, fontWeight: '800', color: '#FFF' },
  coverTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { padding: 16, gap: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberCount: { fontSize: 12, fontWeight: '500' },
  dividerLine: { height: 1 },
  balanceSection: { gap: 4 },
  balanceLabel: { fontSize: 15, fontWeight: '700' },
  settlementRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  settlementDot: { width: 6, height: 6, borderRadius: 3 },
  settlementText: { fontSize: 12, fontWeight: '500' },
  emptyText: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  settleBtnText: { fontSize: 12, fontWeight: '700' },
  spentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spentLabel: { fontSize: 11, fontWeight: '500' },
  spentValue: { fontSize: 14, fontWeight: '700' },
});

const cs = StyleSheet.create({
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  remainBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  remainText: { color: '#8E8E93', fontSize: 10, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: H_PADDING },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
    marginTop: 8,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

const flim = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  left: { flex: 1, gap: 6 },
  barOuter: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '500' },
  upgradeText: { fontSize: 13, fontWeight: '700' },
});

const fab = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  label: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

const mod = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  typeRow: { gap: 8, paddingVertical: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
