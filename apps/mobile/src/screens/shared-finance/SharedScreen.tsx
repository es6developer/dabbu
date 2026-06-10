import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { Avatar } from '../../components/ui/Avatar';

const H_PADDING = 20;
const MAX_SPACES = 3;

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

function fmtCompact(v: number) {
  if (v >= 10000000) {
    return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  }
  if (v >= 100000) {
    return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  }
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function timeSince(dateStr: string): string {
  if (!dateStr) {
    return '';
  }
  const diff = Date.now() - new Date(dateStr).getTime();
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
  return `${Math.floor(days / 7)}w ago`;
}

function listFromResponse(res: any): any[] {
  if (!res) {
    return [];
  }
  if (Array.isArray(res)) {
    return res;
  }
  if (res.items) {
    return Array.isArray(res.items) ? res.items : [];
  }
  return [];
}

function deriveGroupBalance(
  group: any,
  currentUserId: string | undefined,
  userBalance?: number,
  balanceArray?: any[],
) {
  const memberCount = group.members?.length || group._count?.members || 0;
  const hasExpenses = (group._count?.expenses || 0) > 0;
  const totalSpent = group.totalSpent ?? 0;

  let owedToMe = 0,
    iOwe = 0,
    unsettledOthers = 0;

  if (userBalance !== undefined) {
    if (userBalance > 0) {
      owedToMe = userBalance;
    } else if (userBalance < 0) {
      iOwe = Math.abs(userBalance);
    }
  }

  if (balanceArray && currentUserId) {
    const currentEntry = balanceArray.find((b: any) => b.userId === currentUserId);
    if (currentEntry) {
      const bal = Number(currentEntry.balance);
      if (bal > 0) {
        owedToMe = bal;
      } else if (bal < 0) {
        iOwe = Math.abs(bal);
      }
    }
    unsettledOthers = balanceArray.filter(
      (b: any) => b.userId !== currentUserId && Math.abs(Number(b.balance)) > 0.99,
    ).length;
  }

  const isSettled = !hasExpenses || (unsettledOthers === 0 && owedToMe === 0 && iOwe === 0);
  const hasMembers = memberCount > 0;

  return { owedToMe, iOwe, isSettled, totalSpent, memberCount, unsettledOthers, hasMembers };
}

function MemberAvatars({ members, themeColor }: { members: any[]; themeColor: string }) {
  const { colors } = useTheme();
  const max = 5;
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  if (members.length === 0) {
    return null;
  }

  return (
    <View style={cs.avatarRow}>
      {visible.map((m, i) => {
        const u = m.user || m;
        return (
          <View
            key={u?.id || i}
            style={[
              cs.avatarRing,
              { marginLeft: i > 0 ? -14 : 0, zIndex: max - i, borderColor: themeColor },
            ]}
          >
            <Avatar
              uri={u.avatarUrl}
              name={`${u.firstName || ''} ${u.lastName || ''}`.trim()}
              size={38}
            />
          </View>
        );
      })}
      {remaining > 0 && (
        <View
          style={[
            cs.avatar,
            { marginLeft: -14, zIndex: 0, backgroundColor: themeColor, borderColor: themeColor },
          ]}
        >
          <Text style={cs.avatarText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

function GroupCard({
  group,
  currentUserId,
  onPress,
  onAddExpense,
  colors,
  userBalance,
  balanceArray,
}: any) {
  const cfg = SPACE_TYPE_CONFIG[group.type] || SPACE_TYPE_CONFIG.default;
  const { owedToMe, iOwe, isSettled, totalSpent, memberCount, unsettledOthers, hasMembers } =
    deriveGroupBalance(group, currentUserId, userBalance, balanceArray);
  const members = group.members || [];
  const lastActivity = timeSince(group.updatedAt || group.createdAt);

  const balanceText =
    owedToMe > 0
      ? `You are owed ${fmtCompact(owedToMe)}`
      : iOwe > 0
        ? `You owe ${fmtCompact(iOwe)}`
        : null;

  const balanceColor = owedToMe > 0 ? '#10B981' : iOwe > 0 ? '#EF4444' : '#6B7280';

  const settlementText = isSettled
    ? totalSpent > 0
      ? 'Settled'
      : null
    : unsettledOthers > 0 && iOwe === 0
      ? `Pending from ${unsettledOthers} member${unsettledOthers > 1 ? 's' : ''}`
      : 'Awaiting you';

  const settlementColor = isSettled
    ? '#10B981'
    : unsettledOthers > 0 && iOwe === 0
      ? '#F59E0B'
      : '#EF4444';

  const canSettle = totalSpent > 0 && !isSettled;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={gCard.outer}>
      <View style={[gCard.card, { backgroundColor: colors.bg.card }]}>
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={gCard.cover}
        >
          <View style={gCard.coverOverlay}>
            <View style={gCard.coverTop}>
              <View style={[gCard.coverIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={cfg.icon as any} size={18} color="#FFF" />
              </View>
              <View style={[gCard.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={gCard.typeBadgeText}>{cfg.label}</Text>
              </View>
            </View>
            <Text style={gCard.coverName} numberOfLines={1}>
              {group.name || group.title}
            </Text>
            {lastActivity ? <Text style={gCard.coverTime}>{lastActivity}</Text> : null}
          </View>
        </LinearGradient>

        <View style={gCard.body}>
          <View style={gCard.memberRow}>
            <MemberAvatars members={members} themeColor={cfg.gradient[0]} />
            {memberCount > 0 && (
              <View style={[gCard.memberBadge, { backgroundColor: `${cfg.gradient[0]}15` }]}>
                <Text style={[gCard.memberBadgeText, { color: cfg.gradient[0] }]}>
                  {memberCount}
                </Text>
              </View>
            )}
          </View>

          <View style={gCard.balanceSection}>
            {!hasMembers ? (
              <Text style={[gCard.emptyText, { color: colors.text.tertiary }]}>No members yet</Text>
            ) : totalSpent === 0 && owedToMe === 0 && iOwe === 0 ? (
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
              style={[gCard.actionBtn, { backgroundColor: cfg.gradient[0] }]}
              activeOpacity={0.8}
              onPress={onAddExpense}
            >
              <Ionicons name="add-circle-outline" size={14} color="#FFF" />
              <Text style={gCard.actionBtnText}>Add expense</Text>
            </TouchableOpacity>
            {canSettle && (
              <TouchableOpacity
                style={[gCard.settleBtn, { backgroundColor: `${cfg.gradient[0]}15` }]}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Settle Up', 'Opening settlement screen...')}
              >
                <Ionicons name="swap-horizontal" size={14} color={cfg.gradient[0]} />
                <Text style={[gCard.settleBtnText, { color: cfg.gradient[0] }]}>Settle up</Text>
              </TouchableOpacity>
            )}
            {totalSpent > 0 && (
              <View style={gCard.spentBadge}>
                <Text style={[gCard.spentLabel, { color: colors.text.tertiary }]}>Spent</Text>
                <Text style={[gCard.spentValue, { color: colors.text.primary }]}>
                  {fmtCompact(totalSpent)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function SharedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [groupBalanceArrays, setGroupBalanceArrays] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('friends');
  const [inviteEmail, setInviteEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      if (!isRefresh) {
        setLoading(true);
      }
      try {
        const sharedRes = await api.get<any>('/shared-finance/groups');
        const groupList = listFromResponse(sharedRes);
        setGroups(groupList);

        const allGroupIds = groupList.map((g: any) => g.id).filter(Boolean);

        if (allGroupIds.length > 0) {
          const balanceResults = await Promise.allSettled(
            allGroupIds.map((gid: string) =>
              api.get<any>(`/shared-finance/groups/${gid}/balances`),
            ),
          );

          const newBalances: Record<string, number> = {};
          const newBalanceArrays: Record<string, any[]> = {};
          const currentUserId = (user as any)?.id;

          balanceResults.forEach((r, idx) => {
            const gid = allGroupIds[idx];
            if (r.status === 'fulfilled' && Array.isArray(r.value)) {
              newBalanceArrays[gid] = r.value;

              if (currentUserId) {
                const myEntry = r.value.find((b: any) => b.userId === currentUserId);
                if (myEntry) {
                  newBalances[gid] = Number(myEntry.balance);
                }
              }
              if (newBalances[gid] === undefined) {
                const anyNonZero = r.value.find((b: any) => Math.abs(Number(b.balance)) > 0.01);
                if (anyNonZero) {
                  newBalances[gid] = Number(anyNonZero.balance);
                }
              }
            }
          });

          setGroupBalances(newBalances);
          setGroupBalanceArrays(newBalanceArrays);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

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

  const activeCount = useMemo(
    () =>
      groups.filter((g: any) => {
        const d = new Date(g.updatedAt || g.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    [groups],
  );

  const pendingCount = useMemo(
    () =>
      groups.filter((g: any) => {
        const b = groupBalances[g.id];
        return b !== undefined && Math.abs(b) > 0;
      }).length,
    [groups, groupBalances],
  );

  const userName = user?.firstName || user?.email?.[0]?.toUpperCase() || 'User';
  const isAtLimit = groups.length >= MAX_SPACES;

  function handleFabPress() {
    if (isAtLimit) {
      Alert.alert(
        'Upgrade Required',
        `You've used all ${MAX_SPACES} spaces. Upgrade to create more.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('Settings', { screen: 'Subscription' }),
          },
        ],
      );
      return;
    }
    setShowCreateModal(true);
  }

  async function handleCreateSpace() {
    if (!newName.trim()) {
      return;
    }
    if (groups.length >= MAX_SPACES) {
      setShowCreateModal(false);
      return;
    }
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const body: any = { name: newName.trim(), type: newType.toLowerCase(), currency: 'INR' };
      if (inviteEmail.trim()) {
        body.inviteEmail = inviteEmail.trim();
      }
      const res = await api.post<any>('/shared-finance/groups', body);
      const newGroupId = res?.id || res?._id;
      resetModal();
      if (newGroupId) {
        navigation.navigate('SharedGroupDetail', {
          groupId: newGroupId,
          groupName: newName.trim(),
        });
      } else {
        loadData(true);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  function resetModal() {
    setShowCreateModal(false);
    setNewName('');
    setNewType('friends');
    setInviteEmail('');
  }

  if (loading && groups.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 12 }}>
          <Skeleton width={140} height={14} borderRadius={6} />
          <Skeleton width={180} height={22} style={{ marginTop: 4 }} borderRadius={6} />
        </View>
        <View style={{ marginTop: 24, gap: 16, paddingHorizontal: H_PADDING }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={210} borderRadius={20} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* ─── Header ─── */}
        <View style={[s.headerSection, { paddingTop: insets.top + 12 }]}>
          <View style={s.headerRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Profile')}
              style={s.profileRow}
            >
              <Avatar
                uri={user?.avatarUrl}
                name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                size={40}
              />
              <View>
                <Text style={[s.headerGreeting, { color: colors.text.tertiary }]}>
                  Welcome back
                </Text>
                <Text style={[s.headerName, { color: colors.text.primary }]} numberOfLines={1}>
                  {userName}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={s.headerActions}>
              {groups.length > 0 && (
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    {
                      backgroundColor: isAtLimit
                        ? `${colors.status.error}15`
                        : `${colors.accent.primary}15`,
                    },
                  ]}
                  onPress={handleFabPress}
                  disabled={isAtLimit}
                >
                  <Ionicons
                    name={isAtLimit ? 'lock-closed' : 'add'}
                    size={20}
                    color={isAtLimit ? colors.status.error : colors.accent.primary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: `${colors.accent.primary}15` }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <Ionicons name="settings-outline" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.upgradeBadge, { backgroundColor: `${colors.status.warning}18` }]}
                onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
              >
                <Ionicons name="diamond" size={12} color={colors.status.warning} />
                <Text style={[s.upgradeBadgeText, { color: colors.status.warning }]}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Section Title ─── */}
        <View style={[s.sectionTitleRow, { paddingHorizontal: H_PADDING }]}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Your Spaces</Text>
          {groups.length > 0 && (
            <Text style={[s.sectionCount, { color: colors.text.tertiary }]}>{groups.length}</Text>
          )}
        </View>

        {/* ─── Spaces ─── */}
        {groups.length > 0 ? (
          <View style={{ paddingHorizontal: H_PADDING, gap: 16 }}>
            {groups.map((group: any) => {
              const cfg = SPACE_TYPE_CONFIG[group.type] || SPACE_TYPE_CONFIG.default;
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={user?.id}
                  colors={colors}
                  userBalance={groupBalances[group.id]}
                  balanceArray={groupBalanceArrays[group.id]}
                  onPress={() => {
                    if (group.type === 'couple') {
                      navigation.navigate('CoupleFinance', {
                        groupId: group.id,
                        groupName: group.name,
                      });
                    } else if (group.type === 'family') {
                      navigation.navigate('FamilyDashboard', {
                        groupId: group.id,
                        groupName: group.name,
                      });
                    } else {
                      navigation.navigate('SharedGroupDetail', {
                        groupId: group.id,
                        groupName: group.name,
                      });
                    }
                  }}
                  onAddExpense={() => {
                    navigation.navigate('SharedExpenseForm', { groupId: group.id, edit: false });
                  }}
                />
              );
            })}
          </View>
        ) : (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIconWrap, { backgroundColor: `${colors.accent.primary}12` }]}>
              <Ionicons name="grid-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No spaces yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Create a space to split expenses with your people
            </Text>
            <TouchableOpacity
              style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={s.emptyCtaText}>Create Space</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Footer: Usage + Stats ─── */}
        {groups.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 28 }}>
            <View
              style={[
                s.statsCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <View style={s.usageRow}>
                <View style={s.usageLeft}>
                  <View style={[s.usageBar, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        s.usageFill,
                        {
                          width: `${(groups.length / MAX_SPACES) * 100}%`,
                          backgroundColor: isAtLimit
                            ? colors.status.error
                            : groups.length >= MAX_SPACES - 1
                              ? colors.status.warning
                              : colors.accent.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[s.usageText, { color: colors.text.secondary }]}>
                    {groups.length} of {MAX_SPACES} spaces used
                    {isAtLimit ? ' — Full' : ''}
                  </Text>
                </View>
              </View>

              <View style={[s.statsDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.text.primary }]}>{totalMembers}</Text>
                  <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Members</Text>
                </View>
                <View style={[s.statDot, { backgroundColor: colors.border.default }]} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.text.primary }]}>{activeCount}</Text>
                  <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Active</Text>
                </View>
                <View style={[s.statDot, { backgroundColor: colors.border.default }]} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.status.warning }]}>
                    {pendingCount}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Pending</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Create Modal ─── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[mod.overlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? -20 : 0}
              style={{ justifyContent: 'flex-end' }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[mod.sheet, { backgroundColor: colors.bg.primary }]}>
                  <View style={[mod.handle, { backgroundColor: colors.border.default }]} />
                  <Text style={[mod.title, { color: colors.text.primary }]}>New Space</Text>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    <View style={mod.field}>
                      <Text style={[mod.label, { color: colors.text.tertiary }]}>Name</Text>
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
                                    backgroundColor: active
                                      ? `${cfg.gradient[0]}1A`
                                      : colors.bg.card,
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
                      <Text style={[mod.label, { color: colors.text.tertiary }]}>
                        Invite Member (optional)
                      </Text>
                      <View
                        style={[
                          mod.inviteRow,
                          { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                        ]}
                      >
                        <Ionicons
                          name="person-add-outline"
                          size={18}
                          color={colors.text.tertiary}
                        />
                        <TextInput
                          style={[mod.inviteInput, { color: colors.text.primary }]}
                          value={inviteEmail}
                          onChangeText={setInviteEmail}
                          placeholder="Email address"
                          placeholderTextColor={colors.text.tertiary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <View style={mod.actionRow}>
                      <TouchableOpacity
                        style={[mod.cancelBtn, { borderColor: colors.border.default }]}
                        onPress={() => {
                          resetModal();
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={[mod.cancelBtnText, { color: colors.text.secondary }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          mod.submitBtn,
                          {
                            backgroundColor: colors.accent.primary,
                            opacity: saving || !newName.trim() ? 0.5 : 1,
                          },
                        ]}
                        onPress={() => {
                          Keyboard.dismiss();
                          handleCreateSpace();
                        }}
                        disabled={saving || !newName.trim()}
                      >
                        {saving ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="add" size={18} color="#FFF" />
                            <Text style={mod.submitBtnText}>Create</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerSection: { paddingHorizontal: H_PADDING, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  headerGreeting: { fontSize: 11, fontWeight: '500', marginBottom: 1 },
  headerName: { fontSize: 18, fontWeight: '700', maxWidth: 160 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeBadgeText: { fontSize: 12, fontWeight: '700' },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionCount: { fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: H_PADDING },
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
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usageLeft: { flex: 1, gap: 6 },
  usageBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
  usageText: { fontSize: 12, fontWeight: '500' },
  statsDivider: { height: 1, marginVertical: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statDot: { width: 4, height: 4, borderRadius: 2 },
});

const gCard = StyleSheet.create({
  outer: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  card: { borderRadius: 20, overflow: 'hidden' },
  cover: { height: 106 },
  coverOverlay: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  coverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
  },
  coverIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 7 },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  coverName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  coverTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { padding: 16, paddingTop: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: -4,
  },
  memberBadgeText: { fontSize: 11, fontWeight: '700' },
  memberCount: { fontSize: 12, fontWeight: '500' },
  balanceSection: { gap: 2, marginTop: 10 },
  balanceLabel: { fontSize: 15, fontWeight: '700' },
  settlementRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  settlementDot: { width: 6, height: 6, borderRadius: 3 },
  settlementText: { fontSize: 12, fontWeight: '500' },
  emptyText: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  settleBtnText: { fontSize: 12, fontWeight: '700' },
  spentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spentLabel: { fontSize: 11, fontWeight: '500' },
  spentValue: { fontSize: 14, fontWeight: '700' },
});

const cs = StyleSheet.create({
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: {
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});

const mod = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
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
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inviteInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 12 },
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
