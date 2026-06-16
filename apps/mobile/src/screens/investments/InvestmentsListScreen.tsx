import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function InvestmentsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {setAccessToken(accessToken);}
    loadInvestments();
  }, [accessToken]);

  async function loadInvestments() {
    try {
      const res = await api.get<any>('/accounts/investments');
      setInvestments(Array.isArray(res) ? res : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 16 }]}>
        <Skeleton width={160} height={16} />
        <Skeleton width="100%" height={90} borderRadius={16} />
        <Skeleton width="100%" height={60} borderRadius={12} />
        <Skeleton width="100%" height={60} borderRadius={12} />
        <Skeleton width="80%" height={60} borderRadius={12} />
        <Skeleton width="100%" height={60} borderRadius={12} />
        <Skeleton width="60%" height={60} borderRadius={12} />
      </View>
    );
  }

  const totalValue = investments.reduce((s, i) => s + Number(i.currentValue || i.amount || 0), 0);
  const totalInvested = investments.reduce((s, i) => s + Number(i.investedAmount || i.amount || 0), 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.summary, { backgroundColor: colors.bg.secondary }]}>
        <Text style={[styles.summaryTitle, { color: colors.text.tertiary }]}>Portfolio Value</Text>
        <Text style={[styles.summaryValue, { color: colors.text.primary }]}>₹{totalValue.toLocaleString('en-IN')}</Text>
        <Text style={[styles.return, returnPct >= 0 ? { color: colors.status.success } : { color: colors.status.error }]}>
          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}% (₹{totalReturn.toLocaleString('en-IN')})
        </Text>
      </View>

      <FlatList
        data={investments} keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadInvestments} tintColor={colors.accent.primary} />}
        contentContainerStyle={investments.length === 0 ? styles.emptyContainer : { paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const cur = Number(item.currentValue || item.amount || 0);
          const inv = Number(item.investedAmount || item.amount || 0);
          const ret = cur - inv;
          const retPct = inv > 0 ? (ret / inv) * 100 : 0;
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.investName, { color: colors.text.primary }]}>{item.name || item.type || 'Investment'}</Text>
                  <Text style={[styles.investType, { color: colors.text.tertiary }]}>{item.type || 'Mutual Fund'}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.currentValue, { color: colors.text.primary }]}>₹{cur.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.returnPct, retPct >= 0 ? { color: colors.status.success } : { color: colors.status.error }]}>
                    {retPct >= 0 ? '+' : ''}{retPct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Build your future</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Track your mutual funds, stocks, and investments in one place. Every great portfolio starts with a single step.</Text>
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summary: { margin: 16, padding: 20, borderRadius: 16, alignItems: 'center' },
  summaryTitle: { fontSize: 14, marginBottom: 4 },
  summaryValue: { fontSize: 36, fontWeight: '700', marginBottom: 4 },
  return: { fontSize: 16, fontWeight: '600' },
  card: { padding: 16, borderRadius: 16, marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  investName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  investType: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end' },
  currentValue: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  returnPct: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { flexGrow: 1 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
});
