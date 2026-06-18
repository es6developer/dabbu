import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { SettleUpModal } from '../../components/ui/SettleUpModal';

const { width } = Dimensions.get('window');

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Settlement {
  id: string;
  date: string;
  amount: number;
  from: string;
  to: string;
  status: 'checkcircle' | 'pending';
  method: string;
}

interface Outstanding {
  id: string;
  description: string;
  paidBy: string;
  amount: number;
  yourShare: number;
  partnerShare: number;
}

interface SettlementsData {
  balance: {
    youOwe: number;
    partnerOwes: number;
    netBalance: number;
    youOwePartner: boolean;
  };
  settlements: Settlement[];
  outstanding: Outstanding[];
}

export function CoupleSettlementsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SettlementsData | null>(null);
  const [error, setError] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setError('No active couple space found.');
        setData(null);
        return;
      }
      const res = await api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/settlements`);
      setData(res as SettlementsData);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettleUp = useCallback(() => {
    setSettleModalVisible(true);
  }, []);

  async function confirmCoupleSettleUp() {
    if (!data) {
      return;
    }
    const { balance } = data;
    const amount = Math.abs(balance.netBalance);
    setSettleModalVisible(false);
    setSettling(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        throw new Error('No couple group found');
      }

      await api.post(`/shared-finance/groups/${coupleGroup.id}/couple/settle-up`, {
        amount,
        paidBy: balance.youOwePartner ? 'partner1' : 'partner2',
      });

      Alert.alert(
        'Settled!',
        'Your balance has been settled successfully. Your partner has been notified.',
      );
      setRefreshing(true);
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Settlement failed. Please try again.');
    } finally {
      setSettling(false);
    }
  }

  const bal = data?.balance;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 28,
            paddingHorizontal: 20,
            backgroundColor: colors.accent.primary,
          }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <AntDesign  name="arrowleft" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settlements</Text>
            <View style={{ width: 34 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -16, gap: 16 }}>
          {bal && (
            <View style={[styles.balanceCard, { backgroundColor: '#FFEBB4' }]}>
              <Text style={styles.balanceEyebrow}>Balance Summary</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceSide}>
                  <Text style={styles.balanceLabel}>You</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      { color: bal.youOwePartner ? '#FF4D4F' : '#34C759' },
                    ]}
                  >
                    {bal.youOwePartner ? `-${fmt(bal.youOwe)}` : `+${fmt(bal.partnerOwes)}`}
                  </Text>
                  <View
                    style={[
                      styles.balanceTag,
                      {
                        backgroundColor: bal.youOwePartner
                          ? 'rgba(255,77,79,0.15)'
                          : 'rgba(52,199,89,0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.balanceTagText,
                        { color: bal.youOwePartner ? '#FF4D4F' : '#34C759' },
                      ]}
                    >
                      {bal.youOwePartner ? 'You owe' : 'You get back'}
                    </Text>
                  </View>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceSide}>
                  <Text style={styles.balanceLabel}>Partner</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      { color: !bal.youOwePartner ? '#FF4D4F' : '#34C759' },
                    ]}
                  >
                    {!bal.youOwePartner ? `-${fmt(bal.partnerOwes)}` : `+${fmt(bal.youOwe)}`}
                  </Text>
                  <View
                    style={[
                      styles.balanceTag,
                      {
                        backgroundColor: !bal.youOwePartner
                          ? 'rgba(255,77,79,0.15)'
                          : 'rgba(52,199,89,0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.balanceTagText,
                        { color: !bal.youOwePartner ? '#FF4D4F' : '#34C759' },
                      ]}
                    >
                      {!bal.youOwePartner ? 'Owes' : 'Gets back'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.netBalanceRow}>
                <Text style={styles.netLabel}>Net Balance</Text>
                <Text
                  style={[styles.netAmount, { color: bal.netBalance >= 0 ? '#34C759' : '#FF4D4F' }]}
                >
                  {bal.netBalance >= 0 ? '+' : ''}
                  {fmt(bal.netBalance)}
                </Text>
              </View>
              {bal.youOwePartner ? (
                <TouchableOpacity
                  style={[styles.settleBtn, { opacity: settling ? 0.6 : 1 }]}
                  activeOpacity={0.8}
                  onPress={handleSettleUp}
                  disabled={settling}
                >
                  <AntDesign  name="swap" size={18} color="#FFF" />
                  <Text style={styles.settleBtnText}>{settling ? 'Settling...' : 'Settle Up'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.settlePending}>
                  <AntDesign  name="clockcircleo" size={16} color={colors.accent.primary} />
                  <Text style={styles.settlePendingText}>Waiting for partner to settle</Text>
                </View>
              )}
            </View>
          )}

          {data?.outstanding && data.outstanding.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
              <View style={styles.sectionHeaderRow}>
                <AntDesign  name="filetext1" size={18} color={colors.accent.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Outstanding Transactions
                </Text>
              </View>
              <Text style={[styles.sectionSub, { color: colors.text.tertiary }]}>
                Un-settled shared expenses
              </Text>
              {data.outstanding.map((item) => (
                <View
                  key={item.id}
                  style={[styles.outstandingItem, { borderColor: colors.border.subtle }]}
                >
                  <View style={styles.outstandingLeft}>
                    <Text style={[styles.outstandingDesc, { color: colors.text.primary }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.outstandingPaidBy, { color: colors.text.tertiary }]}>
                      Paid by {item.paidBy}
                    </Text>
                  </View>
                  <View style={styles.outstandingRight}>
                    <Text style={[styles.outstandingAmt, { color: colors.text.primary }]}>
                      {fmt(item.amount)}
                    </Text>
                    <View style={styles.shareRow}>
                      <Text style={[styles.shareText, { color: colors.text.tertiary }]}>
                        Your share: {fmt(item.yourShare)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {data?.settlements && data.settlements.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
              <View style={styles.sectionHeaderRow}>
                <AntDesign  name="swap" size={18} color={colors.accent.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Settlement History
                </Text>
              </View>
              {data.settlements.map((item) => (
                <View
                  key={item.id}
                  style={[styles.settlementItem, { borderColor: colors.border.subtle }]}
                >
                  <View style={styles.settlementTop}>
                    <View style={styles.settlementLeft}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.status === 'checkcircle' ? '#34C759' : '#F59E0B' },
                        ]}
                      />
                      <View>
                        <Text style={[styles.settlementDate, { color: colors.text.tertiary }]}>
                          {fmtDate(item.date)}
                        </Text>
                        <Text style={[styles.settlementParties, { color: colors.text.secondary }]}>
                          {item.from} paid {item.to}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.settlementAmt, { color: colors.text.primary }]}>
                      {fmt(item.amount)}
                    </Text>
                  </View>
                  <View style={styles.settlementBottom}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status === 'checkcircle'
                              ? 'rgba(52,199,89,0.12)'
                              : 'rgba(245,158,11,0.12)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: item.status === 'checkcircle' ? '#34C759' : '#F59E0B' },
                        ]}
                      >
                        {item.status === 'checkcircle' ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                    <Text style={[styles.methodText, { color: colors.text.tertiary }]}>
                      {item.method}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {error && !data && (
            <View style={[styles.errorCard, { backgroundColor: colors.bg.card }]}>
              <AntDesign
                 name="exclamationcircle"
                size={32}
                color={colors.status?.error || '#FF4D4F'}
              />
              <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
            </View>
          )}

          {data && !bal && (
            <View style={[styles.errorCard, { backgroundColor: colors.bg.card }]}>
              <AntDesign  name="wallet" size={32} color={colors.text.tertiary} />
              <Text style={[styles.errorText, { color: colors.text.secondary }]}>
                No balance data available
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SettleUpModal
        visible={settleModalVisible}
        amount={Math.abs(data?.balance?.netBalance || 0)}
        fromName={data?.balance?.youOwePartner ? 'You' : 'Your partner'}
        toName={data?.balance?.youOwePartner ? 'Your partner' : 'You'}
        loading={settling}
        onConfirm={confirmCoupleSettleUp}
        onCancel={() => setSettleModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  balanceCard: {
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  balanceEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  balanceSide: { flex: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: '#F97316', marginBottom: 4 },
  balanceAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  balanceTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  balanceTagText: { fontSize: 11, fontWeight: '700' },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(93,56,181,0.15)',
    marginHorizontal: 8,
    alignSelf: 'stretch',
  },
  netBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93,56,181,0.12)',
  },
  netLabel: { fontSize: 13, fontWeight: '600', color: '#F97316' },
  netAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  settleBtn: {
    backgroundColor: '#F97316',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settleBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  settlePending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  settlePendingText: { fontSize: 13, fontWeight: '600', color: '#F97316' },

  sectionCard: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSub: { fontSize: 12, fontWeight: '500', marginTop: -4 },

  outstandingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  outstandingLeft: { flex: 1 },
  outstandingDesc: { fontSize: 14, fontWeight: '600' },
  outstandingPaidBy: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  outstandingRight: { alignItems: 'flex-end' },
  outstandingAmt: { fontSize: 16, fontWeight: '700' },
  shareRow: { marginTop: 2 },
  shareText: { fontSize: 11, fontWeight: '500' },

  settlementItem: { paddingVertical: 12, borderTopWidth: 1, gap: 8 },
  settlementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settlementLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  settlementDate: { fontSize: 12, fontWeight: '500' },
  settlementParties: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  settlementAmt: { fontSize: 16, fontWeight: '700' },
  settlementBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  methodText: { fontSize: 11, fontWeight: '500' },

  errorCard: { borderRadius: 20, padding: 32, alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
