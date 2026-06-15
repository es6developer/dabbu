import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
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
import { api, setAccessToken, addSyncListener } from '../../services/api';
import { CATEGORY_COLORS } from '../../config/categoryIcons';
import { INVITE_BASE_URL } from '../../config/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme, palette } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { EmptyState } from './components/EmptyState';
import { SettleUpModal } from '../../components/ui/SettleUpModal';
import { useToast } from '../../store/ToastContext';

const TABS = ['summary', 'expenses', 'people'] as const;

const TYPE_THEMES: Record<string, { gradient: [string, string]; chipColor: string; icon: string }> =
  {
    friends: {
      gradient: [palette.brand.primary, palette.brand.hover],
      chipColor: palette.brand.primary,
      icon: 'people',
    },
    trip: { gradient: ['#00B894', '#00D9A6'], chipColor: '#00B894', icon: 'airplane' },
    family: {
      gradient: [palette.brand.primary, palette.brand.hover],
      chipColor: palette.brand.primary,
      icon: 'home',
    },
    couple: { gradient: ['#FF6B9D', '#FF8FB3'], chipColor: '#FF6B9D', icon: 'heart' },
    sports: { gradient: ['#FF6B35', '#FF8F5E'], chipColor: '#FF6B35', icon: 'football' },
    roommates: { gradient: ['#14B8A6', '#14B8A6'], chipColor: '#14B8A6', icon: 'business' },
    office: { gradient: ['#247BA0', '#4A9FC7'], chipColor: '#247BA0', icon: 'briefcase' },
    event: { gradient: ['#D64550', '#FF6B6B'], chipColor: '#D64550', icon: 'calendar' },
    apartment: { gradient: ['#14B8A6', '#14B8A6'], chipColor: '#14B8A6', icon: 'building' },
    default: {
      gradient: [palette.brand.primary, palette.brand.hover],
      chipColor: palette.brand.primary,
      icon: 'people',
    },
  };

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

function computeSmartSettlements(
  balanceRows: Array<{ userId: string; name: string; balance: number; upiId?: string }>,
  currentUserId?: string,
) {
  if (!currentUserId) return [];

  const myBalance = balanceRows.find(r => r.userId === currentUserId);
  if (!myBalance || myBalance.balance === 0) return [];

  const settlements: Array<{
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
    upiId?: string;
    type: 'pay' | 'collect' | 'remind';
  }> = [];

  if (myBalance.balance < 0) {
    const owed = Math.abs(myBalance.balance);
    const creditors = balanceRows
      .filter(r => r.userId !== currentUserId && r.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    let remaining = owed;
    for (const creditor of creditors) {
      if (remaining <= 0) break;
      const payAmount = Math.min(remaining, Math.round(creditor.balance));
      settlements.push({
        from: currentUserId,
        fromName: 'You',
        to: creditor.userId,
        toName: creditor.name,
        amount: payAmount,
        upiId: creditor.upiId,
        type: 'pay',
      });
      remaining -= payAmount;
    }
  } else {
    const debtors = balanceRows
      .filter(r => r.userId !== currentUserId && r.balance < 0)
      .sort((a, b) => a.balance - b.balance);

    for (const debtor of debtors) {
      settlements.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: currentUserId,
        toName: 'You',
        amount: Math.abs(Math.round(debtor.balance)),
        type: 'remind',
      });
    }
  }

  return settlements;
}

