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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../store/ToastContext';

const H_PADDING = 20;

const FREE_MAX = 3;
const DEFAULT_PLAN = { tier: 'free' as const, maxGroups: FREE_MAX, maxMembersPerGroup: 10 };

const SPACE_ICONS: Record<string, string> = {
  friends: 'people',
  trip: 'airplane',
  family: 'home',
  couple: 'heart',
  roommates: 'business',
  office: 'briefcase',
  event: 'calendar',
  apartment: 'building',
  sports: 'football',
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

function GreetingHeader({
  netBalance,
  userName,
  colors,
  onSettings,
}: any) {
  const isPositive = netBalance >= 0;
  const statusColor = isPositive ? colors.status.success : colors.status.error;
  const statusLabel = isPositive ? 'You are owed across spaces' : 'You owe across spaces';

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
            {getGreeting()}
          </Text>
          <Text
            style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 1 }}
            numberOfLines={1}
          >
            {userName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onSettings}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${colors.accent.primary}10`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="settings-outline" size={18} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      {netBalance !== 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: colors.bg.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isPositive ? `${colors.status.success}30` : `${colors.status.error}30`,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: `${statusColor}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isPositive ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={statusColor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: statusColor }}>
              {isPositive ? '' : '-'}₹{Math.abs(Math.round(netBalance)).toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
              {statusLabel}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function MemberAvatars({ members }: { members: any[] }) {
  const { colors } = useTheme();
  const max = 5;
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  if (members.length === 0) {
    return null;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((m, i) => {
        const u = m.user || m;
        return (
          <View
            key={u?.id || i}
            style={{
              marginLeft: i > 0 ? -12 : 0,
              zIndex: max - i,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: '#FFF',
            }}
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
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            marginLeft: -12,
            backgroundColor: colors.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 0,
            borderWidth: 2,
            borderColor: '#FFF',
          }}
        >
          <Text style={{ color: colors.text.inverse, fontSize: 9, fontWeight: '800' }}>
            +{remaining}
          </Text>
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
  onSettle,
  colors,
  userBalance,
  balanceArray,
}: any) {
  const { owedToMe, iOwe, isSettled, totalSpent, memberCount, unsettledOthers } =
    deriveGroupBalance(group, currentUserId, userBalance, balanceArray);
  const members = group.members || [];
  const lastActivity = timeSince(group.updatedAt || group.createdAt);
  const icon = SPACE_ICONS[group.type] || 'people';

  const isOwed = owedToMe > 0;
  const owes = iOwe > 0;
  const activeAmount = isOwed ? owedToMe : owes ? iOwe : 0;

  const amountColor = isOwed
    ? colors.status.success
    : owes
      ? colors.status.error
      : colors.text.tertiary;
  const statusText = isOwed ? 'You are owed' : owes ? 'You owe' : 'Settled';

  const settlementColor = isSettled
    ? colors.status.success
    : unsettledOthers > 0 && !owes
      ? colors.status.warning
      : colors.status.error;
  const settlementLabel = isSettled
    ? null
    : unsettledOthers > 0 && !owes
      ? `Pending from ${unsettledOthers} member${unsettledOthers > 1 ? 's' : ''}`
      : 'Awaiting you';

  const canSettle = totalSpent > 0 && !isSettled;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border.default,
          padding: 14,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: `${colors.accent.primary}10`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={icon as any} size={16} color={colors.accent.primary} />
            </View>
            <Text
              style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, flex: 1 }}
              numberOfLines={1}
            >
              {group.name || group.title}
            </Text>
          </View>
          <MemberAvatars members={members} />
        </View>

        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          {activeAmount > 0 ? (
            <>
              <Text
                style={{ fontSize: 22, fontWeight: '800', color: amountColor, letterSpacing: -0.3 }}
              >
                ₹{Math.round(activeAmount).toLocaleString('en-IN')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: amountColor }}>
                {statusText}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>
              {totalSpent > 0 ? 'All settled up' : 'No activity yet'}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 10,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              onPress={onAddExpense}
            >
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: `${colors.accent.primary}12`,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add" size={13} color={colors.accent.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent.primary }}>
                    Add
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            {canSettle && (
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={onSettle}
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: `${settlementColor}15`,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="swap-horizontal" size={13} color={settlementColor} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: settlementColor }}>
                      Settle
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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
  const { showToast } = useToast();

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
      warmupBackend().catch(() => {});
      if (!isRefresh) {
        setLoading(true);
      }
      const settleTimer = setTimeout(() => setLoading(false), 3000);
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
        clearTimeout(settleTimer);
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

  const netBalance = useMemo(
    () => Object.values(groupBalances).reduce((s, b) => s + (b || 0), 0),
    [groupBalances],
  );

  const planInfo = useMemo(() => groups[0]?._plan || DEFAULT_PLAN, [groups]);
  const maxSpaces = planInfo.maxGroups;
  const userName = user?.firstName || user?.email?.[0]?.toUpperCase() || 'User';
  const isAtLimit = groups.length >= maxSpaces;

  function handleFabPress() {
    if (isAtLimit) {
      Alert.alert(
        planInfo.tier === 'free' ? 'Upgrade Required' : 'Limit Reached',
        planInfo.tier === 'free'
          ? `Free plan allows ${maxSpaces} spaces. Upgrade to Premium for unlimited spaces.`
          : `You've used all ${maxSpaces} spaces.`,
        planInfo.tier === 'free'
          ? [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Upgrade',
                onPress: () => navigation.navigate('Settings', { screen: 'Premium' }),
              },
            ]
          : [{ text: 'OK' }],
      );
      return;
    }
    setShowCreateModal(true);
  }

  async function handleCreateSpace() {
    if (!newName.trim()) {
      return;
    }
    if (groups.length >= maxSpaces) {
      setShowCreateModal(false);
      return;
    }
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const body: any = { name: newName.trim(), type: newType.toLowerCase(), currency: 'INR' };
      const res = await api.post<any>('/shared-finance/groups', body);
      showToast('Group created');
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
    } catch (e: any) {
      const msg = e?.message || 'Failed to create space. Please try again.';
      Alert.alert('Error', msg);
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
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 12, gap: 12 }}>
          <Skeleton width={120} height={13} borderRadius={6} />
          <Skeleton width={160} height={20} borderRadius={6} />
          <Skeleton width="100%" height={80} borderRadius={20} />
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={90} borderRadius={16} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
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
        {/* ─── Greeting Header ─── */}
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 12 }}>
          <GreetingHeader
            netBalance={netBalance}
            userName={userName}
            colors={colors}
            onSettings={() => navigation.navigate('Settings')}
          />
        </View>

        {/* ─── Spaces Header ─── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 28,
            marginBottom: 14,
            paddingHorizontal: H_PADDING,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            Your Spaces
          </Text>
          <TouchableOpacity
            onPress={handleFabPress}
            disabled={isAtLimit}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: isAtLimit
                ? `${colors.status.error}15`
                : `${colors.accent.primary}12`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isAtLimit ? 'lock-closed' : 'add'}
              size={16}
              color={isAtLimit ? colors.status.error : colors.accent.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ─── Spaces List ─── */}
        {groups.length > 0 ? (
          <View style={{ paddingHorizontal: H_PADDING, gap: 10 }}>
            {groups.map((group: any) => (
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
                onSettle={() => {
                  navigation.navigate('Settlement', { groupId: group.id });
                }}
              />
            ))}
          </View>
        ) : (
          <View
            style={{ alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: H_PADDING }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: `${colors.accent.primary}12`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="grid-outline" size={34} color={colors.accent.primary} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>
              No spaces yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                textAlign: 'center',
                paddingHorizontal: 24,
                lineHeight: 18,
                color: colors.text.tertiary,
              }}
            >
              Create a space to split expenses with your people
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: colors.accent.primary,
                marginTop: 6,
              }}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={16} color={colors.text.inverse} />
              <Text style={{ color: colors.text.inverse, fontSize: 14, fontWeight: '700' }}>
                Create Space
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Upgrade Banner ─── */}
        {planInfo.tier === 'free' && groups.length >= maxSpaces - 1 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings', { screen: 'Premium' })}
            style={{
              marginHorizontal: H_PADDING,
              marginTop: 20,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: `${colors.accent.primary}10`,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
              {groups.length >= maxSpaces
                ? 'Space limit reached. Upgrade for more.'
                : `${maxSpaces - groups.length} space${maxSpaces - groups.length > 1 ? 's' : ''} remaining on free plan`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent.primary }}>
                Upgrade
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
            </View>
          </TouchableOpacity>
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
                        {Object.entries(SPACE_ICONS)
                          .filter(([k]) => k !== 'default')
                          .map(([key, icon]) => {
                            const active = newType === key;
                            return (
                              <TouchableOpacity
                                key={key}
                                style={[
                                  mod.typeChip,
                                  {
                                    borderColor: active
                                      ? colors.accent.primary
                                      : colors.border.default,
                                    backgroundColor: active
                                      ? `${colors.accent.primary}15`
                                      : colors.bg.card,
                                  },
                                ]}
                                onPress={() => setNewType(key)}
                              >
                                <Ionicons
                                  name={icon as any}
                                  size={16}
                                  color={active ? colors.accent.primary : colors.text.tertiary}
                                />
                                <Text
                                  style={[
                                    mod.typeChipText,
                                    {
                                      color: active ? colors.accent.primary : colors.text.secondary,
                                    },
                                  ]}
                                >
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
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
                          <ActivityIndicator color={colors.text.inverse} size="small" />
                        ) : (
                          <>
                            <Ionicons name="add" size={18} color={colors.text.inverse} />
                            <Text style={[mod.submitBtnText, { color: colors.text.inverse }]}>
                              Create
                            </Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  submitBtnText: { fontSize: 15, fontWeight: '700' },
});
