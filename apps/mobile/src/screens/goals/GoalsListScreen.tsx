import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function GoalsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadGoals();
  }, [accessToken]);

  async function loadGoals() {
    try {
      const res = await api.get<any>('/accounts/goals');
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) return <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}><ActivityIndicator color={colors.accent.primary} size="large" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={goals} keyExtractor={(g) => g.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadGoals} tintColor={colors.accent.primary} />}
        contentContainerStyle={goals.length === 0 ? styles.emptyContainer : { padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const saved = Number(item.saved || item.currentAmount || 0);
          const target = Number(item.target || item.targetAmount || 0);
          const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.goalName, { color: colors.text.primary }]}>{item.name}</Text>
                <Text style={[styles.goalType, { color: colors.text.tertiary }]}>{item.type || 'custom'}</Text>
              </View>
              {item.targetDate && (
                <Text style={[styles.targetDate, { color: colors.text.tertiary }]}>Target: {new Date(item.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              )}
              <View style={[styles.barOuter, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: colors.accent.primary }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.saved, { color: colors.status.success }]}>₹{saved.toLocaleString('en-IN')}</Text>
                <Text style={[styles.target, { color: colors.text.tertiary }]}>₹{target.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={[styles.pctText, { color: colors.text.tertiary }]}>{Math.round(pct)}% complete</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No goals</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Set a savings goal to get started</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  goalName: { fontSize: 16, fontWeight: '600' },
  goalType: { fontSize: 11, textTransform: 'capitalize' },
  targetDate: { fontSize: 12, marginBottom: 12 },
  barOuter: { height: 8, borderRadius: 4, marginBottom: 8 },
  barInner: { height: 8, borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  saved: { fontSize: 14, fontWeight: '600' },
  target: { fontSize: 14 },
  pctText: { fontSize: 12, textAlign: 'right' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
});
