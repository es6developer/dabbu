import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, palette } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { INVITE_BASE_URL } from '../../config/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  if (!d) {
    return '';
  }
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TYPE_THEMES: Record<string, { gradient: [string, string]; chipColor: string; icon: string }> =
  {
    friends: {
      gradient: [palette.brand.primary, palette.brand.hover],
      chipColor: palette.brand.primary,
      icon: 'team',
    },
    trip: { gradient: ['#00B894', '#00D9A6'], chipColor: '#00B894', icon: 'earth' },
    family: {
      gradient: [palette.brand.primary, palette.brand.hover],
      chipColor: palette.brand.primary,
      icon: 'home',
    },
    couple: { gradient: ['#FF6B9D', '#FF8FB3'], chipColor: '#FF6B9D', icon: 'heart' },
    sports: { gradient: ['#FF6B35', '#FF8F5E'], chipColor: '#FF6B35', icon: 'star' },
    roommates: { gradient: ['#14B8A6', '#14B8A6'], chipColor: '#14B8A6', icon: 'team' },
    office: { gradient: ['#247BA0', '#4A9FC7'], chipColor: '#247BA0', icon: 'bank' },
    event: { gradient: ['#D64550', '#FF6B6B'], chipColor: '#D64550', icon: 'calendar' },
    apartment: { gradient: ['#14B8A6', '#14B8A6'], chipColor: '#14B8A6', icon: 'home' },
    default: {
      gradient: [palette.brand.primary, palette.brand.hover],
      chipColor: palette.brand.primary,
      icon: 'team',
    },
  };

