import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard } from '../../components/ui/AnimatedSkeleton';
import { AiInsightCard } from '../../components/ui/AiInsightCard';

function fmt(v: number) {
  return '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
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

const GROUP_TABS = ['overview', 'expenses', 'members', 'activity', 'settings'] as const;
const GROUP_ICONS = [
  'users',
  'home',
  'heart',
  'star',
  'briefcase',
  'cart',
  'airplane',
  'restaurant',
  'car',
  'fitness',
];

const GROUP_ICONS_MAP: Record<string, string> = {
  users: 'people',
  home: 'home',
  heart: 'heart',
  star: 'star',
  briefcase: 'briefcase',
  cart: 'cart',
  airplane: 'airplane',
  restaurant: 'restaurant',
  car: 'car',
  fitness: 'fitness',
};

const SECTIONS = [
  { key: 'couple', label: 'Couples', icon: 'heart', types: ['couple'] },
  { key: 'groups', label: 'Groups', icon: 'people', types: ['friends', 'roommates', 'office'] },
  { key: 'trips', label: 'Trips', icon: 'airplane', types: ['trip'] },
  { key: 'families', label: 'Families', icon: 'home', types: ['family'] },
];

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) {
    return '';
  }
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function GroupExpensesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName: routeGroupName } = route.params || {};

  const [groups, setGroups] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [invitePhone, setInvitePhone] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
  const inviteSearchRef = useRef<NodeJS.Timeout>();
  const [editIcon, setEditIcon] = useState('users');
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
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

        if (groupId) {
          const [txRes, grpRes, catRes] = await Promise.allSettled([
            api.get<any>(`/transactions?expenseGroupId=${groupId}`, ctrl.signal),
            api.get<any>(`/expense-groups/${groupId}`, ctrl.signal),
            api.get<any>(`/transactions/categories-summary?expenseGroupId=${groupId}`, ctrl.signal),
          ]);
          if (ctrl.signal.aborted) {
            return;
          }

          const txData = normalize<any[]>(txRes.status === 'fulfilled' ? txRes.value : null);
          const gData = grpRes.status === 'fulfilled' ? normalize<any>(grpRes.value) : null;
          const catData = catRes.status === 'fulfilled' ? normalize<any[]>(catRes.value) : [];
          if (txRes.status === 'rejected' && grpRes.status === 'rejected') {
            throw new Error('Unable to load');
          }

          setTransactions(Array.isArray(txData) ? txData : []);
          setGroup(gData);
          setCategoryBreakdown(Array.isArray(catData) ? catData : []);
          if (gData) {
            setEditName(gData.name || '');
            setEditDescription(gData.description || '');

            setEditIcon(gData.icon || 'users');
          }
        } else {
          const [grpResult, txResult] = await Promise.allSettled([
            api.get<any>('/expense-groups', ctrl.signal),
            api.get<any>('/transactions', ctrl.signal),
          ]);
          if (ctrl.signal.aborted) {
            return;
          }

          const g =
            grpResult.status === 'fulfilled'
              ? Array.isArray(grpResult.value)
                ? grpResult.value
                : Array.isArray(grpResult.value?.data)
                  ? grpResult.value.data
                  : []
              : [];
          const txData =
            txResult.status === 'fulfilled'
              ? Array.isArray(txResult.value)
                ? txResult.value
                : Array.isArray(txResult.value?.data)
                  ? txResult.value.data
                  : []
              : [];

          setGroups(g);
          setTransactions(txData);
          setGroup(null);
        }

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

  const [aiTriggered, setAiTriggered] = useState(false);
  useEffect(() => {
    if (!loading && transactions.length > 3 && !aiTriggered) {
      setAiTriggered(true);
      loadAiInsights();
    }
  }, [loading, transactions.length, aiTriggered]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        abortRef.current?.abort();
        setAiTriggered(false);
      };
    }, [loadData]),
  );

  const planInfo = useMemo(
    () => groups[0]?._plan || { tier: 'free', maxGroups: 5, maxMembersPerGroup: 2 },
    [groups],
  );

  const groupExpenses = useMemo(() => {
    const map: Record<string, { total: number; count: number; latest: any }> = {};
    for (const tx of transactions) {
      const gid = tx.expenseGroupId;
      if (!gid) {
        continue;
      }
      if (!map[gid]) {
        map[gid] = { total: 0, count: 0, latest: null };
      }
      map[gid].total += Number(tx.amount);
      map[gid].count += 1;
      if (!map[gid].latest || new Date(tx.date) > new Date(map[gid].latest.date)) {
        map[gid].latest = tx;
      }
    }
    return map;
  }, [transactions]);

  const sectionedGroups = useMemo(() => {
    return SECTIONS.map((s) => ({
      ...s,
      groups: groups.filter((g) => s.types.includes(g.type)),
    })).filter((s) => s.groups.length > 0);
  }, [groups]);

  const members = useMemo(() => (Array.isArray(group?.members) ? group.members : []), [group]);

  const currentMember = useMemo(
    () => members.find((m: any) => m.userId === currentUser?.id),
    [members, currentUser],
  );

  const isAdmin = useMemo(
    () => currentMember?.role === 'admin' || group?.createdBy === currentUser?.id,
    [currentMember, group, currentUser],
  );

  const memberMap = useMemo(() => {
    const m: Record<string, any> = {};
    members.forEach((mem: any) => {
      if (mem?.userId) {
        m[mem.userId] = mem.user || mem;
      }
    });
    return m;
  }, [members]);

  const name = group?.name || routeGroupName || 'Group';

  const [aiNarrative, setAiNarrative] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalIncome = monthly
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = monthly
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return {
      totalIncome,
      totalExpense,
      remaining: totalIncome - totalExpense,
      totalCount: monthly.filter((t) => t.type === 'expense').length,
      incomeCount: monthly.filter((t) => t.type === 'income').length,
      monthlySpending: totalExpense,
      monthlyAverage:
        (transactions.length > 0
          ? transactions.reduce((s, t) => s + Number(t.amount || 0), 0) / transactions.length
          : 0) * 30,
    };
  }, [transactions, group]);

  async function loadAiInsights(force = false) {
    if ((loadingAi || aiNarrative) && !force) {
      return;
    }
    setLoadingAi(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>(`/ai/groups/${groupId}/insights`);
      setAiNarrative(res?.data || null);
    } catch (e: any) {
      console.warn('AI insights unavailable:', e.message);
    } finally {
      setLoadingAi(false);
    }
  }

  async function saveGroupSettings() {
    if (!editName.trim()) {
      return Alert.alert('Group name required', 'Please enter a group name.');
    }
    setSavingGroup(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/expense-groups/${groupId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        icon: editIcon,
      });
      await loadData(true);
      setSettingsOpen(false);
    } catch (e: any) {
      Alert.alert('Unable to save', e.message || 'Try again');
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleExport() {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>(`/shared-finance/groups/${groupId}/export`, {});
      const url = res?.fileUrl || res?.data?.fileUrl;
      if (url) {
        Alert.alert('Report Ready', `Download link: ${url}`);
      } else {
        Alert.alert('Export queued', 'Your report will be emailed to you.');
      }
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Try again');
    }
  }

  async function addMember(phone?: string) {
    const num = phone || invitePhone;
    if (!num.trim()) {
      return;
    }
    setSavingGroup(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post(`/expense-groups/${groupId}/members/add-by-phone`, {
        phone: `+91${num.trim()}`,
      });
      setInvitePhone('');
      setInviteSearchResults([]);
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Unable to add member', e.message || 'Try again');
    } finally {
      setSavingGroup(false);
    }
  }

  async function removeMember(member: any) {
    Alert.alert(
      'Remove member',
      `Remove ${member.user?.firstName || member.user?.email || 'this member'}?`,
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
              await api.delete(`/expense-groups/${groupId}/members/${member.id}`);
              await loadData(true);
            } catch (e: any) {
              Alert.alert('Unable to remove member', e.message || 'Try again');
            }
          },
        },
      ],
    );
  }

  async function changeMemberRole(member: any, role: 'admin' | 'member') {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/expense-groups/${groupId}/members/${member.id}/role`, { role });
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Unable to update role', e.message || 'Try again');
    }
  }

  async function leaveGroup() {
    Alert.alert(
      'Leave group',
      'You will lose access to this group unless another member adds you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              if (accessToken) {
                setAccessToken(accessToken);
              }
              await api.post(`/expense-groups/${groupId}/leave`);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Unable to leave group', e.message || 'Try again');
            }
          },
        },
      ],
    );
  }

  function handleCreateGroup() {
    if (groups.length >= planInfo.maxGroups) {
      Alert.alert(
        'Plan Limit',
        `Free plan allows ${planInfo.maxGroups} groups. Upgrade for more.`,
        [
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('Settings', { screen: 'Subscription' }),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    navigation.navigate('CreateExpenseGroup');
  }

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.loadWrap, { paddingTop: insets.top + 8 }]}>
          {groupId ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 20,
                }}
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
                  <Skeleton
                    key={i}
                    style={{ flex: 1 }}
                    width="100%"
                    height={80}
                    borderRadius={18}
                  />
                ))}
              </View>
              <View style={{ marginTop: 20, paddingHorizontal: 20, gap: 10 }}>
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            </>
          ) : (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: 24,
                  paddingBottom: 16,
                }}
              >
                <View style={{ gap: 4 }}>
                  <Skeleton width={60} height={14} />
                  <Skeleton width={180} height={28} />
                </View>
                <Skeleton width={44} height={44} borderRadius={14} />
              </View>
              <Skeleton
                width="90%"
                height={44}
                borderRadius={12}
                style={{ marginHorizontal: 24, marginBottom: 16 }}
              />
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} style={{ marginHorizontal: 24, marginBottom: 12 }} />
              ))}
            </>
          )}
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

  if (groupId) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.accent.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.headerRow, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[
                  s.iconBtn,
                  {
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={[s.avatar, { backgroundColor: colors.accent.primary }]}>
                <Ionicons
                  name={(GROUP_ICONS_MAP[group?.icon] || 'people') as any}
                  size={24}
                  color="#FFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: colors.text.primary }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[s.memberCount, { color: colors.text.tertiary }]}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSettingsOpen(true)}
                style={[s.iconBtn, { backgroundColor: colors.bg.tertiary }]}
              >
                <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.actionBar}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('CreateTransaction', {
                    prefill: { groupId, groupName: name, returnTo: 'GroupExpenses' },
                  })
                }
                style={[s.actionBtn, { backgroundColor: colors.accent.primary }]}
              >
                <Ionicons name="add" size={22} color="#FFF" />
                <Text style={s.actionLabel}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Analytics')}
                style={[
                  s.actionBtn,
                  {
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="bar-chart" size={22} color={colors.text.primary} />
                <Text style={[s.actionLabel, { color: colors.text.primary }]}>Analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMembersOpen(true)}
                style={[
                  s.actionBtn,
                  {
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="people" size={22} color={colors.text.primary} />
                <Text style={[s.actionLabel, { color: colors.text.primary }]}>Members</Text>
              </TouchableOpacity>
            </View>

            <View style={s.grid}>
              <View
                style={[
                  s.statCard,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Income</Text>
                <Text style={[s.statVal, { color: colors.text.primary }]}>
                  {fmt(stats.totalIncome)}
                </Text>
              </View>
              <View
                style={[
                  s.statCard,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                <Text style={[s.statVal, { color: colors.text.primary }]}>
                  {fmt(stats.totalExpense)}
                </Text>
              </View>
              <View
                style={[
                  s.statCard,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Left</Text>
                <Text style={[s.statVal, { color: colors.text.primary }]}>
                  {fmt(Math.abs(stats.remaining))}
                </Text>
              </View>
            </View>
            {stats.totalIncome > 0 && (
              <View style={[s.budgetBar, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[
                    s.budgetFill,
                    {
                      width: `${Math.min((stats.totalExpense / stats.totalIncome) * 100, 100)}%`,
                      backgroundColor: colors.accent.primary,
                    },
                  ]}
                />
              </View>
            )}

            {categoryBreakdown.length > 0 && (
              <View style={{ marginTop: 18, paddingHorizontal: 20 }}>
                <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Spending Summary</Text>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {categoryBreakdown.slice(0, 5).map((cat: any, i: number) => {
                    const pct =
                      stats.totalExpense > 0 ? ((cat.amount || 0) / stats.totalExpense) * 100 : 0;
                    return (
                      <View
                        key={cat.category || i}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '500',
                                color: colors.text.primary,
                              }}
                            >
                              {cat.category || cat.name}
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                              {fmt(cat.amount || 0)}
                            </Text>
                          </View>
                          <View
                            style={[
                              s.budgetBar,
                              { marginTop: 4, backgroundColor: colors.bg.tertiary },
                            ]}
                          >
                            <View
                              style={[
                                s.budgetFill,
                                { width: `${pct}%`, backgroundColor: colors.accent.primary },
                              ]}
                            />
                          </View>
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.text.tertiary,
                            width: 36,
                            textAlign: 'right',
                          }}
                        >
                          {pct.toFixed(0)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {members.length > 0 && (
              <View style={s.memberSection}>
                <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Members</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {members.map((m: any) => (
                    <View
                      key={m.id}
                      style={[s.memberChip, { backgroundColor: colors.bg.tertiary }]}
                    >
                      <View style={[s.memberDot, { backgroundColor: colors.bg.tertiary }]}>
                        <Text style={s.memberInit}>
                          {(m.user?.firstName?.[0] || m.firstName?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[s.memberName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {m.user?.firstName || m.user?.email || m.firstName || 'Member'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {group?.isExpired && (
              <View
                style={[
                  s.expiredBanner,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.status.warning },
                ]}
              >
                <Ionicons name="lock-closed" size={16} color={colors.status.warning} />
                <Text style={[s.expiredBannerText, { color: colors.text.secondary }]}>
                  This circle expired on {new Date(group.expiresAt).toLocaleDateString('en-IN')}. It
                  is now read-only.
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 8,
              }}
            >
              <Text style={[s.secTitle, { color: colors.text.tertiary, flex: 1 }]}>
                Transactions {transactions.length > 0 ? `\u00B7 ${transactions.length}` : ''}
              </Text>
              {group?.isExpired && (
                <TouchableOpacity
                  onPress={() => handleExport()}
                  style={[s.addTinyBtn, { backgroundColor: colors.accent.primary }]}
                >
                  <Ionicons name="download-outline" size={14} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Export</Text>
                </TouchableOpacity>
              )}
            </View>

            {transactions.length > 3 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <AiInsightCard
                  narrative={aiNarrative}
                  loading={loadingAi}
                  onReload={() => loadAiInsights(true)}
                  type="group"
                />
              </View>
            )}

            {transactions.map((item: any) => {
              const isIncome = item.type === 'income';
              const user = memberMap[item.userId];
              const userName = user
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You'
                : 'You';
              const cat = item.category?.name || item.category || 'Other';
              const date = new Date(item.date || item.createdAt || '');
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    s.txCard,
                    {
                      backgroundColor: colors.bg.secondary,
                      borderColor: colors.border.default,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate('TransactionDetail', { transactionId: item.id })
                  }
                  activeOpacity={0.8}
                >
                  <View style={[s.txAvatar, { backgroundColor: colors.bg.secondary }]}>
                    <Text style={[s.txAvatarText, { color: colors.text.primary }]}>
                      {userName[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.txTop}>
                      <Text style={[s.txUser, { color: colors.text.primary }]} numberOfLines={1}>
                        {userName}
                      </Text>
                      <Text
                        style={[
                          s.txAmount,
                          { color: isIncome ? colors.text.primary : colors.text.primary },
                        ]}
                      >
                        {isIncome ? '+' : '-'}
                        {fmt(Number(item.amount || 0))}
                      </Text>
                    </View>
                    <View style={s.txBottom}>
                      <Text style={[s.txDesc, { color: colors.text.tertiary }]} numberOfLines={1}>
                        {item.description || cat}
                      </Text>
                      {!isNaN(date.getTime()) && (
                        <Text style={[s.txTime, { color: colors.text.tertiary }]}>
                          {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {transactions.length === 0 && (
              <View style={s.empty}>
                <View style={[s.emptyIcon, { backgroundColor: colors.bg.secondary }]}>
                  <Ionicons name="receipt-outline" size={44} color={colors.text.tertiary} />
                </View>
                <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No expenses yet</Text>
                <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                  Add your first expense
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <Modal
          visible={settingsOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setSettingsOpen(false)}
        >
          <View style={s.modalBackdrop}>
            <View
              style={[
                s.sheet,
                { backgroundColor: colors.bg.primary, paddingBottom: insets.bottom + 18 },
              ]}
            >
              <View style={s.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.sheetHeader}>
                  <Text style={[s.sheetTitle, { color: colors.text.primary }]}>Group Settings</Text>
                  <TouchableOpacity
                    onPress={() => setSettingsOpen(false)}
                    style={[s.sheetClose, { backgroundColor: colors.bg.tertiary }]}
                  >
                    <Ionicons name="close" size={20} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[s.inputLabel, { color: colors.text.tertiary }]}>Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  editable={isAdmin}
                  style={[
                    s.input,
                    {
                      backgroundColor: isAdmin ? colors.bg.tertiary : colors.bg.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                      opacity: isAdmin ? 1 : 0.6,
                    },
                  ]}
                  placeholderTextColor={colors.text.tertiary}
                />
                <Text style={[s.inputLabel, { color: colors.text.tertiary }]}>Description</Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  editable={isAdmin}
                  style={[
                    s.input,
                    {
                      backgroundColor: isAdmin ? colors.bg.tertiary : colors.bg.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                      opacity: isAdmin ? 1 : 0.6,
                    },
                  ]}
                  placeholder="Trip, home, office..."
                  placeholderTextColor={colors.text.tertiary}
                />
                <TouchableOpacity
                  style={[
                    s.primaryAction,
                    { backgroundColor: isAdmin ? colors.accent.primary : colors.text.tertiary },
                  ]}
                  onPress={isAdmin ? saveGroupSettings : undefined}
                  disabled={!isAdmin || savingGroup}
                >
                  {savingGroup ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={s.primaryActionText}>Save Group</Text>
                  )}
                </TouchableOpacity>
                {!isAdmin && (
                  <Text style={[s.restrictedNote, { color: colors.text.tertiary }]}>
                    Only admins can modify group settings.
                  </Text>
                )}

                <Text style={[s.sheetSubTitle, { color: colors.text.tertiary }]}>
                  Manage members via the Members button above
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={membersOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setMembersOpen(false)}
        >
          <View style={s.modalBackdrop}>
            <View
              style={[
                s.sheet,
                { backgroundColor: colors.bg.primary, paddingBottom: insets.bottom + 18 },
              ]}
            >
              <View style={s.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.sheetHeader}>
                  <Text style={[s.sheetTitle, { color: colors.text.primary }]}>Members</Text>
                  <TouchableOpacity
                    onPress={() => setMembersOpen(false)}
                    style={[s.sheetClose, { backgroundColor: colors.bg.tertiary }]}
                  >
                    <Ionicons name="close" size={20} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[s.sheetSubTitle, { color: colors.text.primary }]}>Add Member</Text>
                <View style={[s.addMemberBox, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={{ color: colors.text.secondary, fontSize: 14, marginLeft: 4 }}>
                    +91
                  </Text>
                  <TextInput
                    value={invitePhone}
                    onChangeText={(t) => {
                      const digits = t.replace(/[^0-9]/g, '').slice(0, 10);
                      setInvitePhone(digits);
                      if (inviteSearchRef.current) {
                        clearTimeout(inviteSearchRef.current);
                      }
                      if (digits.length >= 3) {
                        inviteSearchRef.current = setTimeout(async () => {
                          try {
                            const res = await api.get<any>(`/users/search?query=+91${digits}`);
                            setInviteSearchResults(Array.isArray(res) ? res : res?.data || []);
                          } catch {
                            setInviteSearchResults([]);
                          }
                        }, 400);
                      } else {
                        setInviteSearchResults([]);
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="phone-pad"
                    style={[s.memberInput, { color: colors.text.primary }]}
                    placeholder="9876543210"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={10}
                  />
                  <TouchableOpacity
                    onPress={() => addMember()}
                    style={[s.memberAddBtn, { backgroundColor: colors.accent.primary }]}
                  >
                    <Ionicons name="person-add-outline" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
                {inviteSearchResults.length > 0 && (
                  <View
                    style={[
                      s.suggestionsBox,
                      { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                    ]}
                  >
                    {inviteSearchResults.map((user: any) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[s.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                        onPress={() => addMember((user.phone || '').replace('+91', ''))}
                      >
                        <Text style={{ flex: 1, fontSize: 13, color: colors.text.primary }}>
                          {(user.phone || '').replace('+91', '')} - {user.firstName || ''}{' '}
                          {user.lastName || ''}
                        </Text>
                        <Ionicons name="add-circle" size={18} color={colors.accent.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <Text style={[s.sheetSubTitle, { color: colors.text.primary }]}>All Members</Text>
                {members.map((member: any) => (
                  <View
                    key={member.id}
                    style={[s.memberManageRow, { borderBottomColor: colors.border.subtle }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.memberManageName, { color: colors.text.primary }]}>
                        {member.user?.firstName || member.user?.phone || 'Member'}
                      </Text>
                      <Text style={[s.memberManageRole, { color: colors.text.tertiary }]}>
                        {member.role || 'member'}
                      </Text>
                    </View>
                    {member.userId !== currentUser?.id && (
                      <TouchableOpacity
                        onPress={() =>
                          changeMemberRole(member, member.role === 'admin' ? 'member' : 'admin')
                        }
                        style={s.roleActionBtn}
                      >
                        <Text style={[s.roleActionText, { color: colors.accent.primary }]}>
                          {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {member.role !== 'admin' && (
                      <TouchableOpacity
                        onPress={() => removeMember(member)}
                        style={s.removeMemberBtn}
                      >
                        <Ionicons name="remove-circle-outline" size={22} color="#FF6B6B" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {group?.createdBy !== currentUser?.id && (
                  <TouchableOpacity
                    style={[s.dangerAction, { backgroundColor: colors.bg.secondary }]}
                    onPress={leaveGroup}
                  >
                    <Ionicons name="exit-outline" size={18} color={colors.status.error} />
                    <Text style={[s.dangerText, { color: colors.status.error }]}>Leave Group</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          groups.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 120 }
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[s.hubHeader, { paddingTop: insets.top + 8 }]}>
            <View>
              <Text style={[s.hubSubtitle, { color: colors.text.tertiary }]}>Spaces</Text>
              <Text style={[s.hubTitle, { color: colors.text.primary }]}>
                Manage your shared spaces
              </Text>
            </View>
          </View>

          <View style={[s.planBar, { backgroundColor: colors.bg.secondary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={planInfo.tier === 'free' ? 'shield-outline' : 'shield-checkmark'}
                size={16}
                color={planInfo.tier === 'free' ? '#FF6B6B' : '#00B894'}
              />
              <Text style={[s.planText, { color: colors.text.secondary }]}>
                {groups.length}/{planInfo.maxGroups} spaces
              </Text>
            </View>
            {planInfo.tier === 'free' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
              >
                <Text style={[s.planAction, { color: colors.accent.primary }]}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>

          {sectionedGroups.length === 0 ? (
            <View style={s.emptyHub}>
              <View style={[s.emptyHubIcon, { backgroundColor: `${colors.accent.primary}20` }]}>
                <Ionicons name="layers-outline" size={44} color={colors.accent.primary} />
              </View>
              <Text style={[s.emptyHubTitle, { color: colors.text.primary }]}>No spaces yet</Text>
              <Text style={[s.emptyHubDesc, { color: colors.text.tertiary }]}>
                Create a shared space to split expenses with friends, family, and more
              </Text>
              <TouchableOpacity
                style={[s.emptyHubCta, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={s.emptyHubCtaText}>Create Space</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sectionedGroups.map((section) => (
              <View key={section.key} style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionHeaderLeft}>
                    <View style={[s.sectionIconWrap, { backgroundColor: colors.bg.tertiary }]}>
                      <Ionicons
                        name={section.icon as any}
                        size={16}
                        color={colors.text.secondary}
                      />
                    </View>
                    <Text style={[s.sectionLabel, { color: colors.text.primary }]}>
                      {section.label}
                    </Text>
                    <View style={[s.sectionCount, { backgroundColor: colors.accent.primary }]}>
                      <Text style={s.sectionCountText}>{section.groups.length}</Text>
                    </View>
                  </View>
                </View>

                {section.groups.map((item) => {
                  const ed = groupExpenses[item.id] || { total: 0, count: 0, latest: null };

                  return (
                    <View
                      key={item.id}
                      style={[
                        s.cardWrap,
                        {
                          shadowColor: isDark ? '#000' : colors.border.subtle,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 10,
                          elevation: 4,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate('GroupExpenses', {
                            groupId: item.id,
                            groupName: item.name,
                          })
                        }
                      >
                        <View
                          style={[
                            s.card,
                            {
                              backgroundColor: colors.bg.secondary,
                              borderColor: colors.border.default,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <View style={s.cardTop}>
                            <View style={[s.cardAvatar, { backgroundColor: colors.bg.secondary }]}>
                              <Ionicons
                                name={(GROUP_ICONS_MAP[item.icon] || 'people') as any}
                                size={22}
                                color={colors.text.secondary}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[s.cardName, { color: colors.text.primary }]}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text style={[s.cardMembers, { color: colors.text.secondary }]}>
                                <Ionicons
                                  name="people-outline"
                                  size={11}
                                  color={colors.text.secondary}
                                />{' '}
                                {item._count?.members || 0} member
                                {(item._count?.members || 0) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={colors.text.tertiary}
                            />
                          </View>

                          <View
                            style={[s.cardDivider, { backgroundColor: colors.border.subtle }]}
                          />

                          <View style={s.statsRow}>
                            <View
                              style={[
                                s.stat,
                                {
                                  backgroundColor: colors.bg.card,
                                  borderColor: colors.border.default,
                                  borderWidth: 1,
                                },
                              ]}
                            >
                              <Text style={[s.statLabel, { color: colors.text.tertiary }]}>
                                Total
                              </Text>
                              <Text
                                style={[s.statVal, { color: colors.text.primary, marginTop: 4 }]}
                              >
                                {fmt(ed.total)}
                              </Text>
                            </View>
                            <View
                              style={[
                                s.stat,
                                {
                                  backgroundColor: colors.bg.card,
                                  borderColor: colors.border.default,
                                  borderWidth: 1,
                                },
                              ]}
                            >
                              <Text style={[s.statLabel, { color: colors.text.tertiary }]}>
                                Txns
                              </Text>
                              <Text
                                style={[s.statVal, { color: colors.text.primary, marginTop: 4 }]}
                              >
                                {ed.count}
                              </Text>
                            </View>
                          </View>

                          {ed.latest && (
                            <>
                              <View
                                style={[s.cardDivider, { backgroundColor: colors.border.subtle }]}
                              />
                              <View style={s.latestRow}>
                                <View
                                  style={[s.latestDot, { backgroundColor: colors.accent.primary }]}
                                />
                                <Text
                                  style={[s.latestText, { color: colors.text.secondary }]}
                                  numberOfLines={1}
                                >
                                  {ed.latest.description || 'Expense'} \u00B7{' '}
                                  {fmt(Number(ed.latest.amount))}
                                </Text>
                                <Text style={[s.latestTime, { color: colors.text.tertiary }]}>
                                  {getRelativeTime(ed.latest.date || ed.latest.createdAt)}
                                </Text>
                              </View>
                            </>
                          )}

                          <View
                            style={[s.cardDivider, { backgroundColor: colors.border.subtle }]}
                          />

                          <View style={s.quickActions}>
                            <TouchableOpacity
                              style={[s.quickAction, { backgroundColor: colors.accent.primary }]}
                              onPress={() =>
                                navigation.navigate('CreateTransaction', {
                                  prefill: {
                                    groupId: item.id,
                                    groupName: item.name,
                                    returnTo: 'GroupExpenses',
                                  },
                                })
                              }
                            >
                              <Ionicons name="add" size={14} color="#FFF" />
                              <Text style={s.quickActionText}>Add</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.quickAction, { backgroundColor: colors.bg.tertiary }]}
                              onPress={() =>
                                navigation.navigate('SharedExpenseForm', {
                                  groupId: item.id,
                                  edit: false,
                                })
                              }
                            >
                              <Ionicons
                                name="git-branch-outline"
                                size={14}
                                color={colors.text.secondary}
                              />
                              <Text style={[s.quickActionText, { color: colors.text.secondary }]}>
                                Split
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.quickAction, { backgroundColor: colors.bg.tertiary }]}
                              onPress={() =>
                                navigation.navigate('GroupExpenses', {
                                  groupId: item.id,
                                  groupName: item.name,
                                })
                              }
                            >
                              <Ionicons
                                name="people-outline"
                                size={14}
                                color={colors.text.secondary}
                              />
                              <Text style={[s.quickActionText, { color: colors.text.secondary }]}>
                                Members
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.quickAction, { backgroundColor: colors.bg.tertiary }]}
                              onPress={() =>
                                navigation.navigate('Settlement', {
                                  groupId: item.id,
                                  groupName: item.name,
                                })
                              }
                            >
                              <Ionicons
                                name="swap-horizontal-outline"
                                size={14}
                                color={colors.text.secondary}
                              />
                              <Text style={[s.quickActionText, { color: colors.text.secondary }]}>
                                Settle
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  loadWrap: { flex: 1 },
  errText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retry: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },

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
  name: { fontSize: 20, fontWeight: '700' },
  memberCount: { fontSize: 12, marginTop: 2 },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 18,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statVal: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  budgetBar: {
    marginHorizontal: 20,
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetFill: { height: '100%', borderRadius: 3 },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  aiCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  aiCardTitle: { fontSize: 13, fontWeight: '700' },
  aiCardBody: { fontSize: 13, lineHeight: 20 },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  expiredBannerText: { fontSize: 12, lineHeight: 18, flex: 1 },
  addTinyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  memberSection: { marginTop: 18, paddingHorizontal: 20 },
  secTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  memberDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInit: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '500', maxWidth: 90 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
  },
  txAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txUser: { fontSize: 14, fontWeight: '600', flex: 1 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  txBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  txDesc: { fontSize: 12, flex: 1 },
  txTime: { fontSize: 11, marginLeft: 8 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48 },

  hubHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  hubSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  hubTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  planBar: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  planText: { fontSize: 13, fontWeight: '500' },
  planAction: { fontSize: 13, fontWeight: '700' },

  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { fontSize: 17, fontWeight: '700' },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  cardWrap: { marginHorizontal: 24, marginBottom: 12 },
  card: { borderRadius: 20, padding: 16, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardMembers: { fontSize: 12, marginTop: 2 },
  cardDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  budgetLabel: { fontSize: 12, fontWeight: '600' },
  budgetVal: { fontSize: 14, fontWeight: '700' },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  latestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  latestText: { flex: 1, fontSize: 13 },
  latestTime: { fontSize: 11, fontWeight: '500' },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
    borderRadius: 10,
  },
  quickActionText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  emptyHub: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyHubIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHubTitle: { fontSize: 20, fontWeight: '700' },
  emptyHubDesc: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 48,
    lineHeight: 20,
  },
  emptyHubCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  emptyHubCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.4)',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800' },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSubTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  primaryAction: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryActionText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  addMemberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingLeft: 14,
    marginBottom: 10,
  },
  memberInput: { flex: 1, height: 48, fontSize: 14 },
  memberAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  memberManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberManageName: { fontSize: 15, fontWeight: '700' },
  memberManageRole: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  roleActionBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  roleActionText: { fontSize: 12, fontWeight: '800' },
  removeMemberBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    marginTop: 18,
  },
  dangerText: { fontSize: 14, fontWeight: '800' },
  restrictedNote: { fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  suggestionsBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
