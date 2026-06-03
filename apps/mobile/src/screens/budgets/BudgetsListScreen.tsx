import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function BudgetsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadBudgets();
  }, [accessToken]);

  async function loadBudgets() {
    try {
      const res = await api.get<any>('/accounts/budgets');
      setBudgets(Array.isArray(res.data) ? res.data : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  function getBarColor(pct: number) {
    if (pct > 90) return colors.status.error;
    if (pct > 70) return colors.status.warning;
    return colors.status.success;
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 16 }]}>
        <Skeleton width={140} height={16} />
        <Skeleton width="100%" height={70} borderRadius={16} />
        <Skeleton width="100%" height={70} borderRadius={16} />
        <Skeleton width="85%" height={70} borderRadius={16} />
        <Skeleton width="100%" height={70} borderRadius={16} />
        <Skeleton width="60%" height={70} borderRadius={16} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={budgets} keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadBudgets} tintColor={colors.accent.primary} />}
        contentContainerStyle={budgets.length === 0 ? styles.emptyContainer : { padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const spent = Number(item.spent || item._sum?.amount || 0);
          const limit = Number(item.limit || item.amount || 0);
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const barColor = getBarColor(pct);
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.name, { color: colors.text.primary }]}>{item.name || item.category?.name || 'Budget'}</Text>
                <Text style={[styles.period, { color: colors.text.tertiary }]}>{item.period || 'monthly'}</Text>
              </View>
              <View style={[styles.barOuter, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.spent, { color: colors.text.primary }]}>₹{spent.toLocaleString('en-IN')}</Text>
                <Text style={[styles.limit, { color: colors.text.tertiary }]}>of ₹{limit.toLocaleString('en-IN')}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No budgets</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Create a budget to manage spending together</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 16, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  period: { fontSize: 11, textTransform: 'capitalize' },
  barOuter: { height: 8, borderRadius: 4, marginBottom: 8 },
  barInner: { height: 8, borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  spent: { fontSize: 14, fontWeight: '600' },
  limit: { fontSize: 14 },
  emptyContainer: { flexGrow: 1 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
});
