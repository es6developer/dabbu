import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { PageContainer } from '../../components/ui/PageContainer';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const SETTLEMENT_METHODS = [
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'bank', label: 'Bank Transfer', icon: 'business-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

export function SettlementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId } = route.params || {};

  const [settlements, setSettlements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'settle' | 'history' | 'activity'>('settle');

  const loadData = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        return;
      }
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [optRes, histRes, actRes] = await Promise.allSettled([
          api.get<any>(`/shared-finance/groups/${groupId}/settlements/plan`),
          api.get<any>(`/shared-finance/groups/${groupId}/settlements`),
          api.get<any>(`/settlements/activity/${groupId}?limit=30`),
        ]);
        if (optRes.status === 'fulfilled') {
          const d = optRes.value;
          setSettlements(Array.isArray(d) ? d : []);
        }
        if (histRes.status === 'fulfilled') {
          const d = histRes.value;
          setHistory(Array.isArray(d) ? d : []);
        }
        if (actRes.status === 'fulfilled') {
          const d = actRes.value;
          setActivity(Array.isArray(d) ? d : []);
        }
      } catch (e: any) {
        // ignore
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

  async function markSettled(settlementId: string) {
    setSubmitting(settlementId);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post(`/shared-finance/settlements/${settlementId}/complete`, {
        method: selectedMethod,
      });
      Alert.alert('Settled', 'Marked as settled successfully');
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to mark as settled');
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePayNow(settlement: any) {
    setSubmitting(settlement.id);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/settlements/pay-now', { settlementId: settlement.id });
      const data = res;
      const upiLink = data.upiLink || data.data?.upiLink;

      if (!upiLink) {
        Alert.alert('Error', 'No UPI link generated');
        return;
      }

      // Open UPI app
      const supported = await Linking.canOpenURL(upiLink);
      if (supported) {
        await Linking.openURL(upiLink);
      } else {
        Alert.alert('Open UPI App', upiLink);
      }

      // Ask if payment was made
      Alert.alert(
        'Confirm Payment',
        'Did you complete the payment in your UPI app?',
        [
          {
            text: 'Yes, Paid',
            onPress: async () => {
              try {
                await api.post('/settlements/confirm-payment', {
                  settlementId: settlement.id,
                  paymentMethod: 'upi',
                });
                Alert.alert('Success', 'Payment confirmed! Waiting for receiver to confirm.');
                await loadData(true);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to confirm payment');
              }
            },
          },
          { text: 'Not yet', style: 'cancel' },
        ],
        { cancelable: true },
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to initiate payment');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleConfirmReceipt(settlementId: string) {
    try {
      await api.post('/settlements/confirm-receipt', { settlementId });
      Alert.alert('Confirmed', 'Receipt confirmed. Settlement completed!');
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to confirm receipt');
    }
  }

  async function handleRejectReceipt(settlementId: string) {
    Alert.alert('Reject Payment', 'Are you sure you want to reject this payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/settlements/reject-receipt', {
              settlementId,
              reason: 'Receiver rejected the payment claim',
            });
            Alert.alert('Rejected', 'Payment claim rejected.');
            await loadData(true);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to reject');
          }
        },
      },
    ]);
  }

  async function checkConfirmation(settlementId: string) {
    try {
      const res = await api.get<any>(`/settlements/confirmation/${settlementId}`);
      const data = res;
      return data;
    } catch {
      return null;
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
          <View style={{ padding: 24, gap: 16 }}>
            <Skeleton width={120} height={14} />
            <Skeleton width="100%" height={120} borderRadius={18} />
            <Skeleton width="100%" height={180} borderRadius={18} />
          </View>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      <ScrollView
        style={[s.screen, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={[s.headerRow, { paddingHorizontal: 20 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Settlements</Text>
        </View>

        {/* Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.sectionRow, { paddingHorizontal: 20 }]}
        >
          {(
            [
              { key: 'settle', label: 'Settle Up', icon: 'swap-horizontal' },
              { key: 'history', label: 'History', icon: 'time-outline' },
              { key: 'activity', label: 'Activity', icon: 'pulse-outline' },
            ] as const
          ).map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[
                s.sectionChip,
                activeSection === section.key
                  ? { backgroundColor: colors.accent.primary }
                  : { backgroundColor: colors.bg.tertiary },
              ]}
              onPress={() => setActiveSection(section.key)}
            >
              <Ionicons
                name={section.icon as any}
                size={14}
                color={activeSection === section.key ? '#FFF' : colors.text.secondary}
              />
              <Text
                style={[
                  s.sectionChipText,
                  { color: activeSection === section.key ? '#FFF' : colors.text.secondary },
                ]}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeSection === 'settle' && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>
              Optimized Settlements
            </Text>
            {settlements.length > 0 ? (
              <View style={s.settlementsList}>
                {settlements.map((s, i) => {
                  const isPayer = s.fromUserId === currentUser?.id;
                  const isReceiver = s.toUserId === currentUser?.id;
                  return (
                    <LinearGradient
                      key={s.id || i}
                      colors={[colors.bg.secondary, colors.bg.tertiary]}
                      style={s.settlementCard}
                    >
                      <View style={s.settlementFlow}>
                        <View style={s.settlementParty}>
                          <LinearGradient
                            colors={[...colors.accent.gradient]}
                            style={s.partyAvatar}
                          >
                            <Text style={s.partyInit}>
                              {(s.fromName?.[0] || '?').toUpperCase()}
                            </Text>
                          </LinearGradient>
                          <Text style={[s.partyName, { color: colors.text.secondary }]}>
                            {s.fromName || 'Someone'}
                          </Text>
                        </View>
                        <View style={s.flowCenter}>
                          <Ionicons name="arrow-forward" size={20} color={colors.accent.primary} />
                          <Text style={[s.flowAmount, { color: colors.accent.primary }]}>
                            {fmt(s.amount || 0)}
                          </Text>
                        </View>
                        <View style={s.settlementParty}>
                          <LinearGradient
                            colors={[...colors.accent.gradientAlt]}
                            style={s.partyAvatar}
                          >
                            <Text style={s.partyInit}>{(s.toName?.[0] || '?').toUpperCase()}</Text>
                          </LinearGradient>
                          <Text style={[s.partyName, { color: colors.text.secondary }]}>
                            {s.toName || 'Someone'}
                          </Text>
                        </View>
                      </View>
                      {s.status !== 'completed' ? (
                        <>
                          <Text style={[s.methodLabel, { color: colors.text.tertiary }]}>
                            Settle via
                          </Text>
                          <View style={s.methodRow}>
                            {SETTLEMENT_METHODS.map((m) => (
                              <TouchableOpacity
                                key={m.key}
                                style={[
                                  s.methodChip,
                                  {
                                    backgroundColor: colors.bg.tertiary,
                                    borderColor: colors.border.subtle,
                                  },
                                  selectedMethod === m.key && {
                                    backgroundColor: `${colors.accent.primary}20`,
                                    borderColor: colors.accent.primary,
                                  },
                                ]}
                                onPress={() => setSelectedMethod(m.key)}
                              >
                                <Ionicons
                                  name={m.icon as any}
                                  size={16}
                                  color={
                                    selectedMethod === m.key
                                      ? colors.accent.primary
                                      : colors.text.tertiary
                                  }
                                />
                                <Text
                                  style={[
                                    s.methodText,
                                    {
                                      color:
                                        selectedMethod === m.key
                                          ? colors.accent.primary
                                          : colors.text.tertiary,
                                    },
                                  ]}
                                >
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <View style={s.actionRow}>
                            {isPayer && selectedMethod === 'upi' && (
                              <TouchableOpacity
                                style={[
                                  s.primaryBtn,
                                  { backgroundColor: colors.accent.primary },
                                  submitting === s.id && { opacity: 0.6 },
                                ]}
                                onPress={() => handlePayNow(s)}
                                disabled={submitting === s.id}
                              >
                                {submitting === s.id ? (
                                  <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                  <>
                                    <Ionicons
                                      name="phone-portrait-outline"
                                      size={16}
                                      color="#FFF"
                                    />
                                    <Text style={s.primaryBtnText}>Pay Now · UPI</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[
                                s.settleBtn,
                                { backgroundColor: colors.status.success },
                                submitting === s.id && { opacity: 0.6 },
                              ]}
                              onPress={() => markSettled(s.id)}
                              disabled={submitting === s.id}
                            >
                              {submitting === s.id ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={18}
                                    color="#FFF"
                                  />
                                  <Text style={s.settleBtnText}>Mark Settled</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                          {isReceiver && (
                            <View style={s.receiverRow}>
                              <TouchableOpacity
                                style={[s.receiverBtn, { backgroundColor: colors.status.success }]}
                                onPress={() => handleConfirmReceipt(s.id)}
                              >
                                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                <Text style={s.receiverBtnText}>Confirm Received</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[s.receiverBtn, { backgroundColor: colors.status.error }]}
                                onPress={() => handleRejectReceipt(s.id)}
                              >
                                <Ionicons name="close-circle" size={16} color="#FFF" />
                                <Text style={s.receiverBtnText}>Reject</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      ) : (
                        <View
                          style={[
                            s.completedBadge,
                            { backgroundColor: `${colors.status.success}20` },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={colors.status.success}
                          />
                          <Text style={[s.completedText, { color: colors.status.success }]}>
                            Settled via {s.method || 'UPI'}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  );
                })}
              </View>
            ) : (
              <View style={[s.emptyCard, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="checkmark-done-outline" size={36} color={colors.status.success} />
                <Text style={[s.emptyTitle, { color: colors.text.primary }]}>All settled up!</Text>
                <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                  No pending settlements. Everyone is square.
                </Text>
              </View>
            )}
          </>
        )}

        {activeSection === 'history' && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>
              Settlement History
            </Text>
            {history.length > 0 ? (
              <View style={s.historyList}>
                {history.map((h: any, i: number) => (
                  <View
                    key={h.id || i}
                    style={[s.historyCard, { backgroundColor: colors.bg.secondary }]}
                  >
                    <View style={s.historyLeft}>
                      <View
                        style={[s.historyIcon, { backgroundColor: `${colors.status.success}15` }]}
                      >
                        <Ionicons name="swap-horizontal" size={18} color={colors.status.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.historyTitle, { color: colors.text.primary }]}>
                          {h.fromName || 'Someone'} → {h.toName || 'Someone'}
                        </Text>
                        <Text style={[s.historyMeta, { color: colors.text.tertiary }]}>
                          {h.method || 'UPI'} ·{' '}
                          {h.date
                            ? new Date(h.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={s.historyRight}>
                      <Text style={[s.historyAmount, { color: colors.text.primary }]}>
                        {fmt(h.amount || 0)}
                      </Text>
                      <View
                        style={[
                          s.statusBadge,
                          {
                            backgroundColor:
                              h.status === 'completed'
                                ? `${colors.status.success}20`
                                : `${colors.status.warning}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusText,
                            {
                              color:
                                h.status === 'completed'
                                  ? colors.status.success
                                  : colors.status.warning,
                            },
                          ]}
                        >
                          {h.status === 'completed' ? 'Completed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[s.emptyCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[s.emptyTitle, { color: colors.text.tertiary }]}>
                  No settlement history yet
                </Text>
              </View>
            )}
          </>
        )}

        {activeSection === 'activity' && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>Activity Timeline</Text>
            {activity.length > 0 ? (
              <View style={s.activityList}>
                {activity.map((a: any) => {
                  const iconMap: Record<string, string> = {
                    expense_added: 'receipt-outline',
                    member_joined: 'person-add-outline',
                    settlement_requested: 'swap-horizontal-outline',
                    settlement_confirmed: 'checkmark-circle-outline',
                    guest_added_expense: 'person-outline',
                    payment_completed: 'cash-outline',
                    guest_approved: 'shield-checkmark-outline',
                  };
                  return (
                    <View
                      key={a.id}
                      style={[s.activityCard, { backgroundColor: colors.bg.secondary }]}
                    >
                      <View
                        style={[s.activityDot, { backgroundColor: `${colors.accent.primary}20` }]}
                      >
                        <Ionicons
                          name={(iconMap[a.action] || 'ellipse-outline') as any}
                          size={16}
                          color={colors.accent.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.activityText, { color: colors.text.primary }]}>
                          {a.description}
                        </Text>
                        <Text style={[s.activityMeta, { color: colors.text.tertiary }]}>
                          {a.userName} ·{' '}
                          {new Date(a.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[s.emptyCard, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="pulse-outline" size={36} color={colors.text.tertiary} />
                <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No activity yet</Text>
                <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                  Activity from expenses, members, and settlements will appear here
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PageContainer>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  sectionRow: { gap: 8, marginBottom: 20 },
  sectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  sectionChipText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  settlementsList: { paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  settlementCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  settlementFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementParty: { alignItems: 'center', gap: 6, flex: 1 },
  partyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyInit: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  partyName: { fontSize: 11, textAlign: 'center' },
  flowCenter: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  flowAmount: { fontSize: 16, fontWeight: '800' },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  settleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  settleBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  receiverRow: { flexDirection: 'row', gap: 8 },
  receiverBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  receiverBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  completedText: { fontSize: 13, fontWeight: '700' },
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
  historyList: { paddingHorizontal: 20, gap: 8 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: { fontSize: 14, fontWeight: '600' },
  historyMeta: { fontSize: 11, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  activityList: { paddingHorizontal: 20, gap: 8 },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  activityDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  activityText: { fontSize: 14, fontWeight: '600' },
  activityMeta: { fontSize: 11, marginTop: 4 },
});
