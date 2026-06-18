import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function AccountDetailScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const account = route.params?.account || {};
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTxns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/transactions?accountId=${account.id}&limit=50`);
      setTxns(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [account.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={24} color={colors.text.primary}  />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>{account.name || 'Account'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={[styles.balanceCard, { backgroundColor: colors.card.balance }]}>
        <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>Balance</Text>
        <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>{fmt(account.balance || 0)}</Text>
        <Text style={[styles.accountType, { color: colors.text.tertiary }]}>{account.type}</Text>
      </View>
      <ScrollView style={styles.list}>
        {txns.map((txn: any) => (
          <View key={txn.id} style={[styles.txnRow, { borderBottomColor: colors.border.subtle }]}>
            <View style={styles.txnInfo}>
              <Text style={[styles.txnDesc, { color: colors.text.primary }]}>{txn.description}</Text>
              <Text style={[styles.txnDate, { color: colors.text.tertiary }]}>{txn.date}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: txn.type === 'arrowdown' ? colors.status.success : colors.text.primary }]}>
              {txn.type === 'arrowdown' ? '+' : '-'}{fmt(txn.amount || 0)}
            </Text>
          </View>
        ))}
        {loading && <Text style={[styles.loading, { color: colors.text.tertiary }]}>Loading...</Text>}
        {!loading && txns.length === 0 && (
          <Text style={[styles.empty, { color: colors.text.tertiary }]}>No transactions yet</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 17, fontWeight: '600' },
  balanceCard: { margin: spacing.xl, padding: spacing.xl, borderRadius: borderRadius['3xl'], alignItems: 'center' },
  balanceLabel: { fontSize: 13, fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '700', letterSpacing: -1, marginTop: spacing.xs },
  accountType: { fontSize: 13, marginTop: spacing.xs },
  list: { flex: 1, paddingHorizontal: spacing.xl },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '500' },
  txnDate: { fontSize: 12, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '600' },
  loading: { textAlign: 'center', padding: spacing.xl },
  empty: { textAlign: 'center', padding: spacing.xl },
});
