import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useLensChange } from '../../hooks/useLensChange';
import { api, setAccessToken } from '../../services/api';
import { PremiumLoaderScreen } from '../../components/ui/PremiumLoaderScreen';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { PageContainer } from '../../components/ui/PageContainer';
import { SettleUpModal } from '../../components/ui/SettleUpModal';

import { alertService } from '../../components/ui';
function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function SettlementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId } = route.params || {};

  const [settlements, setSettlements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [completedSettlementIds, setCompletedSettlementIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'pending' | 'history'>('pending');
  const [settleModal, setSettleModal] = useState<{ visible: boolean; settlement: any }>({
    visible: false,
    settlement: null,
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      if (!groupId) {
        return;
      }
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
        setLoadingProgress(0);
      }
      const totalCalls = 2;
      let completed = 0;
      const tick = () => {
        completed++;
        setLoadingProgress(Math.min(Math.round((completed / totalCalls) * 100), 95));
      };
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const optP = api
          .get<any>(`/shared-finance/groups/${groupId}/settlements/plan`)
          .finally(tick);
        const histP = api.get<any>(`/shared-finance/groups/${groupId}/settlements`).finally(tick);
        const [optRes, histRes] = await Promise.allSettled([optP, histP]);
        if (optRes.status === 'fulfilled') {
          setSettlements(Array.isArray(optRes.value) ? optRes.value : []);
        }
        if (histRes.status === 'fulfilled') {
          setHistory(Array.isArray(histRes.value) ? histRes.value : []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProgress(100);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, groupId],
  );

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  useLensChange(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  const visibleSettlements = settlements.filter(
    (s: any) => s.status !== 'checkcircle' && !completedSettlementIds.has(s.settlementId || s.id),
  );

  async function handlePayNowUpi(settlement: any) {
    setSubmitting(settlement.id);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const upiLink = `upi://pay?pa=${encodeURIComponent(settlement.toUpiId || settlement.toEmail || '')}&pn=${encodeURIComponent(settlement.toName || '')}&am=${settlement.amount || 0}&cu=INR&tn=Settling%20via%20Dabbu`;
      const supported = await Linking.canOpenURL(upiLink);
      if (supported) {
        await Linking.openURL(upiLink);
      } else {
        alertService.alert(
          'Pay via UPI',
          `Pay ${fmt(settlement.amount || 0)} to ${settlement.toName || 'Someone'}\nUPI: ${upiLink}`,
        );
      }
    } catch (e: any) {
      alertService.alert('Error', e.message || 'Failed to open UPI');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleMarkCash(settlement: any) {
    setSubmitting(settlement.id);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const settlementId = settlement.settlementId || settlement.id;
      await api.post(`/shared-finance/settlements/${settlementId}/complete`, { method: 'wallet' });
      setCompletedSettlementIds((prev) => new Set(prev).add(settlementId));
      showToast(`${fmt(settlement.amount || 0)} settled in cash`);
      await loadData(true);
    } catch (e: any) {
      alertService.alert('Error', e.message || 'Failed to mark as settled');
    } finally {
      setSubmitting(null);
    }
  }

  function showToast(msg: string) {
    alertService.alert('', msg);
  }

  async function handleBatchSettle() {
    const myPending = visibleSettlements.filter((s: any) => s.fromUserId === currentUser?.id);
    if (myPending.length === 0) {
      alertService.alert('Nothing to settle', 'You have no pending payments.');
      return;
    }
    setBatchSubmitting(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      let settled = 0;
      for (const s of myPending) {
        const settlementId = s.settlementId || s.id;
        try {
          await api.post(`/shared-finance/settlements/${settlementId}/complete`, {
            method: 'wallet',
          });
          setCompletedSettlementIds((prev) => new Set(prev).add(settlementId));
          settled++;
        } catch {
          /* skip failed ones */
        }
      }
      alertService.alert('Done', `${settled} of ${myPending.length} settlements completed.`);
      await loadData(true);
    } finally {
      setBatchSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PremiumLoaderScreen progress={loadingProgress} title="Loading Settlements" icon="swap" />
    );
  }

  return (
    <PageContainer noPadding>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={[s.screen, { backgroundColor: colors.bg.primary }]}
          contentContainerStyle={{}}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(false, true)}
              tintColor={colors.accent.primary}
            />
          }
        >
          <View style={[s.header, { paddingTop: insets.top + 12, paddingHorizontal: 20 }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[s.headerBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <AntDesign name="arrowleft" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.text.primary }]}>Settlements</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.sectionRow, { paddingHorizontal: 20 }]}
          >
            {[
              { key: 'pending' as const, label: 'Pending', icon: 'swap' },
              { key: 'history' as const, label: 'History', icon: 'clockcircleo' },
            ].map((section) => (
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
                <AntDesign
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

          {activeSection === 'pending' && (
            <>
              {visibleSettlements.length > 0 ? (
                <View style={s.settlementsList}>
                  {visibleSettlements.map((item, i) => {
                    const isPayer = item.fromUserId === currentUser?.id;
                    return (
                      <View
                        key={item.id || i}
                        style={[s.settlementCard, { backgroundColor: colors.bg.secondary }]}
                      >
                        <View style={s.settlementFlow}>
                          <View style={s.settlementParty}>
                            <View
                              style={[s.partyAvatar, { backgroundColor: colors.accent.primary }]}
                            >
                              <Text style={s.partyInit}>
                                {(item.fromName?.[0] || '?').toUpperCase()}
                              </Text>
                            </View>
                            <Text style={[s.partyName, { color: colors.text.secondary }]}>
                              {item.fromName || 'Someone'}
                            </Text>
                          </View>
                          <View style={s.flowCenter}>
                            <AntDesign name="arrowright" size={20} color={colors.accent.primary} />
                            <Text style={[s.flowAmount, { color: colors.accent.primary }]}>
                              {fmt(item.amount || 0)}
                            </Text>
                          </View>
                          <View style={s.settlementParty}>
                            <View
                              style={[s.partyAvatar, { backgroundColor: colors.status.success }]}
                            >
                              <Text style={s.partyInit}>
                                {(item.toName?.[0] || '?').toUpperCase()}
                              </Text>
                            </View>
                            <Text style={[s.partyName, { color: colors.text.secondary }]}>
                              {item.toName || 'Someone'}
                            </Text>
                          </View>
                        </View>
                        <View style={s.actionRow}>
                          <TouchableOpacity
                            style={[
                              s.payNowBtn,
                              { backgroundColor: colors.accent.primary },
                              submitting === item.id && { opacity: 0.6 },
                            ]}
                            onPress={() => handlePayNowUpi(item)}
                            disabled={submitting === item.id}
                          >
                            {submitting === item.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <AntDesign name="mobile1" size={16} color="#FFF" />
                                <Text style={s.payNowBtnText}>Pay via UPI</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          {isPayer && (
                            <TouchableOpacity
                              style={[
                                s.cashBtn,
                                { backgroundColor: `${colors.status.success}15` },
                                submitting === item.id && { opacity: 0.6 },
                              ]}
                              onPress={() => handleMarkCash(item)}
                              disabled={submitting === item.id}
                            >
                              <AntDesign name="wallet" size={16} color={colors.status.success} />
                              <Text style={[s.cashBtnText, { color: colors.status.success }]}>
                                Cash
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={[s.emptyCard, { backgroundColor: colors.bg.secondary }]}>
                  <AntDesign name="checkcircle" size={36} color={colors.status.success} />
                  <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
                    All settled up!
                  </Text>
                  <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                    No pending settlements. Everyone is square.
                  </Text>
                </View>
              )}
            </>
          )}

          {activeSection === 'history' && (
            <>
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
                          <AntDesign name="swap" size={18} color={colors.status.success} />
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
                                h.status === 'checkcircle'
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
                                  h.status === 'checkcircle'
                                    ? colors.status.success
                                    : colors.status.warning,
                              },
                            ]}
                          >
                            {h.status === 'checkcircle' ? 'Completed' : 'Pending'}
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
        </ScrollView>

        {activeSection === 'pending' && visibleSettlements.length > 0 && (
          <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
            <TouchableOpacity
              style={[s.batchBtn, { backgroundColor: colors.accent.primary }]}
              onPress={handleBatchSettle}
              disabled={batchSubmitting}
            >
              {batchSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <AntDesign name="checkcircle" size={18} color="#FFF" />
                  <Text style={s.batchBtnText}>
                    Settle All ({visibleSettlements.length} pending)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </PageContainer>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },

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
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  batchBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  settlementsList: { paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  settlementCard: { borderRadius: 20, padding: 18, gap: 14 },
  settlementFlow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  actionRow: { flexDirection: 'row', gap: 8 },
  payNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  payNowBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  cashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cashBtnText: { fontSize: 14, fontWeight: '700' },
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
});
