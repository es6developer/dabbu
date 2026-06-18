import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();

export function YearlySummaryScreen() {
  const { colors: c } = useTheme();
  const theme = { background: c.bg.primary, text: c.text.primary, card: c.bg.card, subtext: c.text.secondary, muted: c.text.tertiary, primary: c.accent.primary, border: c.border.subtle };
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/retention/yearly-summary/${year}`);
      setSummary(res.data || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(selectedYear);
  }, [selectedYear, fetchSummary]);

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

  if (loading && !summary) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchSummary(selectedYear);
          }}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Year in Review</Text>
        <Text style={[styles.headerSub, { color: theme.muted }]}>
          Your financial year at a glance
        </Text>

        <View style={styles.yearRow}>
          {years.map((y) => (
            <TouchableOpacity
              key={y}
              style={[
                styles.yearChip,
                {
                  backgroundColor: selectedYear === y ? theme.primary + '20' : theme.border,
                  borderColor: selectedYear === y ? theme.primary : 'transparent',
                },
              ]}
              onPress={() => setSelectedYear(y)}
            >
              <Text
                style={{
                  color: selectedYear === y ? theme.primary : theme.subtext,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {summary && (
        <>
          <View style={styles.summaryCards}>
            <View style={[styles.statCard, { backgroundColor: '#22c55e20' }]}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                ₹{(summary.totalIncome || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Income</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ef444420' }]}>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>
                ₹{(summary.totalExpense || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#6366f120' }]}>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>
                ₹{(summary.netSavings || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Net Savings</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Breakdown</Text>
            {MONTHS.map((month, idx) => {
              const m = summary.monthlyData?.[idx];
              if (!m) {
                return null;
              }
              return (
                <View key={idx} style={styles.monthRow}>
                  <Text style={[styles.monthName, { color: theme.subtext }]}>{month}</Text>
                  <View style={styles.monthBar}>
                    <View style={{ flexDirection: 'row', gap: 2, flex: 1, alignItems: 'center' }}>
                      <View
                        style={[
                          styles.barSegment,
                          { flex: m.income || 1, backgroundColor: '#22c55e', opacity: 0.7 },
                        ]}
                      />
                      <View
                        style={[
                          styles.barSegment,
                          { flex: m.expense || 1, backgroundColor: '#ef4444', opacity: 0.7 },
                        ]}
                      />
                    </View>
                    <Text style={[styles.monthAmount, { color: theme.muted }]}>
                      ₹{((m.income || 0) + (m.expense || 0)).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
            <View style={styles.achievementGrid}>
              <View style={styles.achievementItem}>
                <AntDesign name="flag" size={24} color="#14b8a6"  />
                <Text style={[styles.achievementValue, { color: theme.text }]}>
                  {summary.goalsCompleted}/{summary.goalsCreated}
                </Text>
                <Text style={[styles.achievementLabel, { color: theme.muted }]}>Goals</Text>
              </View>
              <View style={styles.achievementItem}>
                <AntDesign name="filetext1" size={24} color="#eab308"  />
                <Text style={[styles.achievementValue, { color: theme.text }]}>
                  {summary.billsPaid || 0}
                </Text>
                <Text style={[styles.achievementLabel, { color: theme.muted }]}>Bills Paid</Text>
              </View>
              <View style={styles.achievementItem}>
                <AntDesign name="like2" size={24} color="#f97316"  />
                <Text style={[styles.achievementValue, { color: theme.text }]}>
                  {summary.longestStreak || 0}d
                </Text>
                <Text style={[styles.achievementLabel, { color: theme.muted }]}>Best Streak</Text>
              </View>
              <View style={styles.achievementItem}>
                <AntDesign name="Trophy" size={24} color="#8b5cf6"  />
                <Text style={[styles.achievementValue, { color: theme.text }]}>
                  {summary.badgesEarned || 0}
                </Text>
                <Text style={[styles.achievementLabel, { color: theme.muted }]}>Badges</Text>
              </View>
            </View>
          </View>

          {summary.topCategory && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Top Spending Category
              </Text>
              <View style={styles.topCategoryRow}>
                <View style={[styles.categoryIcon, { backgroundColor: '#ef444420' }]}>
                  <AntDesign name="tag" size={20} color="#ef4444"  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryName, { color: theme.text }]}>
                    {summary.topCategory.category}
                  </Text>
                  <Text style={[styles.categoryAmount, { color: theme.muted }]}>
                    ₹{(summary.topCategory.amount || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.categoryPercent, { color: '#ef4444' }]}>
                  {summary.topCategory.percentage || 0}%
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Summary</Text>
            <Text style={[styles.summaryText, { color: theme.subtext }]}>
              {summary.goalsCompleted > 0
                ? `You completed ${summary.goalsCompleted} out of ${summary.goalsCreated} goals, paid ${summary.billsPaid} bills, and maintained a ${summary.longestStreak}-day best streak.`
                : `You paid ${summary.billsPaid} bills and maintained a ${summary.longestStreak}-day best streak this year.`}
            </Text>
            <Text style={[styles.summaryText, { color: theme.subtext, marginTop: 8 }]}>
              {summary.netSavings > 0
                ? `Great job saving ₹${summary.netSavings.toLocaleString()} this year!`
                : summary.netSavings < 0
                  ? `Your expenses exceeded income by ₹${Math.abs(summary.netSavings).toLocaleString()}.`
                  : `You broke even this year.`}
            </Text>
          </View>
        </>
      )}

      {!summary && !loading && (
        <View style={styles.centered}>
          <AntDesign name="calendar" size={64} color={theme.muted}  />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No data for {selectedYear}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 2, marginBottom: 16 },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  summaryCards: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  card: { marginHorizontal: 16, marginVertical: 8, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  monthName: { width: 32, fontSize: 12, fontWeight: '600' },
  monthBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barSegment: { height: 8, borderRadius: 4 },
  monthAmount: { fontSize: 11, width: 80, textAlign: 'right' },
  achievementGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  achievementItem: { alignItems: 'center', gap: 4 },
  achievementValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  achievementLabel: { fontSize: 11 },
  topCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: { fontSize: 16, fontWeight: '600' },
  categoryAmount: { fontSize: 13, marginTop: 2 },
  categoryPercent: { fontSize: 18, fontWeight: '700' },
  summaryText: { fontSize: 14, lineHeight: 22 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
