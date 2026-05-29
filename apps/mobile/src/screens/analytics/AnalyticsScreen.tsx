import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { isPremiumFeature } from '../../config/features';

const { width } = Dimensions.get('window');

export function AnalyticsScreen() {
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadData();
  }, [accessToken]);

  async function loadData() {
    try {
      const [statsRes, catRes, monthlyRes] = await Promise.all([
        api.get<any>('/transactions/stats'),
        api.get<any>('/transactions/categories-summary'),
        api.get<any>('/transactions/monthly-summary'),
      ]);
      setStats({
        ...statsRes.data,
        categories: Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [],
        monthly: Array.isArray(monthlyRes.data) ? monthlyRes.data : monthlyRes.data?.data || [],
      });
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  const totalExpense = stats?.totalExpense || 0;
  const totalIncome = stats?.totalIncome || 0;
  const categories = stats?.categories || [];
  const monthly = stats?.monthly || [];

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <Text style={[styles.pageTitle, { color: colors.text.primary }]}>Analytics</Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.bg.tertiary }]}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.status.successLight }]}>
            <Ionicons name="arrow-down" size={18} color={colors.status.success} />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Income</Text>
          <Text style={[styles.summaryAmount, { color: colors.status.success }]}>{formatCurrency(totalIncome)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.bg.tertiary }]}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.status.errorLight }]}>
            <Ionicons name="arrow-up" size={18} color={colors.status.error} />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Expenses</Text>
          <Text style={[styles.summaryAmount, { color: colors.status.error }]}>{formatCurrency(totalExpense)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Spending by Category</Text>
        {categories.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No category data</Text>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((cat: any, i: number) => (
              <View key={i} style={[styles.categoryRow, { backgroundColor: colors.bg.tertiary }]}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text.primary }]}>{cat.categoryName || cat.name || 'Unknown'}</Text>
                  <Text style={[styles.categoryCount, { color: colors.text.tertiary }]}>{cat.transactionCount || 0} transactions</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryAmount, { color: colors.text.primary }]}>{formatCurrency(Number(cat.amount || 0))}</Text>
                  <View style={[styles.percentBar, { backgroundColor: colors.bg.card }]}>
                    <View style={[styles.percentFill, { width: `${Math.min(cat.percentage || 0, 100)}%`, backgroundColor: cat.color || colors.accent.primary }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Monthly Overview</Text>
        {monthly.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No monthly data yet</Text>
        ) : (
          <View style={styles.monthlyList}>
            {monthly.map((m: any, i: number) => {
              const income = m.income || 0;
              const expense = m.expense || 0;
              const maxVal = Math.max(income, expense, 1);
              return (
                <View key={i} style={[styles.monthlyRow, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={[styles.monthLabel, { color: colors.text.secondary }]}>{m.period || m.month || `Month ${i + 1}`}</Text>
                  <View style={styles.monthBars}>
                    <View style={styles.monthBarCol}>
                      <View style={[styles.bar, { height: Math.max((income / maxVal) * 64, 4), backgroundColor: colors.status.success, borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
                      <Text style={[styles.barLabel, { color: colors.text.tertiary }]}>{formatCurrency(income)}</Text>
                    </View>
                    <View style={styles.monthBarCol}>
                      <View style={[styles.bar, { height: Math.max((expense / maxVal) * 64, 4), backgroundColor: colors.status.error, borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
                      <Text style={[styles.barLabel, { color: colors.text.tertiary }]}>{formatCurrency(expense)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '700', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 28 },
  summaryCard: { flex: 1, padding: 18, borderRadius: 18 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  summaryAmount: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  section: { paddingHorizontal: 24, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  categoryList: { gap: 8 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  categoryCount: { fontSize: 11 },
  categoryRight: { alignItems: 'flex-end', marginLeft: 12 },
  categoryAmount: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  percentBar: { width: 80, height: 4, borderRadius: 2, overflow: 'hidden' },
  percentFill: { height: '100%', borderRadius: 2 },
  monthlyList: { gap: 8 },
  monthlyRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  monthLabel: { width: 70, fontSize: 12, fontWeight: '500' },
  monthBars: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  monthBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: 28, minHeight: 4, borderRadius: 6 },
  barLabel: { fontSize: 9, fontWeight: '500' },
});
