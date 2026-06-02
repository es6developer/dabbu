import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard } from '../../components/ui/AnimatedSkeleton';

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

export function GroupExpensesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const statsCardGradient = [colors.bg.secondary, colors.bg.tertiary];
  const insets = useSafeAreaInsets();
  const { groupId, groupName: routeGroupName } = route.params || {};

  const [transactions, setTransactions] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [editIcon, setEditIcon] = useState('users');
  const [activeTab, setActiveTab] = useState<(typeof GROUP_TABS)[number]>('overview');
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
        const [txRes, grpRes] = await Promise.allSettled([
          api.get<any>(`/transactions?expenseGroupId=${groupId}`, ctrl.signal),
          api.get<any>(`/expense-groups/${groupId}`, ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }

        const txData = normalize<any[]>(txRes.status === 'fulfilled' ? txRes.value : null);
        const gData = grpRes.status === 'fulfilled' ? normalize<any>(grpRes.value) : null;
        if (txRes.status === 'rejected' && grpRes.status === 'rejected') {
          throw new Error('Unable to load');
        }

        setTransactions(Array.isArray(txData) ? txData : []);
        setGroup(gData);
        if (gData) {
          setEditName(gData.name || '');
          setEditDescription(gData.description || '');
          setEditBudget(gData.monthlyBudget ? String(gData.monthlyBudget) : '');
          setEditIcon(gData.icon || 'users');
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

  useFocusEffect(
    useCallback(() => {
      if (transactions.length === 0) {
        setLoading(true);
      }
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const stats = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const te = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const ti = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const ms = monthly
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const budget = Number(group?.monthlyBudget || 0);
    return {
      totalExpense: te,
      totalIncome: ti,
      monthlySpending: ms,
      budgetRemaining: budget > 0 ? budget - ms : null,
      totalCount: transactions.length,
    };
  }, [transactions, group]);

  const members = Array.isArray(group?.members) ? group.members : [];
  const currentMember = members.find((m: any) => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin' || group?.createdBy === currentUser?.id;
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
        monthlyBudget: editBudget.trim() ? Number(editBudget) : null,
      });
      await loadData(true);
      setSettingsOpen(false);
    } catch (e: any) {
      Alert.alert('Unable to save', e.message || 'Try again');
    } finally {
      setSavingGroup(false);
    }
  }

  const activity = useMemo(() => {
    const txActivity = transactions.slice(0, 8).map((tx) => ({
      id: tx.id,
      title: 'Expense created',
      detail: `${tx.description || tx.category?.name || 'Expense'} · ${fmt(Number(tx.amount || 0))}`,
      date: tx.createdAt || tx.date,
      icon: 'receipt-outline',
    }));
    const memberActivity = members.slice(0, 6).map((member: any) => ({
      id: `member-${member.id}`,
      title: 'Member added',
      detail: member.user?.firstName || member.user?.email || 'Member',
      date: member.addedAt,
      icon: 'person-add-outline',
    }));
    return [...txActivity, ...memberActivity]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, members]);

  async function addMember() {
    if (!inviteEmail.trim()) {
      return;
    }
    setSavingGroup(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post(`/expense-groups/${groupId}/members`, { email: inviteEmail.trim() });
      setInviteEmail('');
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
              <SkeletonCard key={i} />
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

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={activeTab === 'expenses' ? transactions : []}
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
          transactions.length === 0 ? s.emptyContainer : { paddingBottom: insets.bottom + 96 }
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.headerRow, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
              </TouchableOpacity>
              <LinearGradient colors={[...colors.accent.gradient]} style={s.avatar}>
                <Ionicons
                  name={(group?.icon === 'users' ? 'people' : group?.icon || 'people') as any}
                  size={24}
                  color="#FFF"
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: colors.text.primary }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[s.memberCount, { color: colors.text.tertiary }]}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('CreateTransaction', {
                    prefill: { groupId, groupName: name, returnTo: 'GroupExpenses' },
                  })
                }
                style={[s.backBtn, { backgroundColor: colors.accent.primary }]}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSettingsOpen(true)}
                style={[s.backBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
              >
                <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.grid}>
              <LinearGradient colors={statsCardGradient} style={s.statCard}>
                <Text style={s.statLabel}>Total</Text>
                <Text style={s.statVal}>{fmt(stats.totalExpense)}</Text>
              </LinearGradient>
              <LinearGradient colors={statsCardGradient} style={s.statCard}>
                <Text style={s.statLabel}>Txns</Text>
                <Text style={s.statVal}>{stats.totalCount}</Text>
              </LinearGradient>
              <LinearGradient colors={statsCardGradient} style={s.statCard}>
                <Text style={s.statLabel}>Monthly</Text>
                <Text style={s.statVal}>{fmt(stats.monthlySpending)}</Text>
              </LinearGradient>
              {stats.budgetRemaining !== null && (
                <LinearGradient colors={statsCardGradient} style={s.statCard}>
                  <Text style={s.statLabel}>Budget Left</Text>
                  <Text
                    style={[
                      s.statVal,
                      {
                        color:
                          stats.budgetRemaining >= 0 ? colors.status.success : colors.status.error,
                      },
                    ]}
                  >
                    {fmt(Math.abs(stats.budgetRemaining))}
                  </Text>
                </LinearGradient>
              )}
            </View>

            {members.length > 0 && (
              <View style={s.memberSection}>
                <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Members</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {members.map((m: any) => (
                    <View
                      key={m.id}
                      style={[s.memberChip, { backgroundColor: colors.bg.tertiary }]}
                    >
                      <LinearGradient colors={[...colors.accent.gradient]} style={s.memberDot}>
                        <Text style={s.memberInit}>
                          {(m.user?.firstName?.[0] || m.firstName?.[0] || '?').toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <Text
                        style={[s.memberName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {m.user?.firstName || m.user?.email || m.firstName || 'Member'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tabRow}
            >
              {GROUP_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    s.tabChip,
                    activeTab === tab
                      ? { backgroundColor: colors.accent.primary }
                      : { backgroundColor: colors.bg.tertiary },
                  ]}
                  onPress={() => (tab === 'settings' ? setSettingsOpen(true) : setActiveTab(tab))}
                >
                  <Text
                    style={[
                      s.tabText,
                      { color: activeTab === tab ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activeTab === 'overview' && (
              <View style={s.tabPanel}>
                <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Overview</Text>
                <View style={[s.infoPanel, { backgroundColor: colors.bg.secondary }]}>
                  <Text style={[s.infoTitle, { color: colors.text.primary }]}>
                    {group?.description || 'No description added'}
                  </Text>
                  <Text style={[s.infoText, { color: colors.text.tertiary }]}>
                    This month: {fmt(stats.monthlySpending)} · {stats.totalCount} transactions
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'members' && (
              <View style={s.tabPanel}>
                <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Members</Text>
                {members.map((member: any) => (
                  <View
                    key={member.id}
                    style={[s.memberListRow, { backgroundColor: colors.bg.secondary }]}
                  >
                    <Text style={[s.rowTitle, { color: colors.text.primary, flex: 1 }]}>
                      {member.user?.firstName || member.user?.email || 'Member'}
                    </Text>
                    <Text
                      style={[
                        s.rolePill,
                        {
                          color: colors.accent.primary,
                          backgroundColor: `${colors.accent.primary}18`,
                        },
                      ]}
                    >
                      {member.role || 'member'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'activity' && (
              <View style={s.tabPanel}>
                <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Activity</Text>
                {activity.map((item) => (
                  <View key={item.id} style={s.activityRow}>
                    <View style={[s.activityIcon, { backgroundColor: colors.bg.tertiary }]}>
                      <Ionicons name={item.icon as any} size={16} color={colors.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowTitle, { color: colors.text.primary }]}>
                        {item.title}
                      </Text>
                      <Text style={[s.rowSub, { color: colors.text.tertiary }]}>
                        {item.detail}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'expenses' && transactions.length > 0 && (
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
                Expenses
              </Text>
            )}
          </Animated.View>
        }
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          const user = memberMap[item.userId];
          const userName = user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You'
            : 'You';
          const cat = item.category?.name || item.category || 'Other';
          const date = new Date(item.date || item.createdAt || '');
          return (
            <TouchableOpacity
              style={[s.txCard, { backgroundColor: colors.bg.secondary }]}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[...colors.accent.gradient]} style={s.txAvatar}>
                <Text style={s.txAvatarText}>{userName[0]?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={s.txTop}>
                  <Text style={[s.txUser, { color: colors.text.primary }]} numberOfLines={1}>
                    {userName}
                  </Text>
                  <Text style={[s.txAmount, { color: isIncome ? '#00B894' : '#FF6B6B' }]}>
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
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
              style={s.emptyIcon}
            >
              <Ionicons name="receipt-outline" size={44} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No expenses yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Add your first expense
            </Text>
          </View>
        }
      />
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
                  style={[s.iconClose, { backgroundColor: colors.bg.tertiary }]}
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
              <Text style={[s.inputLabel, { color: colors.text.tertiary }]}>Icon</Text>
              <View style={s.iconGrid}>
                {GROUP_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    disabled={!isAdmin}
                    style={[
                      s.iconPick,
                      { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                      editIcon === icon && {
                        borderColor: colors.accent.primary,
                        backgroundColor: `${colors.accent.primary}18`,
                      },
                      !isAdmin && { opacity: 0.5 },
                    ]}
                    onPress={() => setEditIcon(icon)}
                  >
                    <Ionicons
                      name={(icon === 'users' ? 'people' : icon) as any}
                      size={20}
                      color={editIcon === icon ? colors.accent.primary : colors.text.tertiary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
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
              <Text style={[s.inputLabel, { color: colors.text.tertiary }]}>Monthly Budget</Text>
              <TextInput
                value={editBudget}
                onChangeText={setEditBudget}
                editable={isAdmin}
                keyboardType="decimal-pad"
                style={[
                  s.input,
                  {
                    backgroundColor: isAdmin ? colors.bg.tertiary : colors.bg.secondary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                    opacity: isAdmin ? 1 : 0.6,
                  },
                ]}
                placeholder="0"
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

              <Text style={[s.sheetSubTitle, { color: colors.text.primary }]}>Members</Text>
              <View style={[s.addMemberBox, { backgroundColor: colors.bg.tertiary }]}>
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[s.memberInput, { color: colors.text.primary }]}
                  placeholder="member@email.com"
                  placeholderTextColor={colors.text.tertiary}
                />
                <TouchableOpacity
                  onPress={addMember}
                  style={[s.memberAddBtn, { backgroundColor: colors.accent.primary }]}
                >
                  <Ionicons name="person-add-outline" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
              {members.map((member: any) => (
                <View
                  key={member.id}
                  style={[s.memberManageRow, { borderBottomColor: colors.border.subtle }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.memberManageName, { color: colors.text.primary }]}>
                      {member.user?.firstName || member.user?.email || 'Member'}
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
                  style={[s.dangerAction, { backgroundColor: colors.status.errorLight }]}
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

const s = StyleSheet.create({
  screen: { flex: 1 },
  loadWrap: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  backBtn: {
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginTop: 18 },
  statCard: { flex: 1, minWidth: 140, padding: 14, borderRadius: 18 },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statVal: { fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 8 },
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
  tabRow: { paddingHorizontal: 20, gap: 8, paddingTop: 20, paddingBottom: 6 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  tabText: { fontSize: 12, fontWeight: '700' },
  tabPanel: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  infoPanel: { borderRadius: 18, padding: 16 },
  infoTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 12, marginTop: 6 },
  memberListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 3 },
  rolePill: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    textTransform: 'capitalize',
    fontSize: 12,
    fontWeight: '800',
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  errText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retry: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
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
  sheetSubTitle: { fontSize: 17, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  iconClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconPick: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
});
