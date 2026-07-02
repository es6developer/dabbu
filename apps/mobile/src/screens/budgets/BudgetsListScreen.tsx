import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getCategoryIcon, getCategoryColor } from '../../config/categoryIcons';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function monthLabel(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function pctColor(pct: number): string {
  if (pct > 90) return '#EF4444';
  if (pct > 70) return '#F59E0B';
  return '#22C55E';
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  period: string;
  remaining: number;
  percentage: number;
  isOver: boolean;
  notifyAt: number;
  notes: string | null;
  category: { id: string; name: string; icon: string; color: string } | null;
}

export function BudgetsListScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      const data = await api.get<Budget[]>('/budgets');
      setBudgets(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  function onRefresh() {
    setRefreshing(true);
    fetchBudgets();
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#0A1628', colors.bg.primary] : ['#E0F2FE', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.2]}
        style={{ flex: 1 }}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Budgets</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateBudget')}
            style={s.addBtn}
          >
            <AntDesign name="plus" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {budgets.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.accent.primary + '10' }]}>
                <AntDesign name="wallet" size={32} color={colors.accent.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No budgets yet</Text>
              <Text style={[s.emptySub, { color: colors.text.tertiary }]}>
                Create your first budget to start tracking your spending
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateBudget')}
                activeOpacity={0.85}
                style={s.emptyBtn}
              >
                <LinearGradient
                  colors={[colors.accent.primary, colors.accent.hover || colors.accent.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.emptyBtnGrad}
                >
                  <AntDesign name="plus" size={16} color="#FFF" />
                  <Text style={s.emptyBtnText}>Create Budget</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Summary */}
              <View style={[s.summaryCard, { backgroundColor: colors.bg.card }]}>
                <Text style={[s.summaryPeriod, { color: colors.text.tertiary }]}>
                  {monthLabel()}
                </Text>
                <View style={s.summaryRow}>
                  <View style={s.summaryItem}>
                    <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Budgeted</Text>
                    <Text style={[s.summaryValue, { color: colors.text.primary }]}>
                      {fmt(totalBudget)}
                    </Text>
                  </View>
                  <View style={s.summaryItem}>
                    <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Spent</Text>
                    <Text style={[s.summaryValue, { color: pctColor(totalPct) }]}>
                      {fmt(totalSpent)}
                    </Text>
                  </View>
                  <View style={s.summaryItem}>
                    <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Remaining</Text>
                    <Text style={[s.summaryValue, { color: colors.status.success }]}>
                      {fmt(totalBudget - totalSpent)}
                    </Text>
                  </View>
                </View>
                <View style={[s.progressTrack, { backgroundColor: colors.border.subtle }]}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${Math.min(totalPct, 100)}%`,
                        backgroundColor: pctColor(totalPct),
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Budget Cards */}
              {budgets.map((b) => {
                const catName = b.category?.name || null;
                const icon = catName ? getCategoryIcon(catName) : 'wallet';
                const color = catName ? getCategoryColor(catName) : colors.accent.primary;
                const pct = b.percentage;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.budgetCard, { backgroundColor: colors.bg.card }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('CreateBudget', { budgetId: b.id })}
                  >
                    <View style={s.budgetTop}>
                      <View style={[s.budgetIcon, { backgroundColor: color + '15' }]}>
                        <AntDesign name={icon as any} size={18} color={color} />
                      </View>
                      <View style={s.budgetInfo}>
                        <Text style={[s.budgetName, { color: colors.text.primary }]}>{b.name}</Text>
                        <Text style={[s.budgetPeriod, { color: colors.text.tertiary }]}>
                          {b.period.charAt(0).toUpperCase() + b.period.slice(1)} budget
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.budgetSpent, { color: colors.text.primary }]}>
                          {fmt(b.spent)}
                        </Text>
                        <Text style={[s.budgetOf, { color: colors.text.tertiary }]}>
                          of {fmt(b.amount)}
                        </Text>
                      </View>
                    </View>
                    <View style={[s.progressTrack, { backgroundColor: colors.border.subtle, marginTop: 10 }]}>
                      <View
                        style={[
                          s.progressFill,
                          {
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: pctColor(pct),
                          },
                        ]}
                      />
                    </View>
                    <View style={s.budgetBottom}>
                      <Text style={[s.budgetPct, { color: pctColor(pct) }]}>
                        {pct}% used
                      </Text>
                      <Text style={[s.budgetRemaining, { color: colors.text.tertiary }]}>
                        {fmt(b.remaining)} remaining
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  addBtn: { width: 40, height: 40, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: spacing.sm },
  emptySub: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: spacing['2xl'] },
  emptyBtn: { borderRadius: borderRadius['2xl'], overflow: 'hidden' },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 18 },
  emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  summaryCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.md },
  summaryPeriod: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  budgetCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.sm },
  budgetTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  budgetIcon: { width: 40, height: 40, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  budgetInfo: { flex: 1 },
  budgetName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  budgetPeriod: { fontSize: 12, fontWeight: '500' },
  budgetSpent: { fontSize: 16, fontWeight: '700' },
  budgetOf: { fontSize: 12, fontWeight: '500' },
  budgetBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  budgetPct: { fontSize: 12, fontWeight: '700' },
  budgetRemaining: { fontSize: 12, fontWeight: '500' },
});