function computeSmartSettlements(
  balanceRows: Array<{ userId: string; name: string; balance: number; upiId?: string }>,
  currentUserId?: string,
) {
  if (!currentUserId) {
    return [];
  }
  const myBalance = balanceRows.find((r) => r.userId === currentUserId);
  if (!myBalance || myBalance.balance === 0) {
    return [];
  }
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
      .filter((r) => r.userId !== currentUserId && r.balance > 0)
      .sort((a, b) => b.balance - a.balance);
    let remaining = owed;
    for (const creditor of creditors) {
      if (remaining <= 0) {
        break;
      }
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
      .filter((r) => r.userId !== currentUserId && r.balance < 0)
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
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        setError('Missing group');
        setLoading(false);
        return;
      }
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
        const ts = Date.now();
        const [groupRes, expensesRes, activityRes, analyticsRes, insightsRes] =
          await Promise.allSettled([
            api.get<any>(`/shared-finance/groups/${groupId}?_=${ts}`),
            api.get<any>(`/shared-finance/groups/${groupId}/expenses?_=${ts}`),
            api.get<any>(`/shared-finance/groups/${groupId}/settlements?_=${ts}`),
            api.get<any>(`/shared-finance/groups/${groupId}/analytics?_=${ts}`).catch(() => null),
            api.get<any>(`/shared-finance/groups/${groupId}/insights?_=${ts}`).catch(() => null),
          ]);
        if (groupRes.status === 'fulfilled') {
          setGroup(groupRes.value);
        }
        const eData = expensesRes.status === 'fulfilled' ? expensesRes.value : [];
        setExpenses(Array.isArray(eData) ? eData : []);
        const aData = activityRes.status === 'fulfilled' ? activityRes.value : [];
        setActivityData(Array.isArray(aData) ? aData : []);
        const ad = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;
        setAnalyticsData(ad);
        const id = insightsRes.status === 'fulfilled' ? insightsRes.value : [];
        setInsights(Array.isArray(id) ? id : []);
        if (groupRes.status === 'rejected' && expensesRes.status === 'rejected') {
          throw new Error('Unable to load data');
        }
      } catch (e: any) {
        setError(e.message || 'Unable to load');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, groupId],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const members: any[] = Array.isArray(group?.members) ? group.members : [];
  const type = group?.type || 'default';
  const theme = TYPE_THEMES[type] || TYPE_THEMES.default;
  const name = group?.name || routeGroupName || 'Group';
  const currentMember = members.find((m: any) => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin' || group?.createdBy === currentUser?.id;
  const hasSettingsChanged = editName !== name || editDescription !== (group?.description || '');

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const da = new Date(a.date || a.expenseDate || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.expenseDate || b.createdAt || 0).getTime();
        return db - da;
      }),
    [expenses],
  );

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses],
  );
  const totalIncomeFromData = useMemo(
    () =>
      expenses
        .filter((e: any) => e.type === 'income')
        .reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses],
  );
  const avgPerPerson = members.length > 0 ? Math.round(totalSpent / members.length) : 0;

  const categoryBreakdown = useMemo(() => {
    const trends = analyticsData?.categoryTrends;
    if (Array.isArray(trends) && trends.length > 0) {
      return trends.map((c: any) => ({
        category: c.category,
        amount: c.total,
        percentage: c.percentage,
      }));
    }
    const map = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount || 0));
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0);
    return [...map.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, analyticsData]);
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    return sortedExpenses.filter((e: any) => {
      const d = new Date(e.date || e.expenseDate || e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [sortedExpenses]);
  const monthlySpending = thisMonthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

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
        const suid = split.userId;
        if (!entries.has(suid)) {
          entries.set(suid, { paid: 0, owes: 0 });
        }
        const amt = Number(split.amount) || 0;
        entries.get(payerId)!.paid += amt;
        entries.get(suid)!.owes += amt;
      }
    }
    return members.map((m: any) => {
      const e = entries.get(m.userId) || { paid: 0, owes: 0 };
      return {
        id: m.id,
        userId: m.userId,
        name: m.user?.firstName || m.user?.email || 'Member',
        paid: e.paid,
        owes: e.owes,
        balance: e.paid - e.owes,
        email: m.user?.email,
        upiId: m.user?.upiId || m.user?.email,
        role: m.role || 'member',
        isGuest: m.user?.status === 'temporary',
      };
    });
  }, [members, expenses]);

  const myBalanceRow = balanceRows.find((r) => r.userId === currentUser?.id);
  const settlements = computeSmartSettlements(balanceRows, currentUser?.id);

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
      const url = `${INVITE_BASE_URL}/${token}`;
      await Share.share({
        message: `Join "${name}" on Dabbu! Track shared expenses, split bills, and settle up easily.\n\n${url}`,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
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

  async function confirmDeleteExpense(expenseId: string) {
    Alert.alert('Delete Expense', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
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

  if (loading && !group) {
    return (
      <View
        style={[
          s.root,
          { backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (error && !group) {
    return (
      <View
        style={[
          s.root,
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

  const memberCount = members.length;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top, minHeight: insets.top + 56, justifyContent: 'center' }}
      >
        <View style={s.heroRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <AntDesign name="arrowleft" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={[s.heroIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <AntDesign name={theme.icon as any} size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroName, { color: '#FFF' }]} numberOfLines={1}>
              {name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              <Text style={[s.heroMeta, { color: 'rgba(255,255,255,0.7)' }]}>
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </Text>
              <View style={[s.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={s.typeBadgeText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </View>
              {myBalanceRow && Math.abs(myBalanceRow.balance) > 0 && (
                <Text style={[s.heroMeta, { color: 'rgba(255,255,255,0.8)', fontWeight: '600' }]}>
                  · {myBalanceRow.balance >= 0 ? '' : '-'}
                  {fmt(Math.abs(Math.round(myBalanceRow.balance)))}
                </Text>
              )}
            </View>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => {
                setEditName(name);
                setEditDescription(group?.description || '');
                setSettingsOpen(true);
              }}
            >
              <AntDesign name="setting" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[
              s.actionBtn,
              { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' },
            ]}
            onPress={() => navigation.navigate('SharedExpenseForm', { groupId, edit: false })}
          >
            <View style={[s.actionIconBg, { backgroundColor: '#6366F1' }]}>
              <AntDesign name="arrowdown" size={16} color="#FFF" />
            </View>
            <Text style={[s.actionLabel, { color: '#6366F1' }]}>Split</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.actionBtn,
              { backgroundColor: '#34C759' + '12', borderColor: '#34C759' + '25' },
            ]}
            onPress={() => navigation.navigate('Settlement', { groupId })}
          >
            <View style={[s.actionIconBg, { backgroundColor: '#34C759' }]}>
              <AntDesign name="swap" size={16} color="#FFF" />
            </View>
            <Text style={[s.actionLabel, { color: '#34C759' }]}>Settle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: colors.accent.primary + '12',
                borderColor: colors.accent.primary + '25',
              },
            ]}
            onPress={handleGenerateInvite}
          >
            <View style={[s.actionIconBg, { backgroundColor: colors.accent.primary }]}>
              <AntDesign name={inviteLoading ? 'hourglass' : 'adduser'} size={16} color="#FFF" />
            </View>
            <Text style={[s.actionLabel, { color: colors.accent.primary }]}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 },
            ]}
          >
            <View style={[s.summaryIcon, { backgroundColor: colors.status.error + '12' }]}>
              <AntDesign name="arrowdown" size={14} color={colors.status.error} />
            </View>
            <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Spent</Text>
            <Text style={[s.summaryValue, { color: colors.status.error }]}>{fmt(totalSpent)}</Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 },
            ]}
          >
            <View style={[s.summaryIcon, { backgroundColor: colors.status.success + '12' }]}>
              <AntDesign
                name={totalIncomeFromData > 0 ? 'arrowup' : 'user'}
                size={14}
                color={colors.status.success}
              />
            </View>
            <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>
              {totalIncomeFromData > 0 ? 'Income' : 'Avg/Person'}
            </Text>
            <Text style={[s.summaryValue, { color: colors.status.success }]}>
              {totalIncomeFromData > 0 ? fmt(totalIncomeFromData) : fmt(avgPerPerson)}
            </Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 },
            ]}
          >
            <View style={[s.summaryIcon, { backgroundColor: colors.accent.primary + '12' }]}>
              <AntDesign name="wallet" size={14} color={colors.accent.primary} />
            </View>
            <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Budget</Text>
            <Text style={[s.summaryValue, { color: colors.text.primary }]}>
              {group?.monthlyBudget ? fmt(Number(group.monthlyBudget)) : '—'}
            </Text>
          </View>
        </View>

        {/* Settlement Preview */}
        {settlements.length > 0 && (
          <View
            style={[
              s.settlementCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={[s.settlementIcon, { backgroundColor: colors.accent.primary + '12' }]}>
                <AntDesign name="swap" size={14} color={colors.accent.primary} />
              </View>
              <Text style={[s.settlementTitle, { color: colors.text.primary }]}>
                {myBalanceRow && myBalanceRow.balance < 0
                  ? `You owe ${fmt(Math.abs(myBalanceRow.balance))}`
                  : `You are owed ${fmt(myBalanceRow?.balance || 0)}`}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => navigation.navigate('Settlement', { groupId })}>
                <Text style={[s.viewAllText, { color: colors.accent.primary }]}>View all</Text>
              </TouchableOpacity>
            </View>
            {settlements.slice(0, 3).map((st, i) => (
              <View key={i} style={[s.settleRow, { borderTopColor: colors.border.subtle }]}>
                <View style={[s.settleAvatar, { backgroundColor: colors.accent.primary }]}>
                  <Text style={s.settleAvatarText}>
                    {st.fromName === 'You'
                      ? st.toName[0]?.toUpperCase()
                      : st.fromName[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.settleLabel, { color: colors.text.primary }]}>
                    {st.type === 'pay' ? `Pay ${st.toName}` : `${st.fromName} pays you`}
                  </Text>
                  <Text style={[s.settleAmount, { color: colors.text.tertiary }]}>
                    {fmt(st.amount)}
                  </Text>
                </View>
                {st.type === 'pay' && st.upiId ? (
                  <TouchableOpacity
                    style={[s.payBtn, { backgroundColor: '#34C759' }]}
                    onPress={() => {
                      Linking.openURL(
                        `upi://pay?pa=${encodeURIComponent(st.upiId!)}&pn=${encodeURIComponent(st.toName)}&am=${st.amount}&cu=INR&tn=Settling%20via%20Dabbu`,
                      ).catch(() => Alert.alert('Unable to open UPI', 'No UPI app found.'));
                    }}
                  >
                    <AntDesign name="wallet" size={12} color="#FFF" />
                    <Text style={s.payBtnText}>Pay</Text>
                  </TouchableOpacity>
                ) : st.type === 'remind' ? (
                  <TouchableOpacity
                    style={[s.payBtn, { backgroundColor: '#F59E0B' }]}
                    onPress={() => {
                      const msg = `Hey ${st.fromName}, just a reminder to pay me ${fmt(st.amount)} on Dabbu!`;
                      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() =>
                        Alert.alert('Reminder', msg),
                      );
                    }}
                  >
                    <AntDesign name="bells" size={12} color="#FFF" />
                    <Text style={s.payBtnText}>Remind</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* This Month */}
        <View
          style={[
            s.monthCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.monthIcon, { backgroundColor: '#F59E0B' + '12' }]}>
              <AntDesign name="calendar" size={14} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.monthLabel, { color: colors.text.tertiary }]}>This Month</Text>
              <Text style={[s.monthValue, { color: '#F59E0B' }]}>{fmt(monthlySpending)}</Text>
            </View>
            <View style={[s.countBadge, { backgroundColor: colors.accent.primary + '12' }]}>
              <Text style={[s.countText, { color: colors.accent.primary }]}>
                {thisMonthExpenses.length} txn{thisMonthExpenses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Health Score */}
        {analyticsData?.healthScore !== null && analyticsData?.healthScore !== undefined && (
          <View
            style={[
              s.monthCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  s.monthIcon,
                  {
                    backgroundColor:
                      (analyticsData.healthScore >= 70
                        ? '#34C759'
                        : analyticsData.healthScore >= 40
                          ? '#F59E0B'
                          : '#FF3B30') + '12',
                  },
                ]}
              >
                <AntDesign
                  name="heart"
                  size={14}
                  color={
                    analyticsData.healthScore >= 70
                      ? '#34C759'
                      : analyticsData.healthScore >= 40
                        ? '#F59E0B'
                        : '#FF3B30'
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.monthLabel, { color: colors.text.tertiary }]}>Group Health</Text>
                <Text
                  style={[
                    s.monthValue,
                    {
                      color:
                        analyticsData.healthScore >= 70
                          ? '#34C759'
                          : analyticsData.healthScore >= 40
                            ? '#F59E0B'
                            : '#FF3B30',
                    },
                  ]}
                >
                  {analyticsData.healthScore}%
                </Text>
              </View>
              {analyticsData.fairnessScore !== null &&
                analyticsData.fairnessScore !== undefined && (
                  <View style={{ alignItems: 'flex-end', marginRight: spacing.sm }}>
                    <Text style={{ fontSize: 9, color: colors.text.tertiary, fontWeight: '500' }}>
                      Fairness
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: analyticsData.fairnessScore >= 0.5 ? '#34C759' : '#F59E0B',
                      }}
                    >
                      {(analyticsData.fairnessScore * 100).toFixed(0)}%
                    </Text>
                  </View>
                )}
              {analyticsData.settlementScore !== null &&
                analyticsData.settlementScore !== undefined && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: colors.text.tertiary, fontWeight: '500' }}>
                      Settled
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: analyticsData.settlementScore >= 70 ? '#34C759' : '#F59E0B',
                      }}
                    >
                      {analyticsData.settlementScore}%
                    </Text>
                  </View>
                )}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <View>
            <View style={s.sectionHeader}>
              <View
                style={{
                  width: 4,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: colors.accent.primary,
                }}
              />
              <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>
                Spending by Category
              </Text>
            </View>
            <View
              style={[
                s.catCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              {categoryBreakdown.slice(0, 5).map((c, i) => (
                <View key={c.category}>
                  {i > 0 && (
                    <View style={[s.catDivider, { backgroundColor: colors.border.subtle }]} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        s.catDot,
                        {
                          backgroundColor: [
                            colors.accent.primary,
                            colors.status.error,
                            colors.status.success,
                            '#F59E0B',
                            '#8B5CF6',
                          ][i % 5],
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Text style={[s.catName, { color: colors.text.primary }]}>
                          {c.category}
                        </Text>
                        <Text style={[s.catAmount, { color: colors.text.secondary }]}>
                          {fmt(c.amount)}
                        </Text>
                      </View>
                      <View style={s.catBarBg}>
                        <View
                          style={[
                            s.catBarFill,
                            {
                              width: `${Math.max(c.percentage, 3)}%`,
                              backgroundColor: [
                                colors.accent.primary,
                                colors.status.error,
                                colors.status.success,
                                '#F59E0B',
                                '#8B5CF6',
                              ][i % 5],
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[s.catPercent, { color: colors.text.tertiary }]}>
                      {c.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Insights */}
        {expenses.length > 0 && (
          <View
            style={[
              s.insightCard,
              {
                backgroundColor: colors.accent.primary + '08',
                borderColor: colors.accent.primary + '20',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AntDesign name="bulb1" size={14} color={colors.accent.primary} />
              <Text style={[s.insightTitle, { color: colors.accent.primary }]}>Group Insights</Text>
            </View>
            <View style={{ gap: 3, marginTop: 6 }}>
              <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                Total expenses: <Text style={{ fontWeight: '700' }}>{expenses.length}</Text> · Avg:{' '}
                <Text style={{ fontWeight: '700' }}>
                  {fmt(Math.round(totalSpent / expenses.length))}
                </Text>
              </Text>
              {categoryBreakdown.length > 0 && (
                <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                  Top category:{' '}
                  <Text style={{ fontWeight: '700' }}>{categoryBreakdown[0].category}</Text> (
                  {categoryBreakdown[0].percentage.toFixed(0)}% of total)
                </Text>
              )}
              {myBalanceRow && (
                <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                  Your balance:{' '}
                  <Text
                    style={{
                      fontWeight: '700',
                      color: (myBalanceRow.balance || 0) >= 0 ? '#34C759' : colors.status.error,
                    }}
                  >
                    {myBalanceRow.balance >= 0 ? '+' : ''}
                    {fmt(Math.round(myBalanceRow.balance))}
                  </Text>
                </Text>
              )}
              {members.length > 1 && (
                <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                  Per person avg:{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {fmt(Math.round(totalSpent / members.length))}
                  </Text>
                </Text>
              )}
            </View>
          </View>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <View>
            <View style={s.sectionHeader}>
              <View
                style={{
                  width: 4,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: colors.accent.primary,
                }}
              />
              <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>AI Insights</Text>
            </View>
            {insights.map((ins: any, i: number) => {
              const sevColor =
                ins.severity === 'critical'
                  ? '#FF3B30'
                  : ins.severity === 'warning'
                    ? '#F59E0B'
                    : ins.severity === 'success'
                      ? '#34C759'
                      : colors.accent.primary;
              return (
                <View
                  key={i}
                  style={[
                    s.insightCard,
                    { backgroundColor: sevColor + '08', borderColor: sevColor + '20' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AntDesign
                      name={
                        ins.severity === 'critical'
                          ? 'warning'
                          : ins.severity === 'warning'
                            ? 'exclamationcircleo'
                            : 'bulb1'
                      }
                      size={14}
                      color={sevColor}
                    />
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: sevColor, flex: 1 }}
                      numberOfLines={1}
                    >
                      {ins.title}
                    </Text>
                  </View>
                  <Text style={[s.insightLine, { color: colors.text.secondary, marginTop: 4 }]}>
                    {ins.message}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Members */}
        {members.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <View
                style={{
                  width: 4,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: colors.accent.primary,
                }}
              />
              <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>Members</Text>
              <View style={{ flex: 1 }} />
              {!(type === 'couple' && members.length >= 2) && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('AddMember', {
                      groupId,
                      type: 'shared-finance',
                      existingMemberIds: members.map((m: any) => m.userId).filter(Boolean),
                    })
                  }
                >
                  <AntDesign name="pluscircleo" size={16} color={colors.accent.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={s.membersRow}>
              {members.slice(0, 6).map((m: any) => {
                const u = m.user;
                const initial = (u?.firstName || u?.email || '?')[0]?.toUpperCase();
                return (
                  <View key={m.id || u?.id} style={s.memberChip}>
                    <View style={[s.memberAvatar, { backgroundColor: theme.chipColor + '20' }]}>
                      <Text style={[s.memberInitial, { color: theme.chipColor }]}>{initial}</Text>
                    </View>
                    <Text
                      style={[s.memberChipName, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {u?.firstName || 'Member'}
                    </Text>
                  </View>
                );
              })}
              {members.length > 6 && (
                <View style={s.memberChip}>
                  <View style={[s.memberAvatar, { backgroundColor: colors.bg.tertiary }]}>
                    <Text style={[s.memberInitial, { color: colors.text.tertiary }]}>
                      +{members.length - 6}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {/* Member Spending Summary */}
            {analyticsData?.memberSpending && analyticsData.memberSpending.length > 1 && (
              <View
                style={[
                  s.catCard,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.subtle,
                    marginTop: spacing.xs,
                  },
                ]}
              >
                {analyticsData.memberSpending.slice(0, 5).map((ms: any, i: number) => {
                  const msColor =
                    ms.netPosition > 0
                      ? colors.status.success
                      : ms.netPosition < 0
                        ? colors.status.error
                        : colors.text.tertiary;
                  return (
                    <View key={ms.userId}>
                      {i > 0 && (
                        <View style={[s.catDivider, { backgroundColor: colors.border.subtle }]} />
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: colors.text.primary,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {ms.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                          Paid {fmt(ms.totalPaid)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: msColor,
                            minWidth: 50,
                            textAlign: 'right',
                          }}
                        >
                          {ms.netPosition >= 0 ? '+' : ''}
                          {fmt(ms.netPosition)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Recent Expenses */}
        <View style={s.sectionHeader}>
          <View
            style={{
              width: 4,
              height: 14,
              borderRadius: 2,
              backgroundColor: colors.accent.primary,
            }}
          />
          <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>Recent Expenses</Text>
        </View>

        {expenses.length === 0 ? (
          <View
            style={[
              s.emptyBox,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <AntDesign name="inbox" size={28} color={colors.text.tertiary} />
            <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No expenses yet</Text>
          </View>
        ) : (
          sortedExpenses.slice(0, 20).map((item: any) => {
            const payer = members.find((m: any) => m.userId === item.paidBy);
            const payerName = payer?.user?.firstName || payer?.user?.email || 'Someone';
            const mySplit = item.splits?.find((s: any) => s.userId === currentUser?.id);
            const myShare = mySplit ? Number(mySplit.amount) : 0;
            const iPaid = item.paidBy === currentUser?.id;
            const cat = item.category || 'Other';
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  s.txnCard,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('SharedExpenseForm', {
                    groupId,
                    expenseId: item.id,
                    edit: true,
                  })
                }
                onLongPress={() => {
                  Alert.alert(item.description || 'Expense', 'Choose action', [
                    {
                      text: 'Edit',
                      onPress: () =>
                        navigation.navigate('SharedExpenseForm', {
                          groupId,
                          expenseId: item.id,
                          edit: true,
                        }),
                    },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => confirmDeleteExpense(item.id),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <View style={s.txnRow}>
                  <View style={[s.txnIconBg, { backgroundColor: colors.accent.primary + '12' }]}>
                    <AntDesign name="wallet" size={14} color={colors.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.txnDesc, { color: colors.text.primary }]} numberOfLines={1}>
                      {item.description || cat}
                    </Text>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                    >
                      <Text style={[s.txnSub, { color: colors.text.tertiary }]}>{payerName}</Text>
                      <View style={[s.catBadge, { backgroundColor: colors.accent.primary + '10' }]}>
                        <Text style={[s.catBadgeText, { color: colors.accent.primary }]}>
                          {typeof cat === 'string' ? cat : 'Other'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.txnDate, { color: colors.text.tertiary }]}>
                        {fmtDate(item.date || item.createdAt)}
                      </Text>
                      {myShare > 0 && !iPaid ? (
                        <Text style={[s.shareText, { color: colors.accent.primary }]}>
                          Your share: {fmt(myShare)}
                        </Text>
                      ) : iPaid ? (
                        <Text style={[s.shareText, { color: '#34C759' }]}>
                          You paid {fmt(Number(item.amount || 0))}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[s.txnAmount, { color: colors.text.primary }]}>
                    {fmt(Number(item.amount || 0))}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('SharedExpenseForm', { groupId, edit: false })}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* Settings Modal */}
      {settingsOpen && (
        <Modal
          visible
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
                      <AntDesign name="check" size={18} color="#FFF" />
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
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: 17, fontWeight: '800' },
  heroMeta: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  typeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
  },
  actionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  summaryCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.lg, gap: 4 },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  settlementCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  settlementIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementTitle: { fontSize: 14, fontWeight: '700' },
  viewAllText: { fontSize: 12, fontWeight: '600' },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  settleLabel: { fontSize: 13, fontWeight: '600' },
  settleAmount: { fontSize: 11, marginTop: 1 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  payBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  monthCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  monthIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 10, fontWeight: '500', marginBottom: 2 },
  monthValue: { fontSize: 16, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  countText: { fontSize: 10, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  memberChip: { alignItems: 'center', gap: 3, width: 56 },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 13, fontWeight: '700' },
  memberChipName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  emptyBox: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  txnCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txnIconBg: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnDesc: { fontSize: 13, fontWeight: '600' },
  txnSub: { fontSize: 10, fontWeight: '500' },
  catBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  catBadgeText: { fontSize: 8, fontWeight: '700' },
  txnDate: { fontSize: 9, fontWeight: '500' },
  shareText: { fontSize: 9, fontWeight: '600' },
  txnAmount: { fontSize: 14, fontWeight: '700' },
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
    elevation: 4,
  },
  errText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retry: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
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
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  catCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  catDivider: { height: 1, marginVertical: spacing.sm },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: '600' },
  catAmount: { fontSize: 12, fontWeight: '600' },
  catBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.12)' },
  catBarFill: { height: 4, borderRadius: 2 },
  catPercent: { fontSize: 11, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  insightCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  insightTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightLine: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
});
