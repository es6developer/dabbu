import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Share,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { createInviteLink } from '../../services/external-sharing';
import { useAuth } from '../../store/AuthContext';
import { Card } from '../../components/ui/Card';
import { useGroupLifecycle } from '../../hooks/useGroupLifecycle';
import { GroupStatusBanner } from '../../components/shared-finance/GroupStatusBanner';
import { AccessRevokedModal } from '../../components/shared-finance/AccessRevokedModal';
import { PremiumUpgradeModal } from '../../components/shared-finance/PremiumUpgradeModal';

type Segments = 'expenses' | 'balances' | 'settlements';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  balance: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: { id: string; name: string };
  date: string;
  splitType: 'equal' | 'custom' | 'percentage' | 'shares';
  category?: string;
}

interface Settlement {
  id: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
}

interface GroupDetail {
  id: string;
  name: string;
  type: 'friends' | 'trip' | 'family' | 'couple' | 'roommates' | 'office';
  description?: string;
  memberCount: number;
  totalSpent: number;
  balance: number;
  currency: string;
  inviteCode?: string;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  isPremium?: boolean;
  planLimit?: number;
}

const GROUP_TYPE_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  friends: { icon: 'people', label: 'Friends', color: '#74B9FF' },
  trip: { icon: 'airplane', label: 'Trip', color: '#00B894' },
  family: { icon: 'home', label: 'Family', color: '#FDCB6E' },
  couple: { icon: 'heart', label: 'Couple', color: '#FF6B6B' },
  roommates: { icon: 'business', label: 'Roommates', color: '#A29BFE' },
  office: { icon: 'briefcase', label: 'Office', color: '#f7892c' },
};

const SPLIT_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  equal: 'git-branch-outline',
  exact: 'calculator-outline',
  weighted: 'layers-outline',
  custom: 'options-outline',
};

const formatAmount = (amount: number, currency: string = 'INR') => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(safeAmount));
};

