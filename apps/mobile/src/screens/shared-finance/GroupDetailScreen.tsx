import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { api, setAccessToken } from '../../services/api';
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

const GROUP_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount || 0));
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatMemberName = (member?: any) => {
  if (!member) return '';
  if (member.name) return member.name;
  if (!member.user) return '';
  return `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim();
};

function MoneyLoader() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.65)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.65, duration: 650, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(lift, { toValue: -8, duration: 650, useNativeDriver: true }),
          Animated.timing(lift, { toValue: 0, duration: 650, useNativeDriver: true }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [lift, pulse]);

  return (
    <View style={styles.moneyLoader}>
      <Animated.View
        style={[
          styles.moneyCoin,
          {
            backgroundColor: colors.accent.primary,
            opacity: pulse,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <Text style={styles.moneyCoinText}>₹</Text>
      </Animated.View>
      <Text style={[styles.moneyLoadingTitle, { color: colors.text.primary }]}>Loading money moves</Text>
      <Text style={[styles.moneyLoadingText, { color: colors.text.tertiary }]}>Getting group expenses ready</Text>
    </View>
  );
}

export function GroupDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string; inviteCode?: string } }, 'params'>>();
  const groupId = route.params?.groupId;
  const inviteCode = route.params?.inviteCode;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<Segments>('expenses');
  const [showRevokedModal, setShowRevokedModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [invitingExternal, setInvitingExternal] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef(0);

  const { status, accessRevoked, revocationReason, isReadOnly } = useGroupLifecycle({
    groupId: groupId || '',
    onAccessRevoked: () => setShowRevokedModal(true),
  });

  const normalizeResponseList = (result: PromiseSettledResult<any>): any[] => {
    if (result.status !== 'fulfilled') return [];
    const payload = result.value;
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const fetchGroup = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        setError('Invalid group identifier');
        setGroup(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;
      const requestId = ++latestRequestRef.current;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }

        const groupResponse = await api.get<any>(`/shared-finance/groups/${groupId}`, signal);
        if (signal.aborted || requestId !== latestRequestRef.current) {
          return;
        }

        const groupData = groupResponse.data ?? groupResponse;
        if (!groupData) {
          setError('Group not found');
          setGroup(null);
          return;
        }

        const [expensesResult, settlementsResult] =
          Array.isArray(groupData.expenses) || Array.isArray(groupData.settlements)
            ? [
                { status: 'fulfilled', value: groupData.expenses || [] },
                { status: 'fulfilled', value: groupData.settlements || [] },
              ] as PromiseSettledResult<any>[]
            : await Promise.allSettled([
                api.get<any[]>(`/shared-finance/groups/${groupId}/expenses?limit=50`, signal),
                api.get<any[]>(`/shared-finance/groups/${groupId}/settlements?limit=50`, signal),
              ]);

        if (signal.aborted || requestId !== latestRequestRef.current) {
          return;
        }

        const rawMembers = Array.isArray(groupData.members) ? groupData.members : [];
        const rawBalances = Array.isArray(groupData.balances) ? groupData.balances : [];
        const currentUserId = user?.id || groupData.ownerId;
        const myBalance = rawBalances.find((balance: any) => balance?.userId === currentUserId) ?? {};
        const totalSpent = rawBalances.reduce((sum: number, item: any) => sum + Number(item?.totalPaid ?? 0), 0);

        const transformedGroup: GroupDetail = {
          id: groupData.id,
          name: groupData.name,
          type: groupData.type,
          description: groupData.description,
          memberCount: groupData._count?.members || rawMembers.length || 0,
          inviteCode: groupData.inviteCode || inviteCode,
          totalSpent,
          balance: Number(myBalance?.netBalance ?? 0),
          currency: groupData.currency || 'INR',
          isPremium: groupData.isPremium,
          planLimit: groupData.planLimit,
          members: rawMembers.map((member: any) => ({
            id: member.id,
            name: member.user
              ? `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim()
              : member.name || 'Unknown',
            email: member.user?.email || '',
            role: member.role,
            balance: Number(rawBalances.find((balance: any) => balance?.memberId === member.id)?.netBalance ?? 0),
          })),
          expenses: normalizeResponseList(expensesResult).map((expense: any) => ({
            id: expense.id,
            description: expense.description,
            amount: Number(expense.amount ?? 0),
            paidBy: {
              id: expense.paidBy?.id || expense.paidByMemberId || '',
              name: expense.paidBy?.user
                ? `${expense.paidBy.user.firstName ?? ''} ${expense.paidBy.user.lastName ?? ''}`.trim()
                : expense.paidBy?.name || expense.paidByName || 'Unknown',
            },
            date: expense.date || expense.createdAt,
            splitType: expense.splitType || 'equal',
            category: expense.category,
          })),
          settlements: normalizeResponseList(settlementsResult).map((settlement: any) => ({
            id: settlement.id,
            from: {
              id: settlement.from?.id || settlement.fromMember?.id || settlement.fromMemberId || '',
              name: settlement.from?.name || settlement.fromName || formatMemberName(settlement.fromMember) || 'Unknown',
            },
            to: {
              id: settlement.to?.id || settlement.toMember?.id || settlement.toMemberId || '',
              name: settlement.to?.name || settlement.toName || formatMemberName(settlement.toMember) || 'Unknown',
            },
            amount: Number(settlement.amount ?? 0),
            status: settlement.status || 'pending',
            date: settlement.date || settlement.createdAt,
          })),
        };

        setGroup(transformedGroup);
      } catch (fetchError: any) {
        if (!signal.aborted) {
          setError(fetchError?.message || 'Unable to load group.');
          setGroup(null);
        }
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, groupId, inviteCode, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      fetchGroup();
      return () => abortControllerRef.current?.abort();
    }, [fetchGroup]),
  );

  const handleInviteExternal = useCallback(async () => {
    if (!groupId) return;
    setInvitingExternal(true);
    try {
      const response = await createInviteLink(groupId);
      const url = `https://external-web.vercel.app//invite/${response.token}`;
      await Share.share({ message: `Join my group "${group?.name || 'my group'}" on Dabbu! ${url}` });
    } catch (inviteError: any) {
      Alert.alert('Unable to share invite', inviteError?.message || 'Please try again.');
    } finally {
      setInvitingExternal(false);
    }
  }, [group, groupId]);

  const isAdmin = useMemo(
    () => group?.members.some((member) => member.role === 'owner' || member.role === 'admin') ?? false,
    [group],
  );

  const config = group ? GROUP_TYPE_CONFIG[group.type] || GROUP_TYPE_CONFIG.friends : GROUP_TYPE_CONFIG.friends;
  const isOwed = (group?.balance ?? 0) >= 0;

  const segmentData = useMemo(() => {
    if (!group) return [];
    if (activeSegment === 'balances') return group.members;
    if (activeSegment === 'settlements') return group.settlements;
    return group.expenses;
  }, [activeSegment, group]);

  const stats = useMemo(() => {
    if (!group) return { total: 0, categorized: 0, pending: 0, thisMonth: 0 };
    const now = new Date();
    const thisMonth = group.expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return {
      total: group.expenses.length,
      categorized: group.expenses.filter((expense) => Boolean(expense.category)).length,
      pending: group.settlements.filter((settlement) => settlement.status !== 'completed').length,
      thisMonth,
    };
  }, [group]);

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const iconName = SPLIT_TYPE_ICONS[item.splitType] || 'receipt-outline';
    return (
      <Card variant="elevated" padding="lg" style={styles.listCard} onPress={() => navigation.navigate('GroupExpenseDetail', { groupId, expenseId: item.id })}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.bg.tertiary }]}> 
            <Ionicons name={iconName} size={18} color={colors.accent.primary} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>{item.description}</Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>{formatDate(item.date)} · Paid by {item.paidBy.name}</Text>
          </View>
          <Text style={[styles.amountText, { color: colors.text.primary }]}>{formatAmount(item.amount, group?.currency)}</Text>
        </View>
      </Card>
    );
  };

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const owed = item.balance >= 0;
    const badgeColor = owed ? colors.status.success : colors.status.error;
    return (
      <Card variant="elevated" padding="lg" style={styles.listCard}>
        <View style={styles.row}>
          <View style={[styles.avatarCircle, { backgroundColor: config.color + '20' }]}> 
            <Text style={[styles.avatarText, { color: config.color }]}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.itemContent}>
            <View style={styles.memberTitleRow}>
              <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
              {item.role !== 'member' && (
                <View style={[styles.roleBadge, { backgroundColor: badgeColor + '15' }]}>
                  <Text style={[styles.roleBadgeText, { color: badgeColor }]}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
                </View>
              )}
            </View>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]} numberOfLines={1}>{item.email}</Text>
          </View>
          <Text style={[styles.amountText, { color: owed ? colors.status.success : colors.status.error }]}>{owed ? '+' : '-'}{formatAmount(item.balance, group?.currency)}</Text>
        </View>
      </Card>
    );
  };

  const renderSettlementItem = ({ item }: { item: Settlement }) => {
    const isCompleted = item.status === 'completed';
    return (
      <Card variant="elevated" padding="lg" style={styles.listCard}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: isCompleted ? colors.status.successLight : colors.status.warningLight }]}> 
            <Ionicons name={isCompleted ? 'checkmark-circle' : 'time-outline'} size={20} color={isCompleted ? colors.status.success : colors.status.warning} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>{item.from.name} → {item.to.name}</Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.settlementRight}> 
            <Text style={[typography.callout, { color: colors.text.primary }]}>{formatAmount(item.amount, group?.currency)}</Text>
            <View style={[styles.statusPill, { backgroundColor: isCompleted ? colors.status.successLight : colors.status.warningLight }]}> 
              <Text style={[styles.statusPillText, { color: isCompleted ? colors.status.success : colors.status.warning }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderSegmentItem = ({ item }: { item: any }) => {
    if (activeSegment === 'balances') return renderMemberItem({ item });
    if (activeSegment === 'settlements') return renderSettlementItem({ item });
    return renderExpenseItem({ item });
  };

  const renderListHeader = () => (
    <>
      <GroupStatusBanner
        status={status}
        groupName={group?.name || ''}
        isAdmin={isAdmin}
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
        onUpgrade={() => navigation.navigate('Subscription')}
        groupName={group?.name}
        currentLimit={group?.planLimit || 2}
        premiumLimit={30}
      />

      <View style={styles.headerRow}> 
        <View style={styles.headerLeft}> 
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}> 
            <Text style={[typography.h2, { color: colors.text.primary }]} numberOfLines={1}>{group?.name}</Text>
            <View style={styles.badgeRow}> 
              <View style={[styles.badge, { backgroundColor: config.color + '20' }]}> 
                <Ionicons name={config.icon} size={12} color={config.color} />
                <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.bg.tertiary }]}> 
                <Ionicons name="people-outline" size={12} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary }]}>{group?.memberCount} members</Text>
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

      <View style={styles.balanceCard}> 
        <LinearGradient colors={[config.color + '30', colors.bg.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceGradient}>
          <View style={styles.balanceTypeRow}> 
            <View style={[styles.typeBadge, { backgroundColor: config.color + '25' }]}> 
              <Ionicons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.sm }]} numberOfLines={1}>{group?.name}</Text>
          <Text style={[typography.amountLarge, { color: isOwed ? colors.status.success : colors.status.error, marginTop: spacing.sm }]}>
            {isOwed ? '+' : '-'}{formatAmount(group?.balance ?? 0, group?.currency)}
          </Text>
          <Text style={[typography.footnote, { color: colors.text.tertiary, marginTop: spacing.xs }]}> {isOwed ? 'You are owed' : 'You owe'} </Text>
          <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.md }]} />
          <View style={styles.totalRow}> 
            <Text style={[typography.footnote, { color: colors.text.secondary }]}>Total spent</Text>
            <Text style={[typography.callout, { color: colors.text.primary, fontWeight: '600' }]}>{formatAmount(group?.totalSpent ?? 0, group?.currency)}</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={[styles.inviteContainer, { backgroundColor: colors.accent.primary + '12', borderColor: colors.accent.primary + '30' }]}> 
        <TouchableOpacity style={styles.inviteButton} onPress={handleInviteExternal} disabled={invitingExternal} activeOpacity={0.8}>
          {invitingExternal ? (
            <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
          )}
          <Text style={[styles.inviteText, { color: colors.accent.primary }]}>
            {invitingExternal ? 'Preparing link...' : 'Share invite link'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.segmentControl, { backgroundColor: colors.bg.tertiary }]}> 
        {([
          { key: 'expenses', label: 'Expenses', icon: 'receipt-outline' },
          { key: 'balances', label: 'Balances', icon: 'people-outline' },
          { key: 'settlements', label: 'Settlements', icon: 'swap-horizontal-outline' },
        ] as const).map((segment) => {
          const active = activeSegment === segment.key;
          return (
            <TouchableOpacity
              key={segment.key}
              style={[styles.segmentButton, active && { backgroundColor: colors.bg.elevated, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 4, elevation: 4 }]}
              onPress={() => setActiveSegment(segment.key)}
            >
              <Ionicons name={segment.icon} size={16} color={active ? colors.accent.primary : colors.text.tertiary} />
              <Text style={[styles.segmentText, { color: active ? colors.accent.primary : colors.text.tertiary }]}> {segment.label} </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.statsRow}> 
        {[
          { label: 'Total', value: stats.total, color: colors.accent.primary },
          { label: 'Categorized', value: stats.categorized, color: colors.status.success },
          { label: 'Pending', value: stats.pending, color: colors.status.warning },
          { label: 'This Month', value: stats.thisMonth, color: colors.text.secondary },
        ].map((item) => (
          <View key={item.label} style={[styles.statCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}> 
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </>
  );

  const renderEmpty = () => {
    const emptyTitle = activeSegment === 'expenses'
      ? 'No expenses yet'
      : activeSegment === 'balances'
        ? 'No members yet'
        : 'No settlements yet';
    const emptyIcon = activeSegment === 'expenses' ? 'receipt-outline' : activeSegment === 'balances' ? 'people-outline' : 'swap-horizontal-outline';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={emptyIcon} size={40} color={colors.text.tertiary} />
        <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: 16 }]}>{emptyTitle}</Text>
      </View>
    );
  };

  if (loading && !group) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg.primary }]}> 
        <MoneyLoader />
      </SafeAreaView>
    );
  }

  if (error && !group) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg.primary }]}> 
        <View style={styles.errorView}>
          <Ionicons name="cloud-offline-outline" size={46} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: 16 }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent.primary }]} onPress={() => fetchGroup()}>
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg.primary }]}> 
      <FlatList
        data={segmentData}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSegmentItem}
        ListHeaderComponent={group ? renderListHeader : null}
        ListEmptyComponent={renderEmpty}
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
        <View style={[styles.fabWrapper, { bottom: insets.bottom + 16 }]}> 
          <TouchableOpacity
            style={[styles.fabButton, styles.fabPrimary, { backgroundColor: isReadOnly ? colors.bg.tertiary : colors.accent.primary, opacity: isReadOnly ? 0.5 : 1 }]}
            onPress={() => {
              if (!isReadOnly) navigation.navigate('CreateGroupExpense', { groupId });
            }}
            disabled={isReadOnly}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 8 }]}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, styles.fabSecondary, { backgroundColor: isReadOnly ? colors.bg.tertiary : colors.bg.glassLight, opacity: isReadOnly ? 0.5 : 1 }]}
            onPress={() => {
              if (!isReadOnly) navigation.navigate('CreateSettlement', { groupId });
            }}
            disabled={isReadOnly}
          >
            <Ionicons name="swap-horizontal" size={22} color={isReadOnly ? colors.text.tertiary : colors.text.primary} />
            <Text style={[typography.buttonSmall, { color: isReadOnly ? colors.text.tertiary : colors.text.primary, marginLeft: 8 }]}>Settle Up</Text>
          </TouchableOpacity>
        </View>
      )}

      {group?.id && status === 'completed' && (
        <TouchableOpacity
          style={[styles.summaryButton, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 16 }]}
          onPress={() => navigation.navigate('GroupDashboard', { groupId })}
        >
          <Ionicons name="stats-chart-outline" size={22} color="#FFFFFF" />
          <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 8 }]}>View Summary</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  moneyLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  moneyCoin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  moneyCoinText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
  },
  moneyLoadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  moneyLoadingText: {
    fontSize: 13,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  balanceCard: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  balanceGradient: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  balanceTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inviteText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 14,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  listCard: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  fabWrapper: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPrimary: {
    backgroundColor: '#3B82F6',
  },
  fabSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  summaryButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  errorView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
