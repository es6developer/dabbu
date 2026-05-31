import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { safeData } from '../../utils/shared-finance';
import { useSharedFinanceRealtime } from '../../hooks/useSharedFinanceRealtime';

const { width } = Dimensions.get('window');

export function TripDashboardScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { groupId } = route.params || {};
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useSharedFinanceRealtime({
    groupId,
    onExpenseCreated: () => loadDashboard(),
    onExpenseUpdated: () => loadDashboard(),
    onExpenseDeleted: () => loadDashboard(),
    onSettlementCreated: () => loadDashboard(),
    onSettlementUpdated: () => loadDashboard(),
  });

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadDashboard();
  }, [accessToken, groupId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
    }
  }, [groupId]);

  async function loadDashboard() {
    if (!groupId) {
      return;
    }
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/trip/dashboard`);
      setDashboard(safeData(res, null));
    } catch (e) {
      console.error('TripDashboard load error:', e);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={[styles.errorText, { color: colors.text.tertiary }]}>
          Dashboard not available
        </Text>
      </View>
    );
  }

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');
  const totalBudget = Number(dashboard.totalBudget) || 1;
  const totalSpent = Number(dashboard.totalSpent) || 0;
  const spentPct = Math.min((totalSpent / totalBudget) * 100, 100);
  const remaining = Math.max(totalBudget - totalSpent, 0);
  const daysRemaining = dashboard.daysRemaining || 0;
  const dailyAvg = Number(dashboard.dailyAverage) || 0;
  const categoryBreakdown = Array.isArray(dashboard.categoryBreakdown)
    ? dashboard.categoryBreakdown
    : [];
  const spendingTrend = Array.isArray(dashboard.spendingTrend) ? dashboard.spendingTrend : [];
  const perPerson = Array.isArray(dashboard.perPerson) ? dashboard.perPerson : [];
  const insights = Array.isArray(dashboard.insights) ? dashboard.insights : [];
  const ringRadius = 50;
  const ringCirc = 2 * Math.PI * ringRadius;
  const maxTrend = Math.max(...spendingTrend.map((s: any) => Number(s.amount) || 0), 1);

  const overspent = totalSpent > totalBudget;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.bg.primary, opacity: fadeAnim }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <View style={styles.budgetOverview}>
            <Svg width={120} height={120} viewBox="0 0 120 120">
              <Circle
                cx="60"
                cy="60"
                r={ringRadius}
                stroke={colors.border.subtle}
                strokeWidth="10"
                fill="none"
              />
              <Circle
                cx="60"
                cy="60"
                r={ringRadius}
                stroke={overspent ? colors.status.error : colors.accent.primary}
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${(spentPct * ringCirc) / 100} ${ringCirc}`}
                strokeDashoffset={ringCirc * 0.25}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text
                style={[
                  styles.ringPct,
                  { color: overspent ? colors.status.error : colors.text.primary },
                ]}
              >
                {spentPct.toFixed(0)}%
              </Text>
              <Text style={[styles.ringLabel, { color: colors.text.tertiary }]}>spent</Text>
            </View>
            <View style={styles.budgetInfo}>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.text.tertiary }]}>
                  Total Budget
                </Text>
                <Text style={[styles.budgetValue, { color: colors.text.primary }]}>
                  {formatCurrency(totalBudget)}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.text.tertiary }]}>Spent</Text>
                <Text style={[styles.budgetValue, { color: colors.status.error }]}>
                  {formatCurrency(totalSpent)}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.text.tertiary }]}>Remaining</Text>
                <Text style={[styles.budgetValue, { color: colors.status.success }]}>
                  {formatCurrency(remaining)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.status.info} />
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{daysRemaining}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Days left</Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <Ionicons name="trending-up" size={20} color={colors.accent.primary} />
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {formatCurrency(dailyAvg)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Daily avg</Text>
          </View>
        </View>

        {categoryBreakdown.length > 0 && (
          <Card variant="glass" style={styles.sectionCard} padding="xl">
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Category Breakdown
            </Text>
            {categoryBreakdown.map((cat: any, i: number) => {
              const pct = totalBudget > 0 ? ((cat.amount || 0) / totalBudget) * 100 : 0;
              return (
                <View key={cat.category || i} style={styles.catRow}>
                  <View style={styles.catHeader}>
                    <Text style={[styles.catName, { color: colors.text.secondary }]}>
                      {cat.category || 'Other'}
                    </Text>
                    <Text style={[styles.catAmount, { color: colors.text.primary }]}>
                      {formatCurrency(cat.amount || 0)}
                    </Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View
                      style={[
                        styles.catFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: cat.color || colors.accent.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catPct, { color: colors.text.tertiary }]}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {spendingTrend.length > 0 && (
          <Card variant="glass" style={styles.sectionCard} padding="xl">
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Spending Trend
            </Text>
            <View style={styles.trendChart}>
              {spendingTrend.map((point: any, i: number) => {
                const height = Math.max((Number(point.amount) / maxTrend) * 100, 4);
                return (
                  <View key={i} style={styles.trendCol}>
                    <View
                      style={[styles.trendBar, { height, backgroundColor: colors.accent.primary }]}
                    />
                    <Text style={[styles.trendLabel, { color: colors.text.tertiary }]}>
                      {new Date(point.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {perPerson.length > 0 && (
          <Card variant="glass" style={styles.sectionCard} padding="xl">
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Per Person</Text>
            {perPerson.map((person: any, i: number) => {
              const pct = totalSpent > 0 ? ((person.spent || 0) / totalSpent) * 100 : 0;
              return (
                <View key={person.id || i} style={styles.personRow}>
                  <Text style={[styles.personName, { color: colors.text.secondary }]}>
                    {person.name || 'Member'}
                  </Text>
                  <View style={styles.personBarTrack}>
                    <View style={[styles.personBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={[styles.personAmount, { color: colors.text.primary }]}>
                    {formatCurrency(person.spent || 0)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {insights.length > 0 && (
          <Card variant="glass" style={styles.sectionCard} padding="xl">
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>AI Insights</Text>
            {insights.map((insight: any, i: number) => (
              <View key={i} style={[styles.insightRow, { backgroundColor: colors.bg.glass }]}>
                <Ionicons name="bulb-outline" size={18} color={colors.status.warning} />
                <Text style={[styles.insightText, { color: colors.text.secondary }]}>
                  {insight.message || insight}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {overspent && (
          <View
            style={[
              styles.alertBanner,
              { backgroundColor: colors.status.errorLight, borderColor: colors.status.error },
            ]}
          >
            <Ionicons name="warning-outline" size={20} color={colors.status.error} />
            <Text style={[styles.alertText, { color: colors.status.error }]}>
              Overspent by {formatCurrency(totalSpent - totalBudget)}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15 },
  sectionCard: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  budgetOverview: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringCenter: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPct: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  ringLabel: { fontSize: 9, fontWeight: '500', marginTop: 1 },
  budgetInfo: { flex: 1, gap: 10 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetLabel: { fontSize: 11, fontWeight: '500' },
  budgetValue: { fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  catRow: { marginBottom: 14 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { fontSize: 13, fontWeight: '500' },
  catAmount: { fontSize: 13, fontWeight: '700' },
  catTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  catFill: { height: '100%', borderRadius: 4 },
  catPct: { fontSize: 10, fontWeight: '500' },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    gap: 4,
  },
  trendCol: { flex: 1, alignItems: 'center', gap: 4 },
  trendBar: { width: '100%', borderRadius: 6, minHeight: 4 },
  trendLabel: { fontSize: 8, fontWeight: '500', textAlign: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  personName: { fontSize: 13, fontWeight: '600', width: 60 },
  personBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  personBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#f7892c' },
  personAmount: { fontSize: 13, fontWeight: '700', width: 70, textAlign: 'right' },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 8,
  },
  insightText: { fontSize: 13, lineHeight: 18, flex: 1 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  alertText: { fontSize: 14, fontWeight: '600', flex: 1 },
});
