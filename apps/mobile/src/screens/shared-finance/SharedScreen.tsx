import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/design';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { Avatar } from '../../components/ui/Avatar';
import { PremiumLoaderScreen } from '../../components/ui/PremiumLoaderScreen';

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

const COVER_GRADIENTS: Record<string, [string, string]> = {
  couple: ['#7C3AED', '#5AC8FA'],
  family: ['#2563EB', '#60A5FA'],
  trip: ['#0D9488', '#2DD4BF'],
  friends: ['#DC2626', '#FB7185'],
  wedding: ['#BE185D', '#F472B6'],
  house_purchase: ['#F97316', '#FDBA74'],
  office: ['#4F46E5', '#818CF8'],
  event: ['#D97706', '#FCD34D'],
  apartment: ['#1F2937', '#6B7280'],
  sports: ['#059669', '#34D399'],
};

const COVER_ICONS: Record<string, string> = {
  couple: 'heart',
  family: 'team',
  trip: 'enviroment',
  friends: 'addusergroup',
  wedding: 'heart',
  house_purchase: 'home',
  office: 'tool',
  event: 'star',
  apartment: 'appstore-o',
  sports: 'codesquareo',
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

function GreetingHeader({ netBalance, userName, colors, onSettings, onBalancePress }: any) {
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
          <AntDesign  name="setting" size={18} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      {netBalance !== 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBalancePress}
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
            <AntDesign
              name={(isPositive ? 'downcircle' : 'upcircle') as any}
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
          <AntDesign  name="right" size={18} color={colors.text.tertiary} />
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
  const [expanded, setExpanded] = useState(false);
  const animRef = useRef(new Animated.Value(0)).current;

  const { owedToMe, iOwe, isSettled, totalSpent, memberCount, unsettledOthers } =
    deriveGroupBalance(group, currentUserId, userBalance, balanceArray);
  const members = group.members || [];
  const lastActivity = timeSince(group.updatedAt || group.createdAt);
  const coverIcon = COVER_ICONS[group.type] || 'folder1';
  const goalCount = group._count?.goals || group.goals?.length || 0;
  const aiTip = group.aiTip || null;

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
  const canSettle = totalSpent > 0 && !isSettled;

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animRef, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animRef]);

  const bodyHeight = animRef.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        }}
      >
        {/* Top Row — collapsed view */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${amountColor}14`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign name={coverIcon as any} size={22} color={colors.text.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                {group.name || group.title}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, textTransform: 'capitalize' }}>
                {group.type || 'space'} • {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              {activeAmount > 0 ? (
                <>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: amountColor, letterSpacing: -0.3 }}>
                    ₹{Math.round(activeAmount).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: amountColor }}>{statusText}</Text>
                </>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary }}>
                  {totalSpent > 0 ? 'Settled' : 'Empty'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={toggleExpand}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.bg.tertiary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign name={expanded ? 'up' : 'down'} size={12} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border.subtle,
              paddingTop: 12,
            }}
          >
            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              {totalSpent > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${colors.accent.primary}12`, alignItems: 'center', justifyContent: 'center' }}>
                    <AntDesign name="wallet" size={13} color={colors.accent.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>₹{Math.round(totalSpent).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              )}
              {goalCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${colors.status.warning}15`, alignItems: 'center', justifyContent: 'center' }}>
                    <AntDesign name="flag" size={13} color={colors.status.warning} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 }}>Goals</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{goalCount}</Text>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${colors.text.tertiary}15`, alignItems: 'center', justifyContent: 'center' }}>
                  <AntDesign name="clockcircleo" size={13} color={colors.text.tertiary} />
                </View>
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 }}>Active</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{lastActivity}</Text>
                </View>
              </View>
            </View>

            {/* Members Avatars */}
            {members.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MemberAvatars members={members} />
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>
                  {members.slice(0, 5).map((m: any) => m.split?.(' ')[0] || m.name?.split?.(' ')[0]).filter(Boolean).join(', ')}
                  {members.length > 5 ? ` +${members.length - 5} more` : ''}
                </Text>
              </View>
            )}

            {/* AI Insight */}
            {aiTip && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.accent.primary}08`, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
                <AntDesign name="bulb1" size={14} color={colors.accent.primary} />
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.secondary, flex: 1 }} numberOfLines={2}>
                  {aiTip}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={onAddExpense}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 11,
                  borderRadius: 12,
                  backgroundColor: colors.accent.primary,
                }}
              >
                <AntDesign name="plus" size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Add Expense</Text>
              </TouchableOpacity>
              {canSettle && (
                <TouchableOpacity
                  onPress={onSettle}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 11,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: settlementColor,
                  }}
                >
                  <AntDesign name="swap" size={14} color={settlementColor} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: settlementColor }}>Settle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SharedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken, user, isPremium } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [groupBalanceArrays, setGroupBalanceArrays] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);


  const loadData = useCallback(
    async (isRefresh = false) => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      warmupBackend().catch(() => {});
      if (!isRefresh) {
        setLoading(true);
        setLoadingProgress(0);
      }
      try {
        const sharedRes = await api.get<any>('/shared-finance/groups');
        const groupList = listFromResponse(sharedRes);
        setGroups(groupList);

        const allGroupIds = groupList.map((g: any) => g.id).filter(Boolean);
        const totalCalls = 1 + allGroupIds.length;
        let completed = 0;
        const tick = () => {
          completed++;
          setLoadingProgress(Math.min(Math.round((completed / totalCalls) * 100), 95));
        };

        tick(); // groups fetch done

        if (allGroupIds.length > 0) {
          const balanceResults = await Promise.allSettled(
            allGroupIds.map((gid: string) =>
              api.get<any>(`/shared-finance/groups/${gid}/balances`).finally(tick),
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
        setLoadingProgress(100);
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

  const planInfo = useMemo(() => {
    if (isPremium) {
      return { tier: 'premium' as const, maxGroups: 100, maxMembersPerGroup: 100 };
    }
    return groups[0]?._plan || DEFAULT_PLAN;
  }, [groups, isPremium]);
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
    navigation.navigate('CreateSharedGroup');
  }

  if (loading) {
    return (
      <PremiumLoaderScreen
        progress={loadingProgress}
        title="Loading Your Spaces"
        icon="layers-outline"
      />
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
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: insets.top + 12 }}>
          <GreetingHeader
            netBalance={netBalance}
            userName={userName}
            colors={colors}
            onSettings={() => navigation.navigate('Settings')}
            onBalancePress={() => navigation.navigate('SharedDashboard', { screen: 'SharedSettlements' })}
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
            paddingHorizontal: spacing.xl,
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
            <AntDesign
              name={(isAtLimit ? 'lock' : 'plus') as any}
              size={16}
              color={isAtLimit ? colors.status.error : colors.accent.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ─── Spaces List ─── */}
        {groups.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
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
            style={{ alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: spacing.xl }}
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
              <AntDesign  name="appstore1" size={34} color={colors.accent.primary} />
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
              onPress={() => navigation.navigate('CreateSharedGroup')}
            >
              <AntDesign  name="plus" size={16} color={colors.text.inverse} />
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
              marginHorizontal: spacing.xl,
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
              <AntDesign  name="right" size={14} color={colors.accent.primary} />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
