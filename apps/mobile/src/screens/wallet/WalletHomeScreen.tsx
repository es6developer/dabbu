import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function WalletHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [acctsRes, statsRes, txnsRes] = await Promise.all([
        api.get('/accounts').catch(() => ({ data: [] })),
        api.get('/transactions/stats').catch(() => ({})),
        api.get('/transactions?limit=10').catch(() => ({ data: [] })),
      ]);
      const ar = acctsRes as any;
      setAccounts(Array.isArray(ar) ? ar : ar?.data || []);
      const stats = (statsRes as any)?.data || statsRes || {};
      setMonthlyIncome(Number(stats.monthlyIncome || stats.income || 0));
      setMonthlyExpense(Number(stats.monthlyExpense || stats.expense || 0));
      const tr = txnsRes as any;
      setRecentTxns(Array.isArray(tr) ? tr : tr?.data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const netMonthly = monthlyIncome - monthlyExpense;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Wallet</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.balanceCard, { backgroundColor: colors.card.balance }]}>
          <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>Total Balance</Text>
          <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>
            {loading ? '...' : fmt(totalBalance)}
          </Text>
          <View style={styles.monthlyRow}>
            <View style={styles.monthlyItem}>
              <Text style={[styles.monthlyLabel, { color: colors.status.success }]}>Income</Text>
              <Text style={[styles.monthlyValue, { color: colors.text.primary }]}>{fmt(monthlyIncome)}</Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text style={[styles.monthlyLabel, { color: colors.status.error }]}>Expenses</Text>
              <Text style={[styles.monthlyValue, { color: colors.text.primary }]}>{fmt(monthlyExpense)}</Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text style={[styles.monthlyLabel, { color: netMonthly >= 0 ? colors.status.success : colors.status.error }]}>Net</Text>
              <Text style={[styles.monthlyValue, { color: colors.text.primary }]}>{fmt(netMonthly)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Your Accounts</Text>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.bg.card }]} />
          ))
        ) : accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              No accounts yet. Add your first account to start tracking.
            </Text>
          </View>
        ) : (
          accounts.map((acct: any) => (
            <TouchableOpacity
              key={acct.id}
              style={[styles.accountCard, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}
              onPress={() => navigation.navigate('AccountDetail', { accountId: acct.id, account: acct })}
            >
              <View style={styles.accountLeft}>
                <View style={[styles.accountDot, { backgroundColor: acct.color || colors.accent.primary + '30' }]} />
                <View>
                  <Text style={[styles.accountName, { color: colors.text.primary }]}>{acct.name || acct.type}</Text>
                  <Text style={[styles.accountType, { color: colors.text.tertiary }]}>{acct.type}</Text>
                </View>
              </View>
              <Text style={[styles.accountBalance, { color: colors.text.primary }]}>{fmt(acct.balance || 0)}</Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Recent Transactions</Text>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.bg.card }]} />
          ))
        ) : recentTxns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              No transactions yet. Add your first expense or income.
            </Text>
          </View>
        ) : (
          recentTxns.map((txn: any) => (
            <View key={txn.id} style={[styles.txnRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={[styles.txnIcon, {
                backgroundColor: txn.type === 'income' ? colors.status.successLight : colors.status.errorLight
              }]}>
                <Ionicons
                  name={txn.type === 'income' ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={txn.type === 'income' ? colors.status.success : colors.status.error}
                />
              </View>
              <View style={styles.txnInfo}>
                <Text style={[styles.txnDesc, { color: colors.text.primary }]} numberOfLines={1}>
                  {txn.description || txn.title || txn.merchant || 'Transaction'}
                </Text>
                <Text style={[styles.txnCat, { color: colors.text.tertiary }]}>{txn.category?.name || (typeof txn.category === 'string' ? txn.category : '')}</Text>
              </View>
              <Text style={[styles.txnAmount, {
                color: txn.type === 'income' ? colors.status.success : colors.text.primary
              }]}>
                {txn.type === 'income' ? '+' : '-'}{fmt(txn.amount || 0)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: 0, paddingBottom: 100 },
  balanceCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  balanceLabel: { fontSize: 13, fontWeight: '500' },
  balanceAmount: { fontSize: 32, fontWeight: '700', marginTop: spacing.xs, letterSpacing: -1 },
  monthlyRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.lg },
  monthlyItem: { flex: 1 },
  monthlyLabel: { fontSize: 12, fontWeight: '600' },
  monthlyValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md, marginTop: spacing.md },
  skeletonCard: { height: 60, borderRadius: borderRadius.xl, marginBottom: spacing.sm },
  emptyState: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.sm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  accountDot: { width: 8, height: 8, borderRadius: 4 },
  accountName: { fontSize: 15, fontWeight: '600' },
  accountType: { fontSize: 12, marginTop: 1 },
  accountBalance: { fontSize: 16, fontWeight: '700' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '500' },
  txnCat: { fontSize: 12, marginTop: 1 },
  txnAmount: { fontSize: 15, fontWeight: '600' },
});