const formatDate = (dateStr: string) => {
  if (!dateStr) {
    return '';
  }
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function SkeletonLoader() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View
        style={[
          styles.skelBlock,
          {
            backgroundColor: colors.skeleton.base,
            opacity,
            width: '35%',
            height: 22,
            marginBottom: 16,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skelBlock,
          {
            backgroundColor: colors.skeleton.base,
            opacity,
            width: '65%',
            height: 64,
            marginBottom: 24,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skelBlock,
          {
            backgroundColor: colors.skeleton.base,
            opacity,
            width: '100%',
            height: 140,
            marginBottom: 16,
          },
        ]}
      />
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <Animated.View
          style={[
            styles.skelBlock,
            { backgroundColor: colors.skeleton.base, opacity, height: 90, flex: 1, marginRight: 10 },
          ]}
        />
        <Animated.View
          style={[
            styles.skelBlock,
            { backgroundColor: colors.skeleton.base, opacity, height: 90, flex: 1 },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.skelBlock,
          {
            backgroundColor: colors.skeleton.base,
            opacity,
            width: '100%',
            height: 16,
            marginBottom: 12,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skelBlock,
          {
            backgroundColor: colors.skeleton.base,
            opacity,
            width: '70%',
            height: 16,
            marginBottom: 12,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skelBlock,
          { backgroundColor: colors.skeleton.base, opacity, width: '100%', height: 80 },
        ]}
      />
    </View>
  );
}

export function GroupDetailScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<{ params: { groupId: string; inviteCode?: string } }, 'params'>>();
  const groupId = route.params?.groupId;
  const paramInviteCode = route.params?.inviteCode;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<Segments>('expenses');
  const [showRevokedModal, setShowRevokedModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [invitingExternal, setInvitingExternal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const { status, restrictions, accessRevoked, revocationReason, isReadOnly, hasRestriction } =
    useGroupLifecycle({
      groupId: groupId ?? '',
      onAccessRevoked: () => setShowRevokedModal(true),
    });

  const fetchGroup = useCallback(
    async (isRefresh = false) => {
      if (!groupId) {
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        let data: any = null;
        let expensesRes: any[] = [];
        let settlementsRes: any[] = [];

        try {
          data = await api.get<any>(`/shared-finance/groups/${groupId}`, signal);
        } catch {
          if (!signal.aborted) {
            setError('Group not found');
          }
          return;
        }

        try {
          expensesRes = await api.get<any[]>(`/shared-finance/groups/${groupId}/expenses`, signal);
        } catch {
          expensesRes = [];
        }
        try {
          settlementsRes = await api.get<any[]>(
            `/shared-finance/groups/${groupId}/settlements`,
            signal,
          );
        } catch {
          settlementsRes = [];
        }

        if (signal.aborted) {
          return;
        }

        if (!data) {
          setError('Group not found');
          return;
        }

        const balances = data.balances ?? [];
        const members = data.members ?? [];
        const currentUserId = user?.id || data.ownerId;
        const myBalance = balances.find((b: any) => b?.userId === currentUserId || b?.memberId === currentUserId);
        const totalSpent = balances.reduce((s: number, b: any) => s + Number(b?.totalPaid ?? 0), 0);

        const transformed: GroupDetail = {
          id: data.id,
          name: data.name,
          type: data.type,
          description: data.description,
          memberCount: data._count?.members || members.length || 0,
          inviteCode: data.inviteCode || paramInviteCode,
          totalSpent,
          balance: myBalance?.netBalance || 0,
          currency: data.currency,
          isPremium: data.isPremium,
          planLimit: data.planLimit,
          members: members.map((m: any) => ({
            id: m.id,
            name: m.user
              ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim()
              : m.name || 'Unknown',
            email: m.user?.email || '',
            role: m.role,
            balance: balances.find((b: any) => b?.memberId === m.id)?.netBalance || 0,
          })),
          expenses: (expensesRes ?? []).map((e: any) => {
            const paidByName = e.paidBy?.user
              ? `${e.paidBy.user.firstName ?? ''} ${e.paidBy.user.lastName ?? ''}`.trim()
              : e.paidBy?.name || e.paidByName || 'Unknown';
            return {
              id: e.id,
              description: e.description,
              amount: Number(e.amount ?? 0),
              paidBy: { id: e.paidBy?.id || e.paidByMemberId, name: paidByName },
              date: e.date || e.createdAt,
              splitType: e.splitType || 'equal',
              category: e.category,
            };
          }),
          settlements: (settlementsRes ?? []).map((s: any) => ({
            id: s.id,
            from: {
              id: s.from?.id || s.fromMemberId,
              name: s.from?.name || s.fromName || 'Unknown',
            },
            to: { id: s.to?.id || s.toMemberId, name: s.to?.name || s.toName || 'Unknown' },
            amount: Number(s.amount),
            status: s.status || 'pending',
            date: s.date || s.createdAt,
          })),
        };
        setGroup(transformed);
      } catch (err: any) {
        if (!signal.aborted) {
          setError(err?.message || 'Failed to load group');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [groupId, paramInviteCode, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      fetchGroup();
      return () => {
        if (abortRef.current) {
          abortRef.current.abort();
        }
      };
    }, [groupId, fetchGroup]),
  );

  const handleAddMemberPress = useCallback(() => {
    if (!group) {
      return;
    }
    const limit = group.planLimit || 2;
    if (group.memberCount >= limit && !group.isPremium) {
      setShowUpgradeModal(true);
    } else {
      navigation.navigate('InviteMembers', { groupId });
    }
  }, [group, groupId, navigation]);

  const handleUpgrade = useCallback(() => {
    setShowUpgradeModal(false);
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleInviteExternal = async () => {
    setInvitingExternal(true);
    try {
      const res = await createInviteLink(groupId);
      const token = res.token;
      const link = `https://external-web.vercel.app/invite/${token}`;
      await Share.share({
        message: `Join my group "${group?.name}" on Dabbu! ${link}`,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create invite link');
    } finally {
      setInvitingExternal(false);
    }
  };

  const config = group
    ? GROUP_TYPE_CONFIG[group.type] || GROUP_TYPE_CONFIG.friends
    : GROUP_TYPE_CONFIG.friends;
  const isOwed = group ? group.balance >= 0 : true;

  const SEGMENTS: { key: Segments; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'expenses', label: 'Expenses', icon: 'receipt-outline' },
    { key: 'balances', label: 'Balances', icon: 'people-outline' },
    { key: 'settlements', label: 'Settlements', icon: 'swap-horizontal-outline' },
  ];

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <Card
      variant="elevated"
      padding="lg"
      style={styles.expenseCard}
      onPress={() => navigation.navigate('GroupExpenseDetail', { groupId, expenseId: item.id })}
    >
      <View style={styles.expenseRow}>
        <View style={[styles.expenseIconContainer, { backgroundColor: colors.bg.tertiary }]}>
          <Ionicons
            name={SPLIT_TYPE_ICONS[item.splitType] || 'receipt-outline'}
            size={20}
            color={colors.accent.primary}
          />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
            Paid by {item.paidBy.name} · {formatDate(item.date)}
          </Text>
        </View>
        <Text style={[styles.expenseAmount, { color: colors.text.primary }]}>
          {formatAmount(item.amount, group?.currency)}
        </Text>
      </View>
    </Card>
  );

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const memberOwed = item.balance >= 0;
    const firstLetter = item.name.charAt(0).toUpperCase();
    const roleColors: Record<string, string> = {
      owner: colors.accent.primary,
      admin: colors.status.info,
      member: colors.text.tertiary,
    };

    return (
      <Card variant="elevated" padding="lg" style={styles.memberCard}>
        <View style={styles.memberRow}>
          <View style={[styles.memberAvatar, { backgroundColor: config.color + '25' }]}>
            <Text style={[styles.memberAvatarText, { color: config.color }]}>{firstLetter}</Text>
          </View>
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.role !== 'member' && (
                <View style={[styles.roleBadge, { backgroundColor: roleColors[item.role] + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColors[item.role] }]}>
                    {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.subhead, { color: colors.text.tertiary }]}>{item.email}</Text>
          </View>
          <Text
            style={[
              styles.balanceText,
              { color: memberOwed ? colors.status.success : colors.status.error },
            ]}
          >
            {memberOwed ? '+' : '-'}
            {formatAmount(item.balance, group?.currency)}
          </Text>
        </View>
      </Card>
    );
  };

  const renderSettlementItem = ({ item }: { item: Settlement }) => {
    const isPending = item.status === 'pending';
    const isCompleted = item.status === 'completed';

    return (
      <Card variant="elevated" padding="lg" style={styles.settlementCard}>
        <View style={styles.settlementRow}>
          <View
            style={[
              styles.settlementIcon,
              {
                backgroundColor: isCompleted
                  ? colors.status.successLight
                  : isPending
                    ? colors.status.warningLight
                    : colors.status.errorLight,
              },
            ]}
          >
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : isPending ? 'time-outline' : 'close-circle'}
              size={22}
              color={
                isCompleted
                  ? colors.status.success
                  : isPending
                    ? colors.status.warning
                    : colors.status.error
              }
            />
          </View>
          <View style={styles.settlementInfo}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
              {item.from.name} → {item.to.name}
            </Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
              {formatDate(item.date)}
            </Text>
          </View>
          <View style={styles.settlementRight}>
            <Text
              style={[typography.amountSmall, { color: colors.text.primary, textAlign: 'right' }]}
            >
              {formatAmount(item.amount, group?.currency)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCompleted
                    ? colors.status.successLight
                    : isPending
                      ? colors.status.warningLight
                      : colors.status.errorLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isCompleted
                      ? colors.status.success
                      : isPending
                        ? colors.status.warning
                        : colors.status.error,
                  },
                ]}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const segmentData: any[] =
    activeSegment === 'expenses'
      ? (group?.expenses ?? [])
      : activeSegment === 'balances'
        ? (group?.members ?? [])
        : (group?.settlements ?? []);

  const renderSegmentItem = ({ item }: { item: any }) => {
    switch (activeSegment) {
      case 'expenses':
        return renderExpenseItem({ item });
      case 'balances':
        return renderMemberItem({ item });
      case 'settlements':
        return renderSettlementItem({ item });
    }
  };

  const emptyStateConfig = {
    expenses: { icon: 'receipt-outline' as const, text: 'No expenses yet' },
    balances: { icon: 'people-outline' as const, text: 'No members yet' },
    settlements: { icon: 'swap-horizontal-outline' as const, text: 'No settlements yet' },
  };

  const renderListHeader = () => (
    <>
      <GroupStatusBanner
        status={status}
        groupName={group?.name || ''}
        isAdmin={(group?.members ?? []).some((m) => m.role === 'owner' || m.role === 'admin')}
        onReactivate={() => {}}
        onArchive={() => {}}
        onViewSummary={() => navigation.navigate('GroupDashboard', { groupId })}
      />

      <AccessRevokedModal
        visible={showRevokedModal}
        onDismiss={() => {
          setShowRevokedModal(false);
          navigation.navigate('SharedFinanceHome');
        }}
        reason={(revocationReason as any) || 'member_removed'}
        groupName={group?.name || ''}
      />

      <PremiumUpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        groupName={group?.name}
        currentLimit={group?.planLimit || 2}
        premiumLimit={30}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[typography.h2, { color: colors.text.primary }]}>{group?.name}</Text>
            <View style={styles.headerBadges}>
              <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
                <Ionicons name={config.icon} size={12} color={config.color} />
                <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="people-outline" size={12} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary }]}>
                  {group?.memberCount} members
                </Text>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.bg.tertiary }]}
          onPress={() => navigation.navigate('GroupSettings', { groupId })}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSummary}>
        <LinearGradient
          colors={[config.color + '30', colors.bg.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientCardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + '25' }]}>
              <Ionicons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.md }]}>
            {group?.name}
          </Text>
          <View style={styles.balanceSection}>
            <Text
              style={[
                typography.amountLarge,
                {
                  color: isOwed ? colors.status.success : colors.status.error,
                  marginTop: spacing.xs,
                },
              ]}
            >
              {isOwed ? '+' : '-'}
              {formatAmount(group?.balance ?? 0, group?.currency)}
            </Text>
            <Text
              style={[typography.footnote, { color: colors.text.tertiary, marginTop: spacing.xs }]}
            >
              {isOwed ? 'You are owed' : 'You owe'}
            </Text>
          </View>
          <View
            style={[
              styles.gradientDivider,
              { backgroundColor: colors.border.subtle, marginVertical: spacing.md },
            ]}
          />
          <View style={styles.totalSpentRow}>
            <Text style={[typography.footnote, { color: colors.text.secondary }]}>Total spent</Text>
            <Text style={[typography.callout, { color: colors.text.primary, fontWeight: '600' }]}>
              {formatAmount(group?.totalSpent ?? 0, group?.currency)}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {group?.id && (
        <View style={styles.inviteSection}>
          <TouchableOpacity
            style={[
              styles.inviteBanner,
              {
                backgroundColor: colors.accent.primary + '12',
                borderColor: colors.accent.primary + '30',
              },
            ]}
            onPress={handleInviteExternal}
            activeOpacity={0.7}
            disabled={invitingExternal}
          >
            {invitingExternal ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
            )}
            <Text style={[styles.inviteBannerText, { color: colors.accent.primary }]}>
              {invitingExternal ? 'Creating link...' : 'Share Invite Link'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.segmentControl, { backgroundColor: colors.bg.tertiary }]}>
        {SEGMENTS.map((seg) => {
          const isActive = activeSegment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[
                styles.segmentOption,
                isActive && {
                  backgroundColor: colors.bg.elevated,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
              onPress={() => setActiveSegment(seg.key)}
            >
              <Ionicons
                name={seg.icon}
                size={16}
                color={isActive ? colors.accent.primary : colors.text.tertiary}
              />
              <Text
                style={[
                  typography.subheadBold,
                  { color: isActive ? colors.accent.primary : colors.text.tertiary, marginLeft: 6 },
                ]}
              >
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderListEmpty = () => {
    const cfg = emptyStateConfig[activeSegment];
    return (
      <View style={styles.emptySegment}>
        <Ionicons name={cfg.icon} size={40} color={colors.text.tertiary} />
        <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: spacing.md }]}>
          {cfg.text}
        </Text>
      </View>
    );
  };

  if (loading && !group) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  if (error && !group) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text
            style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchGroup()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={segmentData}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSegmentItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGroup(true)}
            tintColor={colors.accent.primary}
          />
        }
      />

      {group?.id && status !== 'completed' && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 16, right: 16 }]}>
          <TouchableOpacity
            style={[
              styles.fab,
              styles.fabPrimary,
              {
                backgroundColor: isReadOnly ? colors.bg.tertiary : colors.accent.primary,
                opacity: isReadOnly ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (!isReadOnly) {
                navigation.navigate('CreateGroupExpense', { groupId });
              }
            }}
            disabled={isReadOnly}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 8 }]}>
              Add Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fab,
              styles.fabSecondary,
              {
                backgroundColor: isReadOnly ? colors.bg.tertiary : colors.bg.glassLight,
                opacity: isReadOnly ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (!isReadOnly) {
                navigation.navigate('CreateSettlement', { groupId });
              }
            }}
            disabled={isReadOnly}
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-horizontal"
              size={22}
              color={isReadOnly ? colors.text.tertiary : colors.text.primary}
            />
            <Text
              style={[
                typography.buttonSmall,
                { color: isReadOnly ? colors.text.tertiary : colors.text.primary, marginLeft: 8 },
              ]}
            >
              Settle Up
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {group?.id && status === 'completed' && (
        <TouchableOpacity
          style={[
            styles.fabSummary,
            { backgroundColor: colors.accent.primary, bottom: insets.bottom + 16 },
          ]}
          onPress={() => navigation.navigate('GroupDashboard', { groupId })}
          activeOpacity={0.8}
        >
          <Ionicons name="stats-chart-outline" size={22} color="#FFFFFF" />
          <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 8 }]}>
            View Summary
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 20,
    paddingTop: 40,
    flex: 1,
  },
  skelBlock: {
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerBadges: {
    flexDirection: 'row',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  balanceSummary: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  gradientCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gradientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceSection: {
    marginTop: 4,
  },
  gradientDivider: {
    height: 1,
  },
  totalSpentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 14,
    padding: 4,
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  expenseCard: {
    marginBottom: 10,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  memberCard: {
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  settlementCard: {
    marginBottom: 10,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settlementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptySegment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inviteSection: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  inviteBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  fabContainer: {
    position: 'absolute',
    flexDirection: 'row',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPrimary: {
    shadowColor: '#f7892c',
  },
  fabSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fabSummary: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