export function SharedGroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { groupId, groupName: routeGroupName } = route.params || {};

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('summary');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

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
          api.get<any>(`/shared-finance/groups/${groupId}/settlements`, ctrl.signal),
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
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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
        loadData();
      } else {
        loadData(true);
      }
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  useEffect(() => {
    const unsub = addSyncListener(() => {
      loadData(true);
    });
    return unsub;
  }, [loadData]);

  const members: any[] = Array.isArray(group?.members) ? group.members : [];
  const type = group?.type || 'default';
  const theme = TYPE_THEMES[type] || TYPE_THEMES.default;
  const name = group?.name || routeGroupName || 'Group';
  const currentMember = members.find((m: any) => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin' || group?.createdBy === currentUser?.id;
  const hasSettingsChanged = editName !== name || editDescription !== (group?.description || '');

  const stats = useMemo(() => {
    const totalAmount = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
    return {
      totalSpent: totalAmount,
      totalTransactions: expenses.length,
      pendingSettlements: activityData.filter((s: any) => s.status === 'pending').length,
    };
  }, [expenses, group]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const dateA = new Date(a.date || a.expenseDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.expenseDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [expenses]);

  const dateGroupedExpenses = useMemo(() => {
    const groups: { title: string; data: any[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let currentTitle = '';
    let currentItems: any[] = [];
    for (const exp of sortedExpenses) {
      const d = new Date(exp.date || exp.expenseDate || exp.createdAt);
      d.setHours(0, 0, 0, 0);
      let title: string;
      if (d.getTime() === today.getTime()) {
        title = 'Today';
      } else if (d.getTime() === yesterday.getTime()) {
        title = 'Yesterday';
      } else {
        title = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }
      if (title !== currentTitle) {
        if (currentItems.length > 0) {
          groups.push({ title: currentTitle, data: [...currentItems] });
        }
        currentTitle = title;
        currentItems = [];
      }
      currentItems.push(exp);
    }
    if (currentItems.length > 0) {
      groups.push({ title: currentTitle, data: currentItems });
    }
    return groups;
  }, [sortedExpenses]);

  const balanceRows = useMemo(() => {
    if (members.length === 0) {
      return [];
    }
    const entries = new Map<string, { paid: number; owes: number }>();
    for (const m of members) {
      entries.set(m.userId, { paid: 0, owes: 0 });
    }
    for (const expense of expenses) {
      if (!expense.splits || !Array.isArray(expense.splits)) {
        continue;
      }
      const payerId = expense.paidBy;
      if (!entries.has(payerId)) {
        entries.set(payerId, { paid: 0, owes: 0 });
      }
      for (const split of expense.splits) {
        const splitUserId = split.userId;
        if (!entries.has(splitUserId)) {
          entries.set(splitUserId, { paid: 0, owes: 0 });
        }
        const splitAmount = Number(split.amount) || 0;
        entries.get(payerId)!.paid += splitAmount;
        entries.get(splitUserId)!.owes += splitAmount;
      }
    }
    return members.map((member: any) => {
      const e = entries.get(member.userId) || { paid: 0, owes: 0 };
      return {
        id: member.id,
        userId: member.userId,
        name: member.user?.firstName || member.user?.email || 'Member',
        paid: e.paid,
        owes: e.owes,
        balance: e.paid - e.owes,
        email: member.user?.email,
        upiId: member.user?.upiId || member.user?.email,
        role: member.role || 'member',
        isGuest: member.user?.status === 'temporary',
      };
    });
  }, [members, expenses]);

  const myBalanceRow = balanceRows.find((r) => r.userId === currentUser?.id);
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
      detail: `${tx.description || tx.category?.name || tx.category || 'Expense'} · ${fmt(Number(tx.amount || 0))}`,
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
        <View style={[s.loadWrap, { paddingTop: insets.top + 8 }]}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 }}
          >
            <Skeleton width={38} height={38} borderRadius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="50%" height={20} />
              <Skeleton width="30%" height={12} />
            </View>
            <Skeleton width={38} height={38} borderRadius={12} />
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <Skeleton width="100%" height={100} borderRadius={18} />
          </View>
          <View style={{ marginTop: 20, paddingHorizontal: 20, gap: 10 }}>
            <Skeleton width="100%" height={60} borderRadius={16} />
            <Skeleton width="100%" height={60} borderRadius={16} />
            <Skeleton width="100%" height={60} borderRadius={16} />
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

  function renderSummary() {
    const settlements = computeSmartSettlements(balanceRows, currentUser?.id);
    const catEntries = (() => {
      const cats: Record<string, number> = {};
      expenses.forEach((e) => {
        const c = (e.category || 'Other').toLowerCase();
        cats[c] = (cats[c] || 0) + Number(e.amount || 0);
      });
      return Object.entries(cats).sort(([, a], [, b]) => b - a);
    })();

    const recentActivity = activity.slice(0, 5);

    return (
      <View style={s.tabPanel}>
        {settlements.length > 0 && (
          <View style={[s.settlementHero, { backgroundColor: colors.bg.card }]}>
            <View style={s.settlementHeroHeader}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.accent.primary} />
              <Text style={[s.settlementHeroTitle, { color: colors.text.primary }]}>
                {myBalanceRow && myBalanceRow.balance < 0
                  ? `You owe ${fmt(Math.abs(myBalanceRow.balance))}`
                  : `You are owed ${fmt(myBalanceRow?.balance || 0)}`}
              </Text>
            </View>
            {settlements.map((st, i) => (
              <View key={i} style={s.settlementRow}>
                <View style={[s.settlementAvatar, { backgroundColor: colors.accent.primary }]}>
                  <Text style={s.settlementAvatarText}>
                    {st.fromName === 'You' ? st.toName[0]?.toUpperCase() : st.fromName[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.settlementLabel, { color: colors.text.primary }]}>
                    {st.type === 'pay'
                      ? `Pay ${st.toName}`
                      : `${st.fromName} pays you`}
                  </Text>
                  <Text style={[s.settlementAmount, { color: colors.text.tertiary }]}>
                    {fmt(st.amount)}
                  </Text>
                </View>
                {st.type === 'pay' && st.upiId ? (
                  <TouchableOpacity
                    style={[s.upiBtn, { backgroundColor: '#34C759' }]}
                    onPress={() => {
                      const upiLink = `upi://pay?pa=${encodeURIComponent(st.upiId!)}&pn=${encodeURIComponent(st.toName)}&am=${st.amount}&cu=INR&tn=Settling%20via%20Dabbu`;
                      Linking.openURL(upiLink).catch(() =>
                        Alert.alert(
                          'Unable to open UPI',
                          'No UPI app found. Please try GPay, PhonePe, or Paytm.',
                        ),
                      );
                    }}
                  >
                    <Ionicons name="wallet-outline" size={14} color="#FFF" />
                    <Text style={s.upiBtnText}>Pay</Text>
                  </TouchableOpacity>
                ) : st.type === 'remind' ? (
                  <TouchableOpacity
                    style={[s.upiBtn, { backgroundColor: colors.status.warning }]}
                    onPress={() => {
                      const msg = `Hey ${st.fromName}, just a reminder to pay me ${fmt(st.amount)} on Dabbu!`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      Linking.openURL(whatsappUrl).catch(() =>
                        Alert.alert('Reminder', msg),
                      );
                    }}
                  >
                    <Ionicons name="notifications-outline" size={14} color="#FFF" />
                    <Text style={s.upiBtnText}>Remind</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {settlements.length > 0 && (
              <TouchableOpacity
                style={[s.viewAllSettlements, { borderTopColor: colors.border.subtle }]}
                onPress={() => navigation.navigate('Settlement', { groupId })}
              >
                <Text style={[s.viewAllSettlementsText, { color: colors.accent.primary }]}>
                  View all settlements
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {type === 'trip' && expenses.length > 0 && (
          <View style={[s.tripSummaryCard, { backgroundColor: colors.bg.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.tripIconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
                <Ionicons name="airplane" size={20} color={colors.accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.tripSummaryTitle, { color: colors.text.primary }]}>
                  {name}
                </Text>
                <Text style={[s.tripSummaryMeta, { color: colors.text.tertiary }]}>
                  {members.length} member{members.length !== 1 ? 's' : ''} · {fmt(stats.totalSpent)} total
                </Text>
              </View>
            </View>
            {(() => {
              if (expenses.length === 0) return null;
              const dates = sortedExpenses
                .map(e => new Date(e.date || e.expenseDate || e.createdAt).getTime())
                .filter(t => !isNaN(t))
                .sort();
              if (dates.length === 0) return null;
              const firstDay = new Date(dates[0]);
              const lastDay = new Date(dates[dates.length - 1]);
              const days = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1);
              return (
                <View style={s.tripStatsRow}>
                  <View style={s.tripStat}>
                    <Text style={[s.tripStatValue, { color: colors.text.primary }]}>{days} days</Text>
                    <Text style={[s.tripStatLabel, { color: colors.text.tertiary }]}>Duration</Text>
                  </View>
                  <View style={s.tripStat}>
                    <Text style={[s.tripStatValue, { color: colors.text.primary }]}>{expenses.length}</Text>
                    <Text style={[s.tripStatLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  </View>
                  <View style={s.tripStat}>
                    <Text style={[s.tripStatValue, { color: colors.accent.primary }]}>{fmt(stats.totalSpent)}</Text>
                    <Text style={[s.tripStatLabel, { color: colors.text.tertiary }]}>Total</Text>
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {catEntries.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Categories</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {catEntries.slice(0, 4).map(([cat, amt]) => {
                const pct = Math.round((amt / stats.totalSpent) * 100);
                return (
                  <View
                    key={cat}
                    style={[s.categoryChip, { backgroundColor: `${colors.accent.primary}12` }]}
                  >
                    <Text style={[s.categoryChipText, { color: colors.accent.primary }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)} · {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[s.insightToggle, { backgroundColor: colors.bg.card }]}
          onPress={() => {
            if (!insightsOpen && insights.length === 0 && !insightsLoading) {
              setInsightsLoading(true);
              api
                .get<any[]>(`/shared-finance/groups/${groupId}/insights`)
                .then((res) => setInsights(Array.isArray(res) ? res : []))
                .catch(() => setInsights([]))
                .finally(() => setInsightsLoading(false));
            }
            setInsightsOpen(!insightsOpen);
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="bulb-outline" size={18} color={colors.status.warning} />
            <Text style={[s.insightToggleTitle, { color: colors.text.primary }]}>
              AI Insights
            </Text>
          </View>
          <Ionicons
            name={insightsOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.text.tertiary}
          />
        </TouchableOpacity>

        {insightsOpen && (
          <View style={[s.card, { backgroundColor: colors.bg.card }]}>
            {insightsLoading ? (
              <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginVertical: 12 }} />
            ) : insights.length === 0 ? (
              <Text style={[{ fontSize: 13, color: colors.text.tertiary, textAlign: 'center', marginVertical: 12 }]}>
                No insights available yet. Add more expenses to get personalized recommendations.
              </Text>
            ) : (
              insights.slice(0, 5).map((insight: any, i: number) => {
                const sevColor =
                  insight.severity === 'critical'
                    ? '#EF4444'
                    : insight.severity === 'warning'
                      ? '#F59E0B'
                      : insight.severity === 'success'
                        ? '#10B981'
                        : '#3B82F6';
                return (
                  <View
                    key={i}
                    style={[
                      s.insightItem,
                      {
                        backgroundColor: `${sevColor}10`,
                        borderLeftColor: sevColor,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[{ fontSize: 13, fontWeight: '700', color: colors.text.primary }]}>
                        {insight.title}
                      </Text>
                      <Text style={[{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }]}>
                        {insight.message}
                      </Text>
                    </View>
                    {insight.actionable && (
                      <TouchableOpacity
                        style={[{ backgroundColor: sevColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }]}
                        onPress={() => {
                          if (insight.actionRoute === '/expenses/add') {
                            navigation.navigate('SharedExpenseForm', { groupId, edit: false });
                          }
                        }}
                      >
                        <Text style={[{ color: '#FFF', fontSize: 11, fontWeight: '700' }]}>
                          {insight.actionLabel || 'Go'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {recentActivity.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[s.secTitle, { color: colors.text.tertiary }]}>
              Recent Activity
            </Text>
            {recentActivity.map((item) => {
              const typeColor =
                item.type === 'expense' || item.type === 'expense_added'
                  ? '#60A5FA'
                  : item.type === 'member' || item.type === 'member_joined'
                    ? '#34C759'
                    : item.type?.includes('settlement')
                      ? colors.status.warning
                      : item.type === 'payment_completed' || item.type === 'settlement_confirmed'
                        ? '#34C759'
                        : colors.accent.primary;
              return (
                <View key={item.id} style={[s.activityRow, { borderLeftColor: typeColor }]}>
                  <View style={[s.activityIcon, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name={item.icon as any} size={16} color={colors.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.activityTitle, { color: colors.text.primary }]}>
                      {item.title}
                    </Text>
                    <Text style={[s.activityDetail, { color: colors.text.tertiary }]}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  function renderExpenseItem(item: any) {
    const payer = members.find((m: any) => m.userId === item.paidBy);
    const payerName = payer?.user?.firstName || payer?.user?.email || 'Someone';
    const date = new Date(item.date || item.createdAt || '');
    const category = item.category || 'Other';
    const canModify = item.paidBy === currentUser?.id || isAdmin;

    const mySplit = item.splits?.find((s: any) => s.userId === currentUser?.id);
    const myShare = mySplit ? Number(mySplit.amount) : 0;
    const iPaid = item.paidBy === currentUser?.id;

    return (
      <TouchableOpacity
        style={[s.expenseCard, { backgroundColor: colors.bg.card }]}
        onPress={() => {
          if (!canModify) return;
          navigation.navigate('SharedExpenseForm', { groupId, expenseId: item.id, edit: true });
        }}
        onLongPress={() => {
          if (!canModify) return;
          Alert.alert(item.description || 'Expense', 'Choose action', [
            {
              text: 'Edit',
              onPress: () =>
                navigation.navigate('SharedExpenseForm', { groupId, expenseId: item.id, edit: true }),
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => confirmDeleteExpense(item.id),
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        activeOpacity={canModify ? 0.8 : 1}
      >
        <View style={[s.expenseAvatar, { backgroundColor: colors.accent.primary }]}>
          <Text style={s.expenseAvatarText}>{payerName[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={s.expenseTopRow}>
            <Text style={[s.expenseDesc, { color: colors.text.primary }]} numberOfLines={1}>
              {item.description || category}
            </Text>
            <Text style={[s.expenseAmount, { color: colors.text.primary }]}>
              {fmt(Number(item.amount || 0))}
            </Text>
          </View>
          <Text style={[s.expenseDateLine, { color: colors.text.tertiary }]}>
            {payerName}
            {!isNaN(date.getTime()) &&
              ` · ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </Text>
          {iPaid ? (
            <Text style={[s.yourShareText, { color: colors.accent.primary }]}>
              You paid {fmt(Number(item.amount || 0))}
            </Text>
          ) : myShare > 0 ? (
            <Text style={[s.yourShareText, { color: colors.text.tertiary }]}>
              Your share: {fmt(myShare)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  async function confirmDeleteExpense(expenseId: string) {
    Alert.alert('Delete Expense', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) setAccessToken(accessToken);
            await api.delete(`/shared-finance/expenses/${expenseId}`);
            showToast('Expense deleted');
            loadData(true);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  function renderPeople() {
    if (members.length === 0) {
      return (
        <View style={s.tabPanel}>
          <EmptyState
            icon="people-outline"
            title="Invite your people"
            message="Add members to start splitting expenses."
            actionLabel="Invite Members"
            onAction={handleGenerateInvite}
          />
        </View>
      );
    }

    const sortedByBalance = [...balanceRows].sort((a, b) => {
      if (a.userId === currentUser?.id) return 1;
      if (b.userId === currentUser?.id) return -1;
      return Math.abs(b.balance) - Math.abs(a.balance);
    });

    return (
      <View style={s.tabPanel}>
        {sortedByBalance.map((row) => {
          const owes = row.balance < 0;
          const isMe = row.userId === currentUser?.id;
          return (
            <View key={row.id} style={[s.peopleCard, { backgroundColor: colors.bg.card }]}>
              <View style={[s.peopleAvatar, { backgroundColor: isMe ? colors.accent.primary : colors.bg.tertiary }]}>
                <Text style={[s.peopleAvatarText, { color: isMe ? '#FFF' : colors.text.primary }]}>
                  {row.name[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.peopleName, { color: colors.text.primary }]}>
                  {row.name}
                  {isMe ? ' (You)' : ''}
                </Text>
                {Math.abs(row.balance) < 1 ? (
                  <Text style={[s.peopleStatusSettled, { color: '#34C759' }]}>
                    All settled
                  </Text>
                ) : (
                  <Text style={[s.peopleStatus, { color: owes ? '#FF4D4F' : '#34C759' }]}>
                    {owes ? `Owes ${fmt(Math.abs(Math.round(row.balance)))}` : `Gets ${fmt(Math.round(row.balance))}`}
                  </Text>
                )}
              </View>
              {!isMe && owes && (
                <TouchableOpacity
                  style={[s.peopleSettleBtn, { backgroundColor: '#34C759' }]}
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
                  <Text style={s.peopleSettleBtnText}>Settle Up</Text>
                </TouchableOpacity>
              )}
              {!isMe && !owes && row.balance > 0 && (
                <TouchableOpacity
                  style={[s.peopleSettleBtn, { backgroundColor: colors.status.warning }]}
                  onPress={() => {
                    const msg = `Hey ${row.name}, just a reminder to settle up ${fmt(Math.round(row.balance))} on Dabbu!`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    Linking.openURL(whatsappUrl).catch(() =>
                      Alert.alert('Reminder', msg),
                    );
                  }}
                >
                  <Ionicons name="notifications-outline" size={14} color="#FFF" />
                  <Text style={s.peopleSettleBtnText}>Remind</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {!(type === 'couple' && members.length >= 2) && (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[s.inviteBtn, { backgroundColor: colors.accent.primary, flex: 1 }]}
                onPress={() =>
                  navigation.navigate('AddMember', {
                    groupId,
                    type: 'shared-finance',
                    existingMemberIds: members.map((m: any) => m.userId).filter(Boolean),
                  })
                }
              >
                <Ionicons name="person-add-outline" size={18} color="#FFF" />
                <Text style={s.inviteBtnText}>Add Member</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.inviteBtn, { backgroundColor: colors.bg.card, flex: 1 }]}
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
                <Text style={[s.viewLinkText, { color: colors.accent.primary }]}>
                  View invite link
                </Text>
              </TouchableOpacity>
            )}
          </>
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
                  {inviteToken ? `${INVITE_BASE_URL}/${inviteToken}` : ''}
                </Text>
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={async () => {
                    const url = `${INVITE_BASE_URL}/${inviteToken}`;
                    await Share.share({ message: `Join "${name}" on Dabbu! ${url}` }).catch(
                      () => {},
                    );
                    setInviteModalVisible(false);
                  }}
                >
                  <Ionicons name="share-outline" size={18} color="#FFF" />
                  <Text style={s.modalBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: '#34C75920' }]}
                  onPress={async () => {
                    const url = `${INVITE_BASE_URL}/${inviteToken}`;
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
                  <Ionicons name="logo-whatsapp" size={18} color="#34C759" />
                  <Text style={[s.modalBtnText, { color: '#34C759' }]}>WhatsApp</Text>
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
      await api.patch(`/shared-finance/groups/${groupId}/members/${member.id}/role`, { role });
      showToast('Role updated');
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
              showToast('Member removed');
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
      showToast('Settings saved');
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
      const inviteUrl = `${INVITE_BASE_URL}/${token}`;
      try {
        await Share.share({
          message: `Join "${name}" on Dabbu! Track shared expenses, split bills, and settle up easily.\n\n${inviteUrl}`,
        });
      } catch {
        Alert.alert('Invite Link', inviteUrl);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <SectionList
        sections={activeTab === 'expenses' ? dateGroupedExpenses : []}
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
            : { paddingBottom: insets.bottom + 120 }
        }
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          activeTab === 'expenses' && section.data.length > 0 ? (
            <Text
              style={[
                s.activitySectionTitle,
                {
                  color: colors.text.tertiary,
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 4,
                  backgroundColor: colors.bg.primary,
                },
              ]}
            >
              {section.title}
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <View
              style={{
                paddingTop: insets.top + 8,
                paddingBottom: 24,
                paddingHorizontal: 20,
                backgroundColor: (TYPE_THEMES[type]?.gradient || ['#14B8A6', '#14B8A6'])[0],
              }}
            >
              <View style={s.headerRow}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                  <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 10, minWidth: 0 }}>
                  <Text style={s.groupName} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={s.groupMetaRow}>
                    <Text style={s.groupMeta}>
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </Text>
                    <View style={[s.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Text style={s.typeBadgeText}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </View>
                    {myBalanceRow && Math.abs(myBalanceRow.balance) > 0 && (
                      <>
                        <Text style={s.groupMeta}>·</Text>
                        <Ionicons
                          name={myBalanceRow.balance >= 0 ? 'arrow-down' : 'arrow-up'}
                          size={10}
                          color="rgba(255,255,255,0.6)"
                        />
                        <Text style={[s.groupMeta, { fontWeight: '600' }]}>
                          {myBalanceRow.balance >= 0 ? '' : '-'}
                          {fmt(Math.abs(Math.round(myBalanceRow.balance)))}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => {
                      setEditName(name);
                      setEditDescription(group?.description || '');
                      setSettingsOpen(true);
                    }}
                  >
                    <Ionicons name="settings-outline" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
                {!(type === 'couple' && members.length >= 2) && (
                  <TouchableOpacity
                    style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() =>
                      navigation.getParent()?.navigate('Dashboard', { screen: 'AiGroupSpace', params: { groupId, groupName: name } })
                    }
                  >
                    <Ionicons name="sparkles" size={20} color="#FFD700" />
                  </TouchableOpacity>
                )}
                {!(type === 'couple' && members.length >= 2) && (
                  <TouchableOpacity
                    style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={handleGenerateInvite}
                    disabled={inviteLoading}
                  >
                    <Ionicons
                      name={inviteLoading ? 'hourglass-outline' : 'share-outline'}
                      size={20}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={s.tabRowOuter}>
              <View style={s.tabRow}>
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
                        { color: activeTab === tab ? '#FFF' : colors.text.secondary },
                      ]}
                    >
                      {tab === 'summary'
                        ? 'Summary'
                        : tab === 'expenses'
                          ? 'Expenses'
                          : 'People'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {activeTab === 'summary' && renderSummary()}
            {activeTab === 'people' && renderPeople()}
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
                onAction={() => navigation.navigate('SharedExpenseForm', { groupId, edit: false })}
              />
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('SharedExpenseForm', { groupId, edit: false })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>

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
                style={[
                  s.modalBtn,
                  { backgroundColor: colors.accent.primary },
                  !hasSettingsChanged && { opacity: 0.5 },
                ]}
                onPress={handleSaveSettings}
                disabled={savingSettings || !hasSettingsChanged}
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
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  loadWrap: { flex: 1 },
  emptyContainer: { flexGrow: 1, paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  groupMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  headerBalanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerBalanceText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  tabRowOuter: { paddingHorizontal: 20, marginTop: 16 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabPanel: { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  secTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settlementHero: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  settlementHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  settlementHeroTitle: { fontSize: 16, fontWeight: '800' },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  settlementAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementAvatarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  settlementLabel: { fontSize: 13, fontWeight: '600' },
  settlementAmount: { fontSize: 12, marginTop: 1 },
  upiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  upiBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  viewAllSettlements: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewAllSettlementsText: { fontSize: 13, fontWeight: '600' },
  tripSummaryCard: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tripIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripSummaryTitle: { fontSize: 15, fontWeight: '700' },
  tripSummaryMeta: { fontSize: 12, marginTop: 2 },
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  tripStat: { alignItems: 'center' },
  tripStatValue: { fontSize: 16, fontWeight: '800' },
  tripStatLabel: { fontSize: 11, marginTop: 2 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  categoryChipText: { fontSize: 12, fontWeight: '600' },
  insightToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  insightToggleTitle: { fontSize: 14, fontWeight: '700' },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  expenseCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseDesc: { fontSize: 14, fontWeight: '600', flex: 1 },
  expenseAmount: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  expenseDateLine: { fontSize: 11, marginTop: 1 },
  yourShareText: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  peopleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  peopleAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleAvatarText: { fontSize: 14, fontWeight: '800' },
  peopleName: { fontSize: 14, fontWeight: '700' },
  peopleStatus: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  peopleStatusSettled: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  peopleSettleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  peopleSettleBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 2,
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
  activitySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 8,
    marginTop: 4,
  },
  errText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retry: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
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
  modalContent: { width: '100%', borderRadius: 24, padding: 24, gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalDesc: { fontSize: 14, lineHeight: 20 },
  linkBox: { padding: 14, borderRadius: 12 },
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
});
