import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius } from '../../theme/design';

const STREAK_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  daily: { icon: 'like2', color: '#f97316', label: 'Daily Tracking' },
  weekly: { icon: 'calendar', color: '#6366f1', label: 'Weekly Activity' },
  monthly: { icon: 'caretup', color: '#22c55e', label: 'Monthly Consistency' },
  financial: { icon: 'wallet', color: '#8b5cf6', label: 'Financial Activity' },
  savings: { icon: 'wallet', color: '#ec4899', label: 'Savings Streak' },
  goal_progress: { icon: 'flag', color: '#14b8a6', label: 'Goal Progress' },
  bill_payment: { icon: 'filetext1', color: '#eab308', label: 'Bill Payment' },
};

function getStreakEmoji(count: number): string {
  if (count >= 365) return '👑';
  if (count >= 100) return '🏆';
  if (count >= 30) return '🔥';
  if (count >= 7) return '⭐';
  if (count >= 1) return '🌱';
  return '⏳';
}

function getStreakLevel(count: number): string {
  if (count >= 365) return 'Legend';
  if (count >= 100) return 'Champion';
  if (count >= 50) return 'Pro';
  if (count >= 30) return 'Dedicated';
  if (count >= 14) return 'Committed';
  if (count >= 7) return 'Consistent';
  if (count >= 3) return 'Getting Started';
  return 'New';
}

export function StreaksScreen() {
  const { colors: c } = useTheme();
  const theme = { background: c.bg.primary, text: c.text.primary, card: c.bg.card, subtext: c.text.secondary, muted: c.text.tertiary, primary: c.accent.primary, border: c.border.subtle };
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [streaks, setStreaks] = useState<any[]>([]);
  const [yearlySummary, setYearlySummary] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false, refresh = false) => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 15000);
    try {
      if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
      const [streaksRes, engRes] = await Promise.all([
        api.get<any>('/retention/streaks'),
        api.get<any>('/retention/engagement'),
      ]);
      clearTimeout(timeoutId);
      setStreaks(Array.isArray(streaksRes) ? streaksRes : []);
      setEngagement(engRes || null);

      const currentYear = new Date().getFullYear();
      try {
        const yrRes: any = await api.get(`/retention/yearly-summary/${currentYear}`);
        setYearlySummary(yrRes || null);
      } catch {
        setYearlySummary(null);
      }
    } catch {
      clearTimeout(timeoutId);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { fetchData(!isInitial); }, [fetchData]));
  useEffect(() => { fetchData(); }, []);

  const sortedStreaks = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak);

  if (loading) {
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(false, true)} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Your Streaks</Text>
      </View>

      <View style={styles.streakGrid}>
        {sortedStreaks.map((s: any) => {
          const meta = STREAK_ICONS[s.streakType] || { icon: 'star', color: '#6366f1', label: s.streakType };
          return (
            <View key={s.id} style={[styles.streakCard, { backgroundColor: theme.card }]}>
              <View style={[styles.streakIconWrap, { backgroundColor: meta.color + '20' }]}>
                <Text style={{ fontSize: 28 }}>{getStreakEmoji(s.currentStreak)}</Text>
              </View>
              <Text style={[styles.streakCount, { color: meta.color }]}>{s.currentStreak}</Text>
              <Text style={[styles.streakLabel, { color: theme.subtext }]}>{meta.label}</Text>
              <Text style={[styles.streakLevel, { color: theme.muted }]}>{getStreakLevel(s.currentStreak)}</Text>
              <Text style={[styles.streakBest, { color: theme.muted }]}>Best: {s.longestStreak}</Text>
            </View>
          );
        })}
      </View>

      {engagement && (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Engagement Status</Text>
          <View style={styles.engagementRow}>
            <Text style={[styles.engagementLabel, { color: theme.subtext }]}>Status:</Text>
            <View style={[styles.statusBadge, {
              backgroundColor: engagement.reEngagementStage === 'active' ? '#22c55e20' : '#f9731620',
            }]}>
              <Text style={[styles.statusText, {
                color: engagement.reEngagementStage === 'active' ? '#22c55e' : '#f97316',
              }]}>{engagement.reEngagementStage.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          {engagement.lastActionAt && (
            <Text style={[styles.engagementLabel, { color: theme.muted }]}>
              Last activity: {new Date(engagement.lastActionAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {yearlySummary && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.card }]}
          onPress={() => (navigation as any).navigate('YearlySummary')}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Year in Review {yearlySummary.year}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#22c55e' }]}>₹{(yearlySummary.totalIncome || 0).toLocaleString()}</Text>
              <Text style={[styles.summaryLabel, { color: theme.muted }]}>Income</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>₹{(yearlySummary.totalExpense || 0).toLocaleString()}</Text>
              <Text style={[styles.summaryLabel, { color: theme.muted }]}>Expenses</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#6366f1' }]}>₹{(yearlySummary.netSavings || 0).toLocaleString()}</Text>
              <Text style={[styles.summaryLabel, { color: theme.muted }]}>Net Savings</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <Text style={[styles.summaryStat, { color: theme.subtext }]}>Goals: {yearlySummary.goalsCompleted}/{yearlySummary.goalsCreated}</Text>
            <Text style={[styles.summaryStat, { color: theme.subtext }]}>Bills paid: {yearlySummary.billsPaid}</Text>
            <Text style={[styles.summaryStat, { color: theme.subtext }]}>Best streak: {yearlySummary.longestStreak} days</Text>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border, marginTop: 14, paddingTop: 14 }}>
            <Text style={[styles.viewFull, { color: theme.primary }]}>View full yearly report →</Text>
          </View>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  streakGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, gap: 8 },
  streakCard: { width: '47%', borderRadius: 30, padding: 22, marginBottom: 8, marginHorizontal: 4, alignItems: 'center' },
  streakIconWrap: { width: 48, height: 52, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  streakCount: { fontSize: 36, fontWeight: '800' },
  streakLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  streakLevel: { fontSize: 12, marginTop: 2 },
  streakBest: { fontSize: 10, marginTop: 4 },
  card: { marginHorizontal: 20, marginVertical: 8, borderRadius: 30, padding: 24 },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginBottom: 14 },
  engagementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  engagementLabel: { fontSize: 16, marginRight: 8 },
  statusBadge: { paddingHorizontal: 18, paddingVertical: 4, borderRadius: 28 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 19, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  summaryStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryStat: { fontSize: 16 },
  viewFull: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
});
