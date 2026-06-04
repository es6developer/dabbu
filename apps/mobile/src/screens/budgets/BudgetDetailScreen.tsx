import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function BudgetDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { budgetId } = route.params || {};
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (accessToken) {setAccessToken(accessToken);}
    loadBudget();
  }, [budgetId]);

  async function loadBudget() {
    try {
      const res = await api.get<any>(`/accounts/budgets/${budgetId}`);
      setBudget(res);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(true);
        try {
          if (accessToken) {setAccessToken(accessToken);}
          await api.delete(`/accounts/budgets/${budgetId}`);
          navigation.goBack();
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to delete budget');
        } finally { setDeleting(false); }
      }},
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 16 }]}>
        <Skeleton width={180} height={20} />
        <Skeleton width="100%" height={140} borderRadius={20} />
        <Skeleton width="100%" height={60} borderRadius={12} />
        <Skeleton width="100%" height={60} borderRadius={12} />
        <Skeleton width="70%" height={60} borderRadius={12} />
      </View>
    );
  }
  if (!budget) {return <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}><Text style={[styles.errorText, { color: colors.status.error }]}>Budget not found</Text></View>;}

  const spent = Number(budget.spent || budget._sum?.amount || 0);
  const limit = Number(budget.limit || budget.amount || 0);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - spent, 0);
  const barColor = pct > 90 ? colors.status.error : pct > 70 ? colors.status.warning : colors.status.success;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.headerCard, { backgroundColor: colors.bg.secondary }]}>
        <Text style={[styles.budgetName, { color: colors.text.primary }]}>{budget.name || budget.category?.name || 'Budget'}</Text>
        <Text style={[styles.period, { color: colors.text.tertiary }]}>{budget.period || 'monthly'}</Text>
        <View style={styles.progressSection}>
          <View style={[styles.barOuter, { backgroundColor: colors.bg.tertiary }]}>
            <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: barColor }]} />
          </View>
          <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct)}%</Text>
        </View>
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Spent</Text>
            <Text style={[styles.amountValue, { color: colors.text.primary }]}>₹{spent.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Remaining</Text>
            <Text style={[styles.amountValue, { color: remaining > 0 ? colors.status.success : colors.status.error }]}>₹{remaining.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Limit</Text>
            <Text style={[styles.amountValue, { color: colors.text.primary }]}>₹{limit.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Details</Text>
        <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
          <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Period</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>{budget.period || 'Monthly'}</Text>
        </View>
        {budget.category && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Category</Text>
            <View style={[styles.categoryBadge, { backgroundColor: `${colors.accent.primary}18` }]}><Text style={[styles.categoryText, { color: colors.accent.primary }]}>{budget.category.name || budget.category}</Text></View>
          </View>
        )}
        <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
          <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Start Date</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>{new Date(budget.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
        {budget.endDate && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>End Date</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>{new Date(budget.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
        )}
      </View>

      {budget.transactions && budget.transactions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Transactions in this budget</Text>
          {budget.transactions.map((txn: any, i: number) => (
            <View key={i} style={[styles.txnRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={styles.txnLeft}>
                <Text style={[styles.txnDesc, { color: colors.text.primary }]}>{txn.description || 'Transaction'}</Text>
                <Text style={[styles.txnDate, { color: colors.text.tertiary }]}>{new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
              </View>
              <Text style={[styles.txnAmount, txn.transactionType === 'credit' ? { color: colors.status.success } : { color: colors.status.error }]}>
                {txn.transactionType === 'credit' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]} onPress={() => navigation.navigate('CreateBudget', { budget })}>
          <Text style={[styles.editBtnText, { color: colors.text.primary }]}>✎ Edit Budget</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: `${colors.status.error}18`, borderColor: `${colors.status.error}40` }, deleting && { opacity: 0.6 }]} onPress={handleDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color={colors.status.error} /> : <Text style={[styles.deleteBtnText, { color: colors.status.error }]}>🗑 Delete</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16 },
  headerCard: { margin: 16, padding: 24, borderRadius: 18 },
  budgetName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  period: { fontSize: 13, textTransform: 'capitalize', marginBottom: 20 },
  progressSection: { marginBottom: 20 },
  barOuter: { height: 12, borderRadius: 6, marginBottom: 8, overflow: 'hidden' },
  barInner: { height: 12, borderRadius: 6 },
  pctText: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountItem: { alignItems: 'center' },
  amountLabel: { fontSize: 11, marginBottom: 4 },
  amountValue: { fontSize: 18, fontWeight: '700' },
  section: { padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  txnLeft: { flex: 1 },
  txnDesc: { fontSize: 14, marginBottom: 2 },
  txnDate: { fontSize: 11 },
  txnAmount: { fontSize: 15, fontWeight: '600' },
  actions: { padding: 16, gap: 12, marginBottom: 40 },
  editBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  editBtnText: { fontSize: 16, fontWeight: '600' },
  deleteBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  deleteBtnText: { fontSize: 16, fontWeight: '600' },
});
