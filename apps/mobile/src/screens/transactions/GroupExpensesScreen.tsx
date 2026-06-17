import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { spacing } from '../../theme/design';

const fmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 10000000) return '₹' + (abs / 10000000).toFixed(1) + 'Cr';
  if (abs >= 100000) return '₹' + (abs / 100000).toFixed(1) + 'L';
  return '₹' + (abs || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

function timeAgo(d: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function GroupExpensesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName: routeGroupName } = route.params || {};

  const [group, setGroup] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        setLoading(false);
        setError('No group selected');
        return;
      }
      if (accessToken) setAccessToken(accessToken);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [txRes, grpRes] = await Promise.all([
          api.get<any>(`/transactions?expenseGroupId=${groupId}`),
          api.get<any>(`/expense-groups/${groupId}`),
        ]);
        const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
        setTransactions(txData.filter((t: any) => !t.expenseGroupId || t.expenseGroupId === groupId));
        const gData = grpRes || null;
        setGroup(gData);
        setEditName(gData?.name || routeGroupName || '');
        const mems = Array.isArray(gData?.members) ? gData.members : [];
        setMembers(mems);
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

  const currentMember = useMemo(
    () => members.find((m: any) => m.userId === currentUser?.id),
    [members, currentUser],
  );
  const isAdmin = useMemo(
    () => currentMember?.role === 'admin' || group?.createdBy === currentUser?.id,
    [currentMember, group, currentUser],
  );

  const groupName = group?.name || routeGroupName || 'Group';

  async function handleExport() {
    setExporting(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const res: any = await api.post(`/shared-finance/groups/${groupId}/export`, {});
      const url = res?.fileUrl || res?.data?.fileUrl;
      if (url) {
        Alert.alert('Export Ready', 'Download your report?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => Linking.openURL(url) },
        ]);
      } else {
        showToast('Export queued. Check your downloads.');
      }
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Try again');
    } finally {
      setExporting(false);
    }
  }

  async function saveSettings() {
    if (!editName.trim()) return Alert.alert('Name required');
    setSaving(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.patch(`/expense-groups/${groupId}`, { name: editName.trim() });
      await loadData(true);
      setSettingsOpen(false);
      showToast('Group saved');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: any) {
    Alert.alert(
      'Remove member',
      `What should happen to ${member.user?.firstName || 'this member'}'s transactions in this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all their transactions',
          style: 'destructive',
          onPress: async () => {
            try {
              if (accessToken) setAccessToken(accessToken);
              await api.post(`/expense-groups/${groupId}/members/${member.id}/remove`, {
                deleteTransactions: true,
              });
              await loadData(true);
              showToast('Member removed');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Try again');
            }
          },
        },
        {
          text: 'Keep their transactions',
          onPress: async () => {
            try {
              if (accessToken) setAccessToken(accessToken);
              await api.post(`/expense-groups/${groupId}/members/${member.id}/remove`);
              await loadData(true);
              showToast('Member removed');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Try again');
            }
          },
        },
      ],
    );
  }

  async function leaveGroup() {
    Alert.alert('Leave group', 'What should happen to your transactions in this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all my transactions',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) setAccessToken(accessToken);
            await api.post(`/expense-groups/${groupId}/leave`, { deleteTransactions: true });
            navigation.goBack();
            showToast('Left the group');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Try again');
          }
        },
      },
      {
        text: 'Keep my transactions (marked as left)',
        onPress: async () => {
          try {
            if (accessToken) setAccessToken(accessToken);
            await api.post(`/expense-groups/${groupId}/leave`);
            navigation.goBack();
            showToast('Left the group');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Try again');
          }
        },
      },
    ]);
  }

  // Compute per-user totals
  const userTotals = useMemo(() => {
    const map: Record<string, { paid: number; share: number }> = {};
    for (const tx of transactions) {
      const uid = tx.userId || 'unknown';
      if (!map[uid]) map[uid] = { paid: 0, share: 0 };
      map[uid].paid += Number(tx.amount || 0);
    }
    const total = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const count = members.length || 1;
    const equalShare = total / count;
    for (const uid of Object.keys(map)) {
      map[uid].share = equalShare;
    }
    return { map, total, equalShare };
  }, [transactions, members]);

  const currentBalance = useMemo(() => {
    if (!currentUser?.id) return 0;
    const u = userTotals.map[currentUser.id];
    if (!u) return 0;
    return u.paid - userTotals.equalShare;
  }, [userTotals, currentUser]);

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <Text style={[{ color: colors.text.primary, fontSize: 16 }]}>{error}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.accent.primary }]} onPress={() => loadData()}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <SectionList
        sections={[{ title: 'transactions', data: transactions }]}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={[s.headerRow, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[s.iconBtn, { backgroundColor: colors.bg.tertiary }]}>
                <AntDesign name="left" size={22} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.groupName, { color: colors.text.primary }]} numberOfLines={1}>{groupName}</Text>
                <Text style={[s.memberCount, { color: colors.text.tertiary }]}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsOpen(true)} style={[s.iconBtn, { backgroundColor: colors.bg.tertiary }]}>
                <AntDesign name="setting" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={[s.balanceCard, { backgroundColor: colors.card.balance }]}>
              <Text style={[s.balanceLabel, { color: colors.text.tertiary }]}>Your Balance</Text>
              <Text style={[s.balanceAmount, { color: currentBalance >= 0 ? colors.status.success : colors.status.error }]}>
                {currentBalance >= 0 ? '+' : ''}{fmt(Math.abs(currentBalance))}
              </Text>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Total Spent</Text>
                  <Text style={[s.summaryValue, { color: colors.text.primary }]}>{fmt(userTotals.total)}</Text>
                </View>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Your Share</Text>
                  <Text style={[s.summaryValue, { color: colors.text.primary }]}>{fmt(userTotals.equalShare)}</Text>
                </View>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>You Paid</Text>
                  <Text style={[s.summaryValue, { color: colors.text.primary }]}>
                    {fmt(userTotals.map[currentUser?.id || '']?.paid || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Simplified Debts */}
            {members.length > 1 && (
              <View style={[s.debtsCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                <Text style={[s.debtsTitle, { color: colors.text.primary }]}>Balances</Text>
                {members.map((m: any) => {
                  if (m.userId === currentUser?.id) return null;
                  const u = userTotals.map[m.userId];
                  if (!u) return null;
                  const bal = u.paid - userTotals.equalShare;
                  const owes = bal < 0;
                  return (
                    <View key={m.id} style={s.debtRow}>
                      <Avatar
                        uri={m.user?.avatarUrl}
                        name={`${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim()}
                        size={28}
                      />
                      <Text style={[s.debtName, { color: colors.text.primary }]} numberOfLines={1}>
                        {m.user?.firstName || m.user?.email || 'Member'}
                      </Text>
                      <Text style={[s.debtAmount, { color: owes ? colors.status.error : colors.status.success }]}>
                        {owes ? 'owes ' : 'gets back '}
                        {fmt(Math.abs(bal))}
                      </Text>
                    </View>
                  );
                })}
                {members.filter((m: any) => m.userId !== currentUser?.id && userTotals.map[m.userId]).length === 0 && (
                  <Text style={[{ color: colors.text.tertiary, fontSize: 13 }]}>No balances yet</Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('AddExpense', { prefill: { groupId, groupName, returnTo: 'GroupExpenses' } })}
              >
                <AntDesign name="plus" size={18} color="#FFF" />
                <Text style={s.actionText}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.status.success }]}
                onPress={() => navigation.navigate('Settlement', { groupId, groupName })}
              >
                <AntDesign name="swap" size={18} color="#FFF" />
                <Text style={s.actionText}>Settle Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.text.tertiary }]}
                onPress={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <AntDesign name="download" size={18} color="#FFF" />
                )}
                <Text style={s.actionText}>Export</Text>
              </TouchableOpacity>
            </View>

            {transactions.length > 0 && (
              <Text style={[s.secTitle, { color: colors.text.secondary }]}>
                Expenses · {transactions.length}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }: { item: any }) => {
          const date = new Date(item.date || item.createdAt || '');
          const user = members.find((m: any) => m.userId === item.userId)?.user || {};
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You';
          return (
            <TouchableOpacity
              style={[s.txCard, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
              activeOpacity={0.7}
            >
              <Avatar uri={user.avatarUrl} name={userName} size={36} />
              <View style={s.txInfo}>
                <Text style={[s.txDesc, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.description || 'No description'}
                </Text>
                <Text style={[s.txMeta, { color: colors.text.tertiary }]}>
                  {userName} · {item.category?.name || 'Uncategorized'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.txAmount, { color: item.type === 'income' ? colors.status.success : colors.text.primary }]}>
                  ₹{Math.abs(Number(item.amount)).toLocaleString('en-IN')}
                </Text>
                {!isNaN(date.getTime()) && (
                  <Text style={[s.txDate, { color: colors.text.tertiary }]}>
                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <AntDesign name="filetext1" size={48} color={colors.text.tertiary} />
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No expenses yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>Add your first expense to get started</Text>
          </View>
        }
      />

      {/* Settings Modal */}
      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.sheet, { backgroundColor: colors.bg.primary, paddingBottom: insets.bottom + 18 }]}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <Text style={[s.sheetTitle, { color: colors.text.primary }]}>Group Settings</Text>
                <TouchableOpacity onPress={() => setSettingsOpen(false)} style={[s.sheetClose, { backgroundColor: colors.bg.tertiary }]}>
                  <AntDesign name="close" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[s.inputLabel, { color: colors.text.tertiary }]}>Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                editable={isAdmin}
                style={[s.input, { backgroundColor: isAdmin ? colors.bg.tertiary : colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle, opacity: isAdmin ? 1 : 0.6 }]}
                placeholderTextColor={colors.text.tertiary}
              />
              {isAdmin && (
                <TouchableOpacity style={[s.primaryAction, { backgroundColor: colors.accent.primary }]} onPress={saveSettings} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryActionText}>Save</Text>}
                </TouchableOpacity>
              )}
              {!isAdmin && <Text style={[{ color: colors.text.tertiary, fontSize: 12, textAlign: 'center', marginTop: 8 }]}>Only admins can edit group name</Text>}

              {/* Members */}
              <Text style={[s.inputLabel, { color: colors.text.tertiary, marginTop: 24 }]}>Members</Text>
              {members.map((m: any) => {
                const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || 'Member';
                const isSelf = m.userId === currentUser?.id;
                return (
                  <View key={m.id} style={[s.memberRow, { borderBottomColor: colors.border.subtle }]}>
                    <Avatar uri={m.user?.avatarUrl} name={name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.memberName, { color: colors.text.primary }]}>{name}</Text>
                      <Text style={[s.memberRole, { color: colors.text.tertiary }]}>{m.role || 'member'}{isSelf ? ' (you)' : ''}</Text>
                    </View>
                    {isAdmin && !isSelf && (
                      <TouchableOpacity onPress={() => removeMember(m)}>
                        <AntDesign name="closecircleo" size={20} color={colors.status.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={[s.primaryAction, { backgroundColor: colors.bg.tertiary, marginTop: 12 }]}
                onPress={() => navigation.navigate('AddMember', { groupId, type: 'expense-group', existingMemberIds: members.map((m: any) => m.userId).filter(Boolean) })}
              >
                <AntDesign name="adduser" size={18} color={colors.text.primary} />
                <Text style={[{ color: colors.text.primary, fontSize: 15, fontWeight: '600' }]}>Add Member</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.leaveBtn, { borderColor: colors.status.error }]} onPress={leaveGroup}>
                <AntDesign name="logout" size={18} color={colors.status.error} />
                <Text style={[s.leaveText, { color: colors.status.error }]}>Leave Group</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { fontSize: 20, fontWeight: '700' },
  memberCount: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  balanceLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  balanceAmount: { fontSize: 34, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  summaryItem: { flex: 1, gap: 2 },
  summaryLabel: { fontSize: 10, fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  debtsCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  debtsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  debtName: { flex: 1, fontSize: 13, fontWeight: '600' },
  debtAmount: { fontSize: 13, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  secTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 3,
    padding: 12,
    borderRadius: 14,
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600' },
  txMeta: { fontSize: 11, marginTop: 1, fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txDate: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetClose: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 6 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontWeight: '500', marginHorizontal: 20, marginBottom: 8 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryActionText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberRole: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaveText: { fontSize: 15, fontWeight: '700' },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
