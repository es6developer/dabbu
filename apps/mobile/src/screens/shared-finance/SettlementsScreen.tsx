import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

type SettlementTab = 'pending' | 'completed';

interface Settlement {
  id: string;
  fromUser: { id: string; name: string; avatar?: string };
  toUser: { id: string; name: string; avatar?: string };
  amount: number;
  method: string;
  status: 'pending' | 'completed';
  date: string;
  completedAt?: string;
  note?: string;
}

export function SettlementsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId, groupName } = route.params || {};

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SettlementTab>('pending');
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadSettlements();
  }, []);

  async function loadSettlements() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/settlements`);
      setSettlements(res.data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid(settlementId: string) {
    setMarking(settlementId);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.patch(`/shared-finance/groups/${groupId}/settlements/${settlementId}`, { status: 'completed' });
      setSettlements(prev =>
        prev.map(s => (s.id === settlementId ? { ...s, status: 'completed', completedAt: new Date().toISOString() } : s))
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update settlement');
    } finally {
      setMarking(null);
    }
  }

  const pending = settlements.filter(s => s.status === 'pending');
  const completed = settlements.filter(s => s.status === 'completed');
  const filtered = tab === 'pending' ? pending : completed;
  const totalPending = pending.reduce((sum, s) => sum + Number(s.amount), 0);
  const totalCompleted = completed.reduce((sum, s) => sum + Number(s.amount), 0);

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{groupName || 'Settlements'}</Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.bg.tertiary }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Pending</Text>
            <Text style={[styles.summaryAmount, { color: colors.status.warning }]}>₹{totalPending.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Completed</Text>
            <Text style={[styles.summaryAmount, { color: colors.status.success }]}>₹{totalCompleted.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.segmentedControl, { backgroundColor: colors.bg.card }]}>
        {(['pending', 'completed'] as SettlementTab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.segment, { backgroundColor: tab === t ? colors.accent.primary : 'transparent' }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.segmentText, { color: tab === t ? '#fff' : colors.text.secondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'pending' ? `(${pending.length})` : `(${completed.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg.card }]}>
              <Ionicons name={tab === 'pending' ? 'checkmark-done-outline' : 'cash-outline'} size={40} color={colors.text.tertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
              {tab === 'pending' ? 'No pending settlements' : 'No completed settlements'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>
              {tab === 'pending' ? 'All caught up! Everyone is settled up.' : 'Completed settlements will appear here.'}
            </Text>
          </View>
        ) : (
          filtered.map(settlement => (
            <View key={settlement.id} style={[styles.settlementCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.settlementTop}>
                <View style={styles.settlementUsers}>
                  <View style={styles.userPair}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.status.errorLight }]}>
                      <Text style={[styles.userAvatarText, { color: colors.status.error }]}>{(settlement.fromUser.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.userName, { color: colors.text.secondary }]} numberOfLines={1}>{settlement.fromUser.name}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.text.tertiary} />
                  <View style={styles.userPair}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.status.successLight }]}>
                      <Text style={[styles.userAvatarText, { color: colors.status.success }]}>{(settlement.toUser.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.userName, { color: colors.text.secondary }]} numberOfLines={1}>{settlement.toUser.name}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: settlement.status === 'pending' ? colors.status.warningLight : colors.status.successLight }]}>
                  <Text style={[styles.statusText, { color: settlement.status === 'pending' ? colors.status.warning : colors.status.success }]}>
                    {settlement.status === 'pending' ? 'Pending' : 'Paid'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.settlementAmount, { color: colors.text.primary }]}>₹{Number(settlement.amount).toLocaleString('en-IN')}</Text>

              <View style={styles.settlementMeta}>
                <View style={styles.settlementMetaItem}>
                  <Ionicons name="swap-horizontal-outline" size={14} color={colors.text.tertiary} />
                  <Text style={[styles.settlementMetaText, { color: colors.text.tertiary }]}>{settlement.method || 'Cash'}</Text>
                </View>
                <View style={styles.settlementMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
                  <Text style={[styles.settlementMetaText, { color: colors.text.tertiary }]}>
                    {new Date(settlement.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                {settlement.completedAt && (
                  <View style={styles.settlementMetaItem}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.status.success} />
                    <Text style={[styles.settlementMetaText, { color: colors.status.success }]}>
                      {new Date(settlement.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                )}
              </View>

              {settlement.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.markPaidBtn, { backgroundColor: colors.status.successLight }]}
                  onPress={() => handleMarkPaid(settlement.id)}
                  disabled={marking === settlement.id}
                >
                  {marking === settlement.id ? (
                    <ActivityIndicator color={colors.status.success} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
                      <Text style={[styles.markPaidText, { color: colors.status.success }]}>Mark as Paid</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateSettlement', { groupId, groupName })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  summaryCard: { marginHorizontal: 16, padding: 20, borderRadius: 20, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  summaryAmount: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  summaryDivider: { width: 1, height: 40, marginHorizontal: 12 },
  segmentedControl: { flexDirection: 'row', marginHorizontal: 16, padding: 4, borderRadius: 12, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  settlementCard: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  settlementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settlementUsers: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  userPair: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 11, fontWeight: '700' },
  userName: { fontSize: 13, fontWeight: '500', maxWidth: 80 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  settlementAmount: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 10 },
  settlementMeta: { flexDirection: 'row', gap: 16 },
  settlementMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settlementMetaText: { fontSize: 12 },
  markPaidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 12, gap: 6 },
  markPaidText: { fontSize: 14, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
