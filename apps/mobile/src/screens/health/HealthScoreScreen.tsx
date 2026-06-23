import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

export function HealthScoreScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();

  const COMPONENT_META: Record<string, { label: string; icon: string; desc: string }> = {
    savingsRate: { label: 'Savings Rate', icon: 'caretup', desc: 'Percentage of income saved each month' },
    debtRatio: { label: 'Debt Ratio', icon: 'creditcard', desc: 'Debt compared to total income' },
    budgetDiscipline: { label: 'Budget Discipline', icon: 'calculator', desc: 'How well you stick to budgets' },
    goalProgress: { label: 'Goal Progress', icon: 'flag', desc: 'Progress towards financial goals' },
    billConsistency: { label: 'Bill Consistency', icon: 'filetext1', desc: 'On-time bill payment record' },
    emergencyFund: { label: 'Emergency Fund', icon: 'checkcircle', desc: 'Months of expenses covered' },
  };

  const LEVEL_META: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: colors.status.error },
    building: { label: 'Building', color: colors.status.warning },
    stable: { label: 'Stable', color: colors.status.success },
    thriving: { label: 'Thriving', color: colors.accent.primary },
    exceptional: { label: 'Exceptional', color: '#06B6D4' },
  };
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false, refresh = false) => {
    try {
      if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
      const res = await api.get('/ai/health-score');
      setScore((res as any)?.data || res);
    } catch { /* ignore */ } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { load(!isInitial); }, [load]));

  const overall = score?.overallScore ?? 0;
  const hasScore = score && (score.components?.savingsRate > 0 || score.components?.debtRatio > 0 || score.components?.budgetDiscipline < 100 || score.components?.goalProgress < 100 || score.components?.billConsistency < 100 || score.components?.emergencyFund > 0);
  const level = score?.financialLevel || 'critical';
  const levelMeta = LEVEL_META[level] || LEVEL_META.critical;
  const change = score?.monthlyChange || 0;
  const components = score?.components || {};
  const componentKeys = Object.keys(COMPONENT_META);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={24} color={colors.text.primary}  />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Dabbu Health Score</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await load(false, true); } finally { setRefreshing(false); } }} tintColor={colors.accent?.primary || colors.brand?.primary} />}>
        <View style={[styles.scoreCard, { backgroundColor: colors.card.balance }]}>
          <View style={[styles.scoreRing, { borderColor: loading ? colors.border.subtle : levelMeta.color }]}>
            <Text style={[styles.scoreValue, { color: loading ? colors.text.tertiary : levelMeta.color }]}>
              {loading ? '-' : overall}
            </Text>
          </View>
          {score?.previousScore > 0 && (
            <Text style={[styles.changeText, { color: change >= 0 ? colors.status.success : colors.status.error }]}>
              {change >= 0 ? '+' : ''}{change} pts from last month
            </Text>
          )}
          <View style={[styles.levelBadge, { backgroundColor: levelMeta.color + '20' }]}>
            <Text style={[styles.levelText, { color: levelMeta.color }]}>{levelMeta.label}</Text>
          </View>
          {!loading && !hasScore && (
            <Text style={[styles.noDataText, { color: colors.text.tertiary }]}>
              Add transactions and accounts to see your financial health score
            </Text>
          )}
        </View>

        {!loading && !hasScore ? (
          <View style={styles.noDataContainer}>
            <AntDesign name="barschart" size={48} color={colors.text.tertiary}  />
            <Text style={[styles.noDataTitle, { color: colors.text.primary }]}>No data yet</Text>
            <Text style={[styles.noDataDesc, { color: colors.text.tertiary }]}>
              Start adding income, expenses, and accounts to track your financial health
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Breakdown</Text>
            {componentKeys.map((key) => {
              const meta = COMPONENT_META[key];
              const val = components[key] || 0;
              const barColor = val >= 70 ? colors.status.success : val >= 40 ? colors.status.warning : colors.status.error;
              return (
                <View key={key} style={[styles.componentRow, { borderBottomColor: colors.border.subtle }]}>
                  <View style={styles.compLeft}>
                    <AntDesign name={meta.icon as any} size={16} color={barColor} />
                    <View style={styles.compInfo}>
                      <Text style={[styles.compLabel, { color: colors.text.primary }]}>{meta.label}</Text>
                      <Text style={[styles.compDesc, { color: colors.text.tertiary }]}>{meta.desc}</Text>
                    </View>
                  </View>
                  <View style={styles.compRight}>
                    <View style={[styles.compBar, { backgroundColor: colors.bg.tertiary }]}>
                      <View style={[styles.compBarFill, { width: `${val}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={[styles.compScore, { color: colors.text.primary }]}>{val}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  scoreCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 42, fontWeight: '800', letterSpacing: -2 },
  changeText: { fontSize: 13, fontWeight: '500', marginTop: spacing.md },
  levelBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginTop: spacing.md },
  levelText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.md, letterSpacing: 0.3 },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  compLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  compInfo: { flex: 1 },
  compLabel: { fontSize: 14, fontWeight: '600' },
  compDesc: { fontSize: 11, marginTop: 1 },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  compBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 3 },
  compScore: { fontSize: 14, fontWeight: '700', width: 28, textAlign: 'right' },
  noDataText: { fontSize: 13, fontWeight: '500', marginTop: spacing.lg, textAlign: 'center' },
  noDataContainer: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.md },
  noDataTitle: { fontSize: 18, fontWeight: '700' },
  noDataDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.xl },
});
