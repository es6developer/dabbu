import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

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
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId } = route.params || {};

  const [settlements, setSettlements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [submitting, setSubmitting] = useState<string | null>(null);

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
        const [optRes, histRes] = await Promise.allSettled([
          api.get<any>(`/shared-groups/${groupId}/settlements/optimized`),
          api.get<any>(`/shared-groups/${groupId}/settlements/history`),
        ]);
        if (optRes.status === 'fulfilled') {
          const d = optRes.value?.data || optRes.value;
          setSettlements(Array.isArray(d) ? d : []);
        }
        if (histRes.status === 'fulfilled') {
          const d = histRes.value?.data || histRes.value;
          setHistory(Array.isArray(d) ? d : []);
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
      await api.post(`/shared-groups/${groupId}/settlements/${settlementId}/settle`, {
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

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: 24, paddingTop: insets.top + 16, gap: 16 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={120} borderRadius={18} />
          <Skeleton width="100%" height={180} borderRadius={18} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      <View style={[s.headerRow, { paddingTop: insets.top + 14, paddingHorizontal: 20 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text.primary }]}>Settlements</Text>
      </View>

      <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>Optimized Settlements</Text>

      {settlements.length > 0 ? (
        <View style={s.settlementsList}>
          {settlements.map((s, i) => (
            <LinearGradient
              key={s.id || i}
              colors={[colors.bg.secondary, colors.bg.tertiary]}
              style={s.settlementCard}
            >
              <View style={s.settlementFlow}>
                <View style={s.settlementParty}>
                  <LinearGradient colors={[...colors.accent.gradient]} style={s.partyAvatar}>
                    <Text style={s.partyInit}>{(s.fromName?.[0] || '?').toUpperCase()}</Text>
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
                  <LinearGradient colors={[...colors.accent.gradientAlt]} style={s.partyAvatar}>
                    <Text style={s.partyInit}>{(s.toName?.[0] || '?').toUpperCase()}</Text>
                  </LinearGradient>
                  <Text style={[s.partyName, { color: colors.text.secondary }]}>
                    {s.toName || 'Someone'}
                  </Text>
                </View>
              </View>
              {s.status !== 'completed' && (
                <>
                  <Text style={[s.methodLabel, { color: colors.text.tertiary }]}>Settle via</Text>
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
                            selectedMethod === m.key ? colors.accent.primary : colors.text.tertiary
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
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                        <Text style={s.settleBtnText}>Mark as Settled</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.uploadBtn, { backgroundColor: colors.bg.tertiary }]}
                    onPress={() => Alert.alert('Upload Proof', 'Photo upload feature coming soon')}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.text.tertiary} />
                    <Text style={[s.uploadBtnText, { color: colors.text.tertiary }]}>
                      Upload Proof Image
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {s.status === 'completed' && (
                <View style={[s.completedBadge, { backgroundColor: `${colors.status.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
                  <Text style={[s.completedText, { color: colors.status.success }]}>
                    Settled via {s.method || 'UPI'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          ))}
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

      <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>Settlement History</Text>

      {history.length > 0 ? (
        <View style={s.historyList}>
          {history.map((h: any, i: number) => (
            <View key={h.id || i} style={[s.historyCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={s.historyLeft}>
                <View style={[s.historyIcon, { backgroundColor: `${colors.status.success}15` }]}>
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
                          h.status === 'completed' ? colors.status.success : colors.status.warning,
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
    </ScrollView>
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
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  settleBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  uploadBtnText: { fontSize: 13, fontWeight: '500' },
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
});
