import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { EmptyState } from './components/EmptyState';

const TABS = ['overview', 'expenses', 'balances', 'members', 'activity'] as const;

function fmt(v: number) {
  return '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function normalize<T>(res: any): T {
  if (!res) {
    return [] as unknown as T;
  }
  if (Array.isArray(res)) {
    return res as T;
  }
  if (res.data && Array.isArray(res.data)) {
    return res.data as T;
  }
  return res as T;
}

export function SharedGroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName: routeGroupName } = route.params || {};

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('overview');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        setError('Missing group');
        setLoading(false);
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
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
        const [groupRes, expensesRes, activityRes] = await Promise.allSettled([
          api.get<any>(`/shared-finance/groups/${groupId}`, ctrl.signal),
          api.get<any>(`/shared-finance/groups/${groupId}/expenses`, ctrl.signal),
          api.get<any>(`/settlements/activity/${groupId}?limit=50`, ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }
        const gData = groupRes.status === 'fulfilled' ? normalize<any>(groupRes.value) : null;
        const eData = expensesRes.status === 'fulfilled' ? normalize<any[]>(expensesRes.value) : [];
        const aData = activityRes.status === 'fulfilled' ? normalize<any[]>(activityRes.value) : [];
        if (groupRes.status === 'rejected' && expensesRes.status === 'rejected') {
          throw new Error('Unable to load data');
        }
        setGroup(gData);
        setExpenses(Array.isArray(eData) ? eData : []);
        setActivityData(Array.isArray(aData) ? aData : []);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (e: any) {
        if (!ctrl.signal.aborted) {
          setError(e.message || 'Unable to load');
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, groupId, fadeAnim],
  );

  useFocusEffect(
    useCallback(() => {
      if (expenses.length === 0 && group === null) {
        setLoading(true);
      }
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const members: any[] = Array.isArray(group?.members) ? group.members : [];
  const type = group?.type || 'default';
  const typeIcon =
    type === 'friends'
      ? 'people'
      : type === 'trip'
        ? 'airplane'
        : type === 'family'
          ? 'home'
          : type === 'couple'
            ? 'heart'
            : type === 'roommates'
              ? 'business'
              : type === 'office'
                ? 'briefcase'
                : type === 'event'
                  ? 'calendar'
                  : type === 'apartment'
                    ? 'building'
                    : 'people';
  const name = group?.name || routeGroupName || 'Group';
  const currentMember = members.find((m: any) => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin' || group?.createdBy === currentUser?.id;

  const stats = useMemo(() => {
    const now = new Date();
    const monthly = expenses.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalAmount = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthlyAmount = monthly.reduce((s, t) => s + Number(t.amount || 0), 0);
    const pendingSettlements =
      (group?.pendingSettlements ?? members.length > 1) ? members.length - 1 : 0;
    const count = expenses.length;
    const monthlyAvg =
      count > 0
        ? (totalAmount /
            Math.max(
              count > 1
                ? Math.ceil(
                    (new Date(expenses[0]?.createdAt || Date.now()).getTime() -
                      new Date(expenses[expenses.length - 1]?.createdAt || Date.now()).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : 1,
              1,
            )) *
          30
        : 0;
    return {
      totalSpent: totalAmount,
      totalTransactions: count,
      pendingSettlements,
      monthlyAverage: monthlyAvg || monthlyAmount,
      monthlySpending: monthlyAmount,
    };
  }, [expenses, group, members.length]);

  const balanceRows = useMemo(() => {
    if (members.length === 0) {
      return [];
    }
    const total = stats.totalSpent;
    const share = total / Math.max(members.length, 1);
    return members.map((member: any) => {
      const paid = expenses
        .filter((tx) => tx.paidBy === member.userId)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      return {
        id: member.id,
        userId: member.userId,
        name: member.user?.firstName || member.user?.email || 'Member',
        paid,
        balance: paid - share,
        email: member.user?.email,
        upiId: member.user?.upiId || member.user?.email,
      };
    });
  }, [members, stats.totalSpent, expenses]);

  const activity = useMemo(() => {
    const iconMap: Record<string, string> = {
      expense_added: 'receipt-outline',
      member_joined: 'person-add-outline',
      settlement_requested: 'swap-horizontal-outline',
      settlement_confirmed: 'checkmark-circle-outline',
      guest_added_expense: 'person-outline',
      payment_completed: 'cash-outline',
      guest_approved: 'shield-checkmark-outline',
    };
    const apiActivity = activityData.map((a: any) => ({
      id: a.id,
      title: a.description,
      detail: `${a.userName} · ${new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      date: a.createdAt,
      icon: (iconMap[a.action] || 'ellipse-outline') as any,
      type: a.action as any,
    }));
    const expenseActivity = expenses.slice(0, 20).map((tx) => ({
      id: tx.id,
      title: 'Expense added',
      detail: `${tx.description || tx.category || 'Expense'} · ${fmt(Number(tx.amount || 0))}`,
      date: tx.createdAt || tx.date,
      icon: 'receipt-outline' as const,
      type: 'expense' as const,
    }));
    const memberActivity = members.slice(0, 10).map((member: any) => ({
      id: `member-${member.id}`,
      title: 'Member joined',
      detail: member.user?.firstName || member.user?.email || 'Member',
      date: member.addedAt || member.joinedAt,
      icon: 'person-add-outline' as const,
      type: 'member' as const,
    }));
    return [...apiActivity, ...expenseActivity, ...memberActivity]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activityData, expenses, members]);

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.loadWrap, { paddingTop: insets.top + 14 }]}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 }}
          >
            <Skeleton width={38} height={38} borderRadius={12} />
            <Skeleton width={52} height={52} borderRadius={16} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="30%" height={12} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 18 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} style={{ flex: 1 }} width="100%" height={80} borderRadius={18} />
            ))}
          </View>
          <View style={{ marginTop: 20, paddingHorizontal: 20, gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={60} borderRadius={16} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          s.screen,
          {
            backgroundColor: colors.bg.primary,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top,
          },
        ]}
      >
        <Text style={[s.errText, { color: colors.text.primary }]}>{error}</Text>
        <TouchableOpacity
          style={[s.retry, { backgroundColor: colors.accent.primary }]}
          onPress={() => loadData()}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderOverview() {
    return (
      <View style={s.tabPanel}>
        <View style={[s.infoCard, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[s.infoTitle, { color: colors.text.primary }]}>
            {group?.description || 'No description added'}
          </Text>
          {group?.description ? null : (
            <Text style={[s.infoSub, { color: colors.text.tertiary }]}>
              Add a description in group settings
            </Text>
          )}
        </View>

        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>This Month's Spending</Text>
        <View style={[s.monthlyCard, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[s.monthlyAmount, { color: colors.text.primary }]}>
            {fmt(stats.monthlySpending)}
          </Text>
          <Text style={[s.monthlyLabel, { color: colors.text.tertiary }]}>
            {stats.totalTransactions} transactions this month
          </Text>
        </View>

        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Category Breakdown</Text>
        <View style={s.chipRow}>
          {['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment'].map((cat) => {
            const amt = expenses
              .filter((e) => (e.category || 'Other').toLowerCase() === cat.toLowerCase())
              .reduce((s, e) => s + Number(e.amount || 0), 0);
            if (amt === 0) {
              return null;
            }
            return (
              <View
                key={cat}
                style={[s.categoryChip, { backgroundColor: `${colors.accent.primary}15` }]}
              >
                <Text style={[s.categoryChipText, { color: colors.accent.primary }]}>
                  {cat} · {fmt(amt)}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Insights</Text>
        <View style={[s.insightCard, { backgroundColor: `${colors.status.info}12` }]}>
          <Ionicons name="bulb-outline" size={20} color={colors.status.info} />
          <View style={{ flex: 1 }}>
            <Text style={[s.insightTitle, { color: colors.text.primary }]}>Spending Pattern</Text>
            <Text style={[s.insightText, { color: colors.text.tertiary }]}>
              {stats.totalSpent > 0
                ? `Average of ${fmt(Math.round(stats.totalSpent / Math.max(stats.totalTransactions, 1)))} per transaction`
                : 'No spending data yet'}
            </Text>
          </View>
        </View>
        {balanceRows.length > 0 && (
          <View style={[s.insightCard, { backgroundColor: `${colors.status.success}12` }]}>
            <Ionicons name="cash-outline" size={20} color={colors.status.success} />
            <View style={{ flex: 1 }}>
              <Text style={[s.insightTitle, { color: colors.text.primary }]}>
                Settlement Status
              </Text>
              <Text style={[s.insightText, { color: colors.text.tertiary }]}>
                {balanceRows.filter((r) => r.balance < 0).length} member
                {balanceRows.filter((r) => r.balance < 0).length !== 1 ? 's' : ''} need to settle up
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  function renderExpenseItem(item: any) {
    const payer = members.find((m: any) => m.userId === item.paidBy);
    const payerName = payer?.user?.firstName || payer?.user?.email || 'Someone';
    const date = new Date(item.date || item.createdAt || '');
    const splitType = item.splitType || 'equal';
    const category = item.category || 'Other';
    return (
      <TouchableOpacity
        style={[s.expenseCard, { backgroundColor: colors.bg.secondary }]}
        onPress={() =>
          navigation.navigate('SharedExpenseForm', {
            groupId,
            expenseId: item.id,
            edit: true,
          })
        }
        activeOpacity={0.8}
      >
        <LinearGradient colors={[...colors.accent.gradientAlt]} style={s.expenseAvatar}>
          <Text style={s.expenseAvatarText}>{payerName[0]?.toUpperCase() || '?'}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={s.expenseTop}>
            <Text style={[s.expenseDesc, { color: colors.text.primary }]} numberOfLines={1}>
              {item.description || category}
            </Text>
            <Text style={[s.expenseAmount, { color: colors.text.primary }]}>
              {fmt(Number(item.amount || 0))}
            </Text>
          </View>
          <View style={s.expenseBottom}>
            <Text style={[s.expenseMeta, { color: colors.text.tertiary }]}>{payerName}</Text>
            {!isNaN(date.getTime()) && (
              <Text style={[s.expenseMeta, { color: colors.text.tertiary }]}>
                {date.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            )}
          </View>
          <View style={s.expenseTags}>
            <View style={[s.splitBadge, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Text style={[s.splitBadgeText, { color: colors.accent.primary }]}>
                {splitType.charAt(0).toUpperCase() + splitType.slice(1)}
              </Text>
            </View>
            <View style={[s.catBadge, { backgroundColor: `${colors.status.info}15` }]}>
              <Text style={[s.catBadgeText, { color: colors.status.info }]}>{category}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderBalances() {
    if (members.length === 0) {
      return (
        <View style={s.tabPanel}>
          <EmptyState
            icon="cash-outline"
            title="No members"
            message="Add members to see balances"
          />
        </View>
      );
    }
    return (
      <View style={s.tabPanel}>
        {balanceRows.map((row) => {
          const owes = row.balance < 0;
          const currentUserOwes = owes && row.userId !== currentUser?.id;
          return (
            <View key={row.id} style={[s.balanceCard, { backgroundColor: colors.bg.secondary }]}>
              <LinearGradient colors={[...colors.accent.gradient]} style={s.balanceAvatar}>
                <Text style={s.balanceAvatarText}>{row.name[0]?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.balanceName, { color: colors.text.primary }]}>{row.name}</Text>
                <Text style={[s.balanceStatus, { color: colors.text.tertiary }]}>
                  Paid {fmt(row.paid)}
                </Text>
              </View>
              <Text
                style={[
                  s.balanceAmount,
                  {
                    color: row.balance >= 0 ? colors.status.success : colors.status.error,
                  },
                ]}
              >
                {row.balance >= 0 ? 'Gets ' : 'Owes '}
                {fmt(Math.abs(row.balance))}
              </Text>
              {currentUserOwes && (
                <TouchableOpacity
                  style={[s.settleBtn, { backgroundColor: colors.status.success }]}
                  onPress={() => {
                    const upiLink = `upi://pay?pa=${encodeURIComponent(row.upiId || row.email || '')}&pn=${encodeURIComponent(row.name)}&am=${Math.abs(row.balance)}&cu=INR&tn=Settling%20via%20Dabbu`;
                    Linking.openURL(upiLink).catch(() =>
                      Alert.alert(
                        'Unable to open UPI',
                        'No UPI app found. Please try GPay, PhonePe, or Paytm.',
                      ),
                    );
                  }}
                >
                  <Text style={s.settleBtnText}>Settle Up</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  function renderMembers() {
    if (members.length === 0) {
      return (
        <View style={s.tabPanel}>
          <EmptyState
            icon="people-outline"
            title="No members"
            message="Invite members to get started"
            actionLabel="Invite Members"
            onAction={() => {}}
          />
        </View>
      );
    }
    return (
      <View style={s.tabPanel}>
        {members.map((member: any) => {
          const role = member.role || 'member';
          const isMemberCurrentUser = member.userId === currentUser?.id;
          return (
            <TouchableOpacity
              key={member.id}
              style={[s.memberCard, { backgroundColor: colors.bg.secondary }]}
              onLongPress={() => {
                if (!isAdmin || isMemberCurrentUser) {
                  return;
                }
                Alert.alert(member.user?.firstName || 'Member', 'Choose action', [
                  {
                    text: role === 'admin' ? 'Make Member' : 'Make Admin',
                    onPress: () => changeMemberRole(member, role === 'admin' ? 'member' : 'admin'),
                  },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => removeMember(member),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
              activeOpacity={0.7}
            >
              <LinearGradient colors={[...colors.accent.gradient]} style={s.memberAvatar}>
                <Text style={s.memberAvatarText}>
                  {(member.user?.firstName?.[0] || member.firstName?.[0] || '?').toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.memberName, { color: colors.text.primary }]}>
                  {member.user?.firstName || member.user?.email || member.firstName || 'Member'}
                  {isMemberCurrentUser ? ' (You)' : ''}
                </Text>
              </View>
              <View
                style={[
                  s.roleBadge,
                  {
                    backgroundColor:
                      role === 'admin' ? `${colors.accent.primary}18` : `${colors.text.tertiary}18`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.roleBadgeText,
                    {
                      color: role === 'admin' ? colors.accent.primary : colors.text.tertiary,
                    },
                  ]}
                >
                  {role === 'admin' ? 'Admin' : 'Member'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  async function changeMemberRole(member: any, role: 'admin' | 'member') {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/shared-finance/groups/${groupId}/members/${member.id}/role`, {
        role,
      });
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update role');
    }
  }

  async function removeMember(member: any) {
    Alert.alert(
      'Remove Member',
      `Remove ${member.user?.firstName || 'this member'} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (accessToken) {
                setAccessToken(accessToken);
              }
              await api.delete(`/shared-finance/groups/${groupId}/members/${member.id}`);
              await loadData(true);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to remove member');
            }
          },
        },
      ],
    );
  }

  function renderActivity() {
    if (activity.length === 0) {
      return (
        <View style={s.tabPanel}>
          <EmptyState
            icon="timer-outline"
            title="No activity yet"
            message="Expenses and member changes will appear here"
          />
        </View>
      );
    }
    return (
      <View style={s.tabPanel}>
        {activity.map((item) => (
          <View key={item.id} style={s.activityRow}>
            <View style={[s.activityIcon, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name={item.icon as any} size={16} color={colors.accent.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.activityTitle, { color: colors.text.primary }]}>{item.title}</Text>
              <Text style={[s.activityDetail, { color: colors.text.tertiary }]}>{item.detail}</Text>
            </View>
            {item.date && (
              <Text style={[s.activityDate, { color: colors.text.tertiary }]}>
                {new Date(item.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={activeTab === 'expenses' ? expenses : []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          activeTab === 'expenses' && expenses.length === 0
            ? s.emptyContainer
            : { paddingBottom: insets.bottom + 96 }
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.headerRow, { paddingTop: insets.top + 14 }]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[s.iconBtn, { backgroundColor: colors.bg.glassLight }]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
              </TouchableOpacity>
              <LinearGradient colors={[...colors.accent.gradient]} style={s.avatar}>
                <Ionicons name={typeIcon as any} size={24} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.groupName, { color: colors.text.primary }]} numberOfLines={1}>
                  {name}
                </Text>
                <View style={s.groupMetaRow}>
                  <Text style={[s.groupMeta, { color: colors.text.tertiary }]}>
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </Text>
                  <View style={[s.typeBadge, { backgroundColor: `${colors.accent.primary}20` }]}>
                    <Text style={[s.typeBadgeText, { color: colors.accent.primary }]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.bg.glassLight }]}
                onPress={() => navigation.navigate('SharedGroupSettings', { groupId })}
              >
                <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.statsRow}
            >
              <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Total Spent</Text>
                <Text style={[s.statValue, { color: colors.text.primary }]}>
                  {fmt(stats.totalSpent)}
                </Text>
              </LinearGradient>
              <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Transactions</Text>
                <Text style={[s.statValue, { color: colors.text.primary }]}>
                  {stats.totalTransactions}
                </Text>
              </LinearGradient>
              <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Pending</Text>
                <Text style={[s.statValue, { color: colors.status.warning }]}>
                  {stats.pendingSettlements}
                </Text>
              </LinearGradient>
              <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Monthly Avg</Text>
                <Text style={[s.statValue, { color: colors.text.primary }]}>
                  {fmt(Math.round(stats.monthlyAverage))}
                </Text>
              </LinearGradient>
            </ScrollView>

            <View style={s.quickActions}>
              <TouchableOpacity
                style={[s.quickAction, { backgroundColor: colors.accent.primary }]}
                onPress={() =>
                  navigation.navigate('SharedExpenseForm', {
                    groupId,
                    edit: false,
                  })
                }
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={s.quickActionText}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.quickAction, { backgroundColor: colors.status.success }]}
                onPress={() => navigation.navigate('Settlement', { groupId })}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color="#FFF" />
                <Text style={s.quickActionText}>Settle Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.quickAction, { backgroundColor: `${colors.text.tertiary}40` }]}
                onPress={() => setActiveTab('members')}
              >
                <Ionicons name="people-outline" size={18} color="#FFF" />
                <Text style={s.quickActionText}>Members</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.featureRow}
            >
              <TouchableOpacity
                style={[
                  s.featureCard,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
                onPress={() => navigation.navigate('GroupWallet', { groupId })}
              >
                <LinearGradient
                  colors={[`${colors.accent.primary}20`, `${colors.accent.primary}08`]}
                  style={s.featureIcon}
                >
                  <Ionicons name="wallet" size={18} color={colors.accent.primary} />
                </LinearGradient>
                <Text style={[s.featureLabel, { color: colors.text.primary }]}>Wallets</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.featureCard,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
                onPress={() => navigation.navigate('SplitTemplates', { groupId })}
              >
                <LinearGradient
                  colors={[`${colors.status.success}20`, `${colors.status.success}08`]}
                  style={s.featureIcon}
                >
                  <Ionicons name="documents" size={18} color={colors.status.success} />
                </LinearGradient>
                <Text style={[s.featureLabel, { color: colors.text.primary }]}>Splits</Text>
              </TouchableOpacity>
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tabRow}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    s.tabChip,
                    activeTab === tab
                      ? { backgroundColor: colors.accent.primary }
                      : { backgroundColor: colors.bg.tertiary },
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      s.tabText,
                      {
                        color: activeTab === tab ? '#FFF' : colors.text.secondary,
                      },
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'balances' && renderBalances()}
            {activeTab === 'members' && renderMembers()}
            {activeTab === 'activity' && renderActivity()}

            {activeTab === 'expenses' && expenses.length > 0 && (
              <Text
                style={[
                  s.secTitle,
                  {
                    color: colors.text.tertiary,
                    paddingHorizontal: 24,
                    paddingTop: 20,
                    paddingBottom: 8,
                  },
                ]}
              >
                All Expenses
              </Text>
            )}
          </Animated.View>
        }
        renderItem={({ item }) => renderExpenseItem(item)}
        ListEmptyComponent={
          activeTab === 'expenses' ? (
            <View style={s.tabPanel}>
              <EmptyState
                icon="receipt-outline"
                title="No expenses yet"
                message="Add your first expense to start tracking"
                actionLabel="Add Expense"
                onAction={() =>
                  navigation.navigate('SharedExpenseForm', {
                    groupId,
                    edit: false,
                  })
                }
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  loadWrap: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingTop: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { fontSize: 20, fontWeight: '700' },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  groupMeta: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  statsRow: { paddingHorizontal: 20, gap: 10, marginTop: 18, paddingBottom: 4 },
  statCard: {
    width: 120,
    padding: 14,
    borderRadius: 18,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  quickActionText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  featureRow: { paddingHorizontal: 20, gap: 10, marginTop: 16 },
  featureCard: {
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { fontSize: 12, fontWeight: '700' },
  tabRow: { paddingHorizontal: 20, gap: 8, paddingTop: 20, paddingBottom: 6 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  tabText: { fontSize: 12, fontWeight: '700' },
  tabPanel: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  secTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  infoCard: { borderRadius: 18, padding: 16 },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoSub: { fontSize: 12, marginTop: 6 },
  monthlyCard: { borderRadius: 18, padding: 16 },
  monthlyAmount: { fontSize: 28, fontWeight: '800' },
  monthlyLabel: { fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600' },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightText: { fontSize: 12, marginTop: 2 },
  expenseCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    gap: 12,
  },
  expenseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  expenseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseDesc: { fontSize: 14, fontWeight: '600', flex: 1 },
  expenseAmount: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  expenseBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  expenseMeta: { fontSize: 11 },
  expenseTags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  splitBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  splitBadgeText: { fontSize: 10, fontWeight: '700' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  balanceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  balanceName: { fontSize: 14, fontWeight: '700' },
  balanceStatus: { fontSize: 12, marginTop: 2 },
  balanceAmount: { fontSize: 14, fontWeight: '800' },
  settleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  settleBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  memberName: { fontSize: 14, fontWeight: '600' },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { fontSize: 14, fontWeight: '600' },
  activityDetail: { fontSize: 12, marginTop: 2 },
  activityDate: { fontSize: 11 },
  errText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retry: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
