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
  Alert,
  Linking,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
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
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [activeStatPage, setActiveStatPage] = useState(0);

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

  const topCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => {
      const c = (e.category || 'Other').toLowerCase();
      cats[c] = (cats[c] || 0) + Number(e.amount || 0);
    });
    const entries = Object.entries(cats).sort(([, a], [, b]) => b - a);
    return entries.length > 0 ? entries[0][0].charAt(0).toUpperCase() + entries[0][0].slice(1) : 'None';
  }, [expenses]);

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

  const myBalanceRow = balanceRows.find(r => r.userId === currentUser?.id);
  const windowWidth = Dimensions.get('window').width;

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

  const groupedActivity = useMemo(() => {
    const groups: { title: string; data: any[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let currentTitle = '';
    let currentItems: any[] = [];
    activity.forEach((item) => {
      const d = new Date(item.date);
      d.setHours(0, 0, 0, 0);
      let title: string;
      if (d.getTime() === today.getTime()) title = 'Today';
      else if (d.getTime() === yesterday.getTime()) title = 'Yesterday';
      else title = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (title !== currentTitle) {
        if (currentItems.length > 0) groups.push({ title: currentTitle, data: [...currentItems] });
        currentTitle = title;
        currentItems = [];
      }
      currentItems.push(item);
    });
    if (currentItems.length > 0) groups.push({ title: currentTitle, data: currentItems });
    return groups;
  }, [activity]);

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.loadWrap, { paddingTop: insets.top + 8 }]}>
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

        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Financial Summary</Text>
        <View style={[s.finSumCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={[s.finSumRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}>
            <Text style={[s.finSumLabel, { color: colors.text.tertiary }]}>All-time Total</Text>
            <Text style={[s.finSumValue, { color: colors.text.primary }]}>{fmt(stats.totalSpent)}</Text>
          </View>
          <View style={[s.finSumRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}>
            <Text style={[s.finSumLabel, { color: colors.text.tertiary }]}>Per Person</Text>
            <Text style={[s.finSumValue, { color: colors.text.primary }]}>{fmt(Math.round(stats.totalSpent / Math.max(members.length, 1)))}</Text>
          </View>
          <View style={[s.finSumRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}>
            <Text style={[s.finSumLabel, { color: colors.text.tertiary }]}>Per Transaction</Text>
            <Text style={[s.finSumValue, { color: colors.text.primary }]}>{fmt(Math.round(stats.totalSpent / Math.max(stats.totalTransactions, 1)))}</Text>
          </View>
          <View style={[s.finSumRow, { borderBottomWidth: 0 }]}>
            <Text style={[s.finSumLabel, { color: colors.text.tertiary }]}>Top Category</Text>
            <Text style={[s.finSumValue, { color: colors.accent.primary }]}>{topCategory}</Text>
          </View>
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

        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Balances</Text>
        <View style={[s.finSumCard, { backgroundColor: colors.bg.secondary, padding: 0 }]}>
          {balanceRows.length === 0 && (
            <View style={{ padding: 16 }}>
              <Text style={[s.finSumLabel, { color: colors.text.tertiary }]}>No data yet</Text>
            </View>
          )}
          {balanceRows.map((row, idx) => {
            const isLast = idx === balanceRows.length - 1;
            const pct = Math.max(...balanceRows.map(r => Math.abs(r.balance)), 1);
            const barPct = Math.abs(row.balance) / pct;
            return (
              <View key={row.id} style={[s.balChartRow, { borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}>
                <Text style={[s.balChartName, { color: colors.text.primary }]} numberOfLines={1}>{row.name}</Text>
                <View style={s.balChartBarWrap}>
                  <View style={[s.balChartBarBg, { backgroundColor: colors.bg.tertiary }]}>
                    <View style={[s.balChartBar, { width: `${barPct * 100}%`, backgroundColor: row.balance >= 0 ? colors.status.success : colors.status.error }]} />
                  </View>
                </View>
                <Text style={[s.balChartAmt, { color: row.balance >= 0 ? colors.status.success : colors.status.error }]}>
                  {row.balance >= 0 ? '+' : ''}{fmt(Math.round(row.balance))}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Contribution</Text>
        <View style={[s.finSumCard, { backgroundColor: colors.bg.secondary, padding: 0 }]}>
          {balanceRows.length === 0 && (
            <View style={{ padding: 16 }}>
              <Text style={[s.finSumLabel, { color: colors.text.tertiary }]}>No data yet</Text>
            </View>
          )}
          {balanceRows.map((row, idx) => {
            const isLast = idx === balanceRows.length - 1;
            const pct = stats.totalSpent > 0 ? (row.paid / stats.totalSpent * 100) : 0;
            return (
              <View key={row.id} style={[s.balChartRow, { borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}>
                <Text style={[s.balChartName, { color: colors.text.primary }]} numberOfLines={1}>{row.name}</Text>
                <View style={s.balChartBarWrap}>
                  <View style={[s.balChartBarBg, { backgroundColor: colors.bg.tertiary }]}>
                    <View style={[s.balChartBar, { width: `${Math.min(pct, 100)}%`, backgroundColor: colors.accent.primary }]} />
                  </View>
                </View>
                <Text style={[s.balChartAmt, { color: colors.text.primary }]}>{pct.toFixed(1)}%</Text>
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

        {(type === 'couple' || type === 'family') && (
          <TouchableOpacity
            style={[s.typeDashBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() =>
              type === 'couple'
                ? navigation.navigate('CoupleFinance', { groupId, groupName: name })
                : navigation.navigate('FamilyDashboard', { groupId, groupName: name })
            }
          >
            <Ionicons
              name={type === 'couple' ? 'heart' : 'home'}
              size={18}
              color="#FFF"
            />
            <Text style={s.typeDashBtnText}>
              Open {type === 'couple' ? 'Couple' : 'Family'} Dashboard
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
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
            title="Invite your people"
            message="Add members to start splitting expenses. Shared finance works better together."
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

  function renderMembers(balanceRows: any[] = []) {
    if (members.length === 0) {
      return (
        <View style={s.tabPanel}>
          <EmptyState
            icon="people-outline"
            title="Invite your people"
            message="Add members to start splitting expenses. Shared finance works better together."
            actionLabel="Invite Members"
            onAction={handleGenerateInvite}
          />
        </View>
      );
    }
    return (
      <View style={s.tabPanel}>
        {members.map((member: any) => {
          const role = member.role || 'member';
          const isMemberCurrentUser = member.userId === currentUser?.id;
          const row = balanceRows.find(r => r.userId === member.userId);
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[s.memberName, { color: colors.text.primary }]}>
                    {member.user?.firstName || member.user?.email || member.firstName || 'Member'}
                    {isMemberCurrentUser ? ' (You)' : ''}
                  </Text>
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
                </View>
                {row && (
                  <View style={{ marginTop: 6, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Paid {fmt(row.paid)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {Math.abs(row.balance) < 1 ? (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.success }}>Settled ✅</Text>
                        ) : row.balance < 0 ? (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.error }}>Owes {fmt(Math.abs(Math.round(row.balance)))}</Text>
                        ) : (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.success }}>Gets {fmt(Math.round(row.balance))}</Text>
                        )}
                      </View>
                    </View>
                    <View style={[s.contBarBg, { backgroundColor: colors.bg.tertiary }]}>
                      <View style={[s.contBarFill, { width: `${stats.totalSpent > 0 ? Math.min(row.paid / stats.totalSpent * 100, 100) : 0}%`, backgroundColor: colors.accent.primary }]} />
                    </View>
                  </View>
                )}
                {!row && (
                  <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>No expenses yet</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[s.inviteBtn, { backgroundColor: colors.accent.primary, flex: 1 }]}
            onPress={() => setAddMemberModalVisible(true)}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFF" />
            <Text style={s.inviteBtnText}>Add Member</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.inviteBtn, { backgroundColor: colors.bg.tertiary, flex: 1 }]}
            onPress={handleGenerateInvite}
            disabled={inviteLoading}
          >
            <Ionicons
              name={inviteLoading ? 'hourglass-outline' : 'share-outline'}
              size={18}
              color={colors.text.primary}
            />
            <Text style={[s.inviteBtnText, { color: colors.text.primary }]}>
              {inviteLoading ? 'Generating...' : 'Invite Link'}
            </Text>
          </TouchableOpacity>
        </View>
        {inviteToken && (
          <TouchableOpacity
            style={[s.viewLinkBtn, { borderColor: colors.border.default }]}
            onPress={() => setInviteModalVisible(true)}
          >
            <Ionicons name="link-outline" size={16} color={colors.accent.primary} />
            <Text style={[s.viewLinkText, { color: colors.accent.primary }]}>View invite link</Text>
          </TouchableOpacity>
        )}

        <Modal
          visible={inviteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setInviteModalVisible(false)}
          >
            <View style={[s.modalContent, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[s.modalTitle, { color: colors.text.primary }]}>Invite Link</Text>
              <Text style={[s.modalDesc, { color: colors.text.tertiary }]}>
                Share this link with anyone to join "{name}"
              </Text>
              <View style={[s.linkBox, { backgroundColor: colors.bg.tertiary }]}>
                <Text
                  style={[s.linkText, { color: colors.text.primary }]}
                  selectable
                  numberOfLines={2}
                >
                  {inviteToken ? `https://external-web.vercel.app/invite/${inviteToken}` : ''}
                </Text>
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={async () => {
                    const url = `https://external-web.vercel.app/invite/${inviteToken}`;
                    const text = `Join "${name}" on Dabbu! ${url}`;
                    await Share.share({ message: text, url }).catch(() => {});
                    setInviteModalVisible(false);
                  }}
                >
                  <Ionicons name="share-outline" size={18} color="#FFF" />
                  <Text style={s.modalBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: `${colors.status.success}20` }]}
                  onPress={async () => {
                    const url = `https://external-web.vercel.app/invite/${inviteToken}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Join "${name}" on Dabbu! ${url}`)}`;
                    const supported = await Linking.canOpenURL(whatsappUrl);
                    if (supported) {
                      await Linking.openURL(whatsappUrl);
                    } else {
                      await Share.share({ message: url });
                    }
                    setInviteModalVisible(false);
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={18} color={colors.status.success} />
                  <Text style={[s.modalBtnText, { color: colors.status.success }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={() => setInviteModalVisible(false)}>
                <Text style={[s.modalCloseText, { color: colors.text.tertiary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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

  async function handleSaveSettings() {
    if (!editName.trim()) {
      return Alert.alert('Name required', 'Please enter a group name.');
    }
    setSavingSettings(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.put(`/shared-finance/groups/${groupId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      await loadData(true);
      setSettingsOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleGenerateInvite() {
    if (!groupId) {
      return;
    }
    setInviteLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>(`/shared-finance/groups/${groupId}/invites`, {
        email: `invitee-${Date.now()}@temp.dabbu.app`,
      });
      const token = res?.token || res?.inviteToken;
      if (!token) {
        Alert.alert('Error', 'Failed to generate invite link');
        return;
      }
      setInviteToken(token);
      const inviteUrl = `https://external-web.vercel.app/invite/${token}`;
      const shareText = `Join "${name}" on Dabbu! Track shared expenses, split bills, and settle up easily.\n\n${inviteUrl}`;
      try {
        await Share.share({ message: shareText, url: inviteUrl });
      } catch {
        Alert.alert('Invite Link', inviteUrl);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleAddMember() {
    if (!groupId || !addMemberEmail.trim()) {
      return;
    }
    setAddMemberLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post<any>(`/shared-finance/groups/${groupId}/members/add-by-email`, {
        email: addMemberEmail.trim(),
      });
      setAddMemberModalVisible(false);
      setAddMemberEmail('');
      Alert.alert('Member Added', `${addMemberEmail.trim()} has been added to the group. They can see the group when they log in.`);
      loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  }

  function renderActivity() {
    if (groupedActivity.length === 0) {
      return (
        <View style={s.tabPanel}>
          <EmptyState
            icon="timer-outline"
            title="Track your group's activity"
            message="Expenses, settlements, and member updates will appear here as your group becomes active."
          />
        </View>
      );
    }
    return (
      <View style={s.tabPanel}>
        {groupedActivity.map((group) => (
          <View key={group.title}>
            <Text style={[s.activitySectionTitle, { color: colors.text.tertiary }]}>{group.title}</Text>
            {group.data.map((item) => {
              const typeColor = item.type === 'expense' || item.type === 'expense_added'
                ? colors.status.info
                : item.type === 'member' || item.type === 'member_joined'
                  ? colors.status.success
                  : item.type?.includes('settlement')
                    ? colors.status.warning
                    : item.type === 'payment_completed' || item.type === 'settlement_confirmed'
                      ? colors.status.success
                      : colors.accent.primary;
              return (
                <View key={item.id} style={[s.activityRow, { borderLeftWidth: 3, borderLeftColor: typeColor, paddingLeft: 10 }]}>
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
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
              );
            })}
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
        maxToRenderPerBatch={10}
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
            <View style={[s.headerRow, { paddingTop: insets.top + 8 }]}>
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
              {isAdmin && (
                <TouchableOpacity
                  style={[s.iconBtn, { backgroundColor: colors.bg.glassLight }]}
                  onPress={() => {
                    setEditName(name);
                    setEditDescription(group?.description || '');
                    setSettingsOpen(true);
                  }}
                >
                  <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.bg.glassLight }]}
                onPress={handleGenerateInvite}
                disabled={inviteLoading}
              >
                <Ionicons
                  name={inviteLoading ? 'hourglass-outline' : 'share-outline'}
                  size={20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 18 }}>
              <View style={{ paddingHorizontal: 20 }}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => {
                    const page = Math.round(e.nativeEvent.contentOffset.x / (windowWidth - 40));
                    setActiveStatPage(page);
                  }}
                >
                  {[
                    { label: 'Total Spent', value: fmt(stats.totalSpent), color: colors.text.primary },
                    {
                      label: myBalanceRow && myBalanceRow.balance >= 0 ? 'You Are Owed' : 'You Owe',
                      value: myBalanceRow ? (myBalanceRow.balance >= 0 ? fmt(myBalanceRow.balance) : fmt(Math.abs(myBalanceRow.balance))) : fmt(0),
                      color: myBalanceRow && myBalanceRow.balance >= 0 ? colors.status.success : (myBalanceRow && myBalanceRow.balance < 0 ? colors.status.error : colors.text.primary),
                    },
                    { label: 'Settlements Pending', value: String(stats.pendingSettlements), color: colors.status.warning },
                    { label: 'Active Members', value: String(members.length), color: colors.accent.primary },
                  ].map((page, idx) => (
                    <LinearGradient
                      key={idx}
                      colors={[colors.bg.secondary, colors.bg.tertiary]}
                      style={[s.pagerCard, { width: windowWidth - 40 }]}
                    >
                      <Text style={[s.pagerLabel, { color: colors.text.tertiary }]}>{page.label}</Text>
                      <Text style={[s.pagerValue, { color: page.color }]}>{page.value}</Text>
                    </LinearGradient>
                  ))}
                </ScrollView>
              </View>
              <View style={s.pagerDots}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      s.pagerDot,
                      {
                        backgroundColor: activeStatPage === i ? colors.accent.primary : colors.text.tertiary,
                        opacity: activeStatPage === i ? 1 : 0.3,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

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
            {activeTab === 'members' && renderMembers(balanceRows)}
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
                title="Split your first expense"
                message="Add an expense to get started. Dabbu makes splitting fair and effortless."
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

      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setSettingsOpen(false)}
        >
          <View style={[s.modalContent, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[s.modalTitle, { color: colors.text.primary }]}>Group Settings</Text>
            <Text style={[s.modalDesc, { color: colors.text.tertiary }]}>
              Edit your group name and description
            </Text>

            <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Group Name</Text>
            <TextInput
              style={[
                s.textInput,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter group name"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />

            <Text style={[s.fieldLabel, { color: colors.text.secondary, marginTop: 16 }]}>
              Description
            </Text>
            <TextInput
              style={[
                s.textInput,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                  height: 80,
                  textAlignVertical: 'top',
                },
              ]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Add a description (optional)"
              placeholderTextColor={colors.text.tertiary}
              multiline
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={s.modalBtnText}> Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.bg.tertiary }]}
                onPress={() => setSettingsOpen(false)}
              >
                <Text style={[s.modalBtnText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={addMemberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMemberModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddMemberModalVisible(false)}
        >
          <View style={[s.modalContent, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[s.modalTitle, { color: colors.text.primary }]}>Add Member</Text>
            <Text style={[s.modalDesc, { color: colors.text.tertiary }]}>
              Enter their email to generate an invite link
            </Text>

            <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Email Address</Text>
            <TextInput
              style={[
                s.textInput,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={addMemberEmail}
              onChangeText={setAddMemberEmail}
              placeholder="friend@email.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleAddMember}
                disabled={addMemberLoading || !addMemberEmail.trim()}
              >
                {addMemberLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFF" />
                    <Text style={s.modalBtnText}> Send Invite</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.bg.tertiary }]}
                onPress={() => setAddMemberModalVisible(false)}
              >
                <Text style={[s.modalBtnText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  loadWrap: { flex: 1 },
  emptyContainer: { flexGrow: 1, paddingTop: 60 },
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
  activitySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 8,
    marginTop: 4,
  },
  errText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retry: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  inviteBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  viewLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewLinkText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalDesc: { fontSize: 14, lineHeight: 20 },
  linkBox: {
    padding: 14,
    borderRadius: 12,
  },
  linkText: { fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  modalBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  modalClose: { alignItems: 'center', paddingVertical: 8 },
  modalCloseText: { fontSize: 14, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeDashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  typeDashBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  pagerCard: {
    padding: 24,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: 140,
  },
  pagerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pagerValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  pagerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  pagerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  finSumCard: {
    borderRadius: 18,
    padding: 16,
    gap: 0,
  },
  finSumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  finSumLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  finSumValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  balChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  balChartName: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
  },
  balChartBarWrap: {
    flex: 1,
  },
  balChartBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  balChartBar: {
    height: 6,
    borderRadius: 3,
  },
  balChartAmt: {
    width: 70,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  contBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  contBarFill: {
    height: 4,
    borderRadius: 2,
  },
});
