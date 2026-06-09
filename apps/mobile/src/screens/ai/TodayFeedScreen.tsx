import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { AI_COLORS, SectionHeader } from './components/AiShared';

interface FeedCard {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  impactValue: number | null;
  confidenceScore: number | null;
  category: string;
  actionType: string | null;
  actionPayload: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

interface FeedSummary {
  totalInsightsToday: number;
  savingsPotential: number;
  riskAlerts: number;
  goalUpdates: number;
  topPriority: string | null;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  critical: { color: AI_COLORS.danger, bg: AI_COLORS.dangerLight, icon: 'alert-circle' },
  high: { color: AI_COLORS.warning, bg: AI_COLORS.warningLight, icon: 'warning' },
  medium: { color: AI_COLORS.primary, bg: AI_COLORS.primaryLight, icon: 'information-circle' },
  low: { color: AI_COLORS.textSecondary, bg: 'transparent', icon: 'ellipse-outline' },
};

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  spending_insight: { icon: 'trending-up', label: 'Spending' },
  anomaly_alert: { icon: 'flash', label: 'Anomaly' },
  savings_opportunity: { icon: 'cash', label: 'Savings' },
  budget_risk: { icon: 'wallet', label: 'Budget' },
  goal_update: { icon: 'flag', label: 'Goal' },
  couple_update: { icon: 'people', label: 'Couple' },
  family_update: { icon: 'home', label: 'Family' },
  settlement_optimization: { icon: 'swap-horizontal', label: 'Group' },
  subscription_warning: { icon: 'card', label: 'Subscription' },
  achievement: { icon: 'trophy', label: 'Achievement' },
};

function FeedCard({ card, onPress }: { card: FeedCard; onPress: () => void }) {
  const pConfig = PRIORITY_CONFIG[card.priority] ?? PRIORITY_CONFIG.low;
  const tConfig = TYPE_CONFIG[card.type] ?? { icon: 'bulb-outline', label: 'Insight' };

  return (
    <ReAnimated.View entering={FadeInUp.duration(400)}>
      <TouchableOpacity
        style={[s.card, card.isRead && s.cardRead]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={s.cardHeader}>
          <View style={[s.typeBadge, { backgroundColor: pConfig.bg }]}>
            <Ionicons name={tConfig.icon as any} size={14} color={pConfig.color} />
            <Text style={[s.typeLabel, { color: pConfig.color }]}>{tConfig.label}</Text>
          </View>
          <View style={[s.priorityDot, { backgroundColor: pConfig.color }]} />
        </View>

        <Text style={s.cardTitle}>{card.title}</Text>
        <Text style={s.cardMessage}>{card.message}</Text>

        <View style={s.cardFooter}>
          {card.impactValue != null && card.impactValue > 0 && (
            <View style={s.footerItem}>
              <Ionicons name="pricetag-outline" size={12} color={AI_COLORS.textSecondary} />
              <Text style={s.footerText}>₹{card.impactValue.toLocaleString('en-IN')}</Text>
            </View>
          )}
          {card.confidenceScore != null && (
            <View style={s.footerItem}>
              <Ionicons name="analytics-outline" size={12} color={AI_COLORS.textSecondary} />
              <Text style={s.footerText}>{card.confidenceScore}% confidence</Text>
            </View>
          )}
          <Text style={s.timeText}>
            {new Date(card.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    </ReAnimated.View>
  );
}

function SummaryBar({ summary }: { summary: FeedSummary | null }) {
  if (!summary) return null;

  return (
    <ReAnimated.View entering={FadeInUp.duration(500)} style={s.summaryBar}>
      <View style={s.summaryRow}>
        <View style={s.summaryItem}>
          <Text style={s.summaryValue}>{summary.totalInsightsToday}</Text>
          <Text style={s.summaryLabel}>Insights</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryValue, { color: AI_COLORS.success }]}>
            ₹{(summary.savingsPotential || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={s.summaryLabel}>Savings</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryValue, { color: summary.riskAlerts > 0 ? AI_COLORS.danger : AI_COLORS.textSecondary }]}>
            {summary.riskAlerts}
          </Text>
          <Text style={s.summaryLabel}>Alerts</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryValue}>{summary.goalUpdates}</Text>
          <Text style={s.summaryLabel}>Goals</Text>
        </View>
      </View>
    </ReAnimated.View>
  );
}

export function TodayFeedScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [feed, setFeed] = useState<FeedCard[]>([]);
  const [summary, setSummary] = useState<FeedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (accessToken) setAccessToken(accessToken);
    if (refresh) setRefreshing(true); else setLoading(true);

    try {
      const [feedRes, summaryRes] = await Promise.allSettled([
        api.get<any>('/ai/today-feed'),
        api.get<any>('/ai/feed-summary'),
      ]);

      if (feedRes.status === 'fulfilled') {
        const f = feedRes.value?.feed ?? feedRes.value?.data?.feed ?? [];
        if (Array.isArray(f)) {
          setFeed(f.map((c: any) => ({
            id: c.id,
            type: c.type ?? 'spending_insight',
            priority: c.priority ?? 'medium',
            title: c.title ?? '',
            message: c.message ?? '',
            impactValue: c.impactValue ?? null,
            confidenceScore: c.confidenceScore ?? null,
            category: c.category ?? 'spending',
            actionType: c.actionType ?? null,
            actionPayload: c.actionPayload ?? null,
            isRead: c.isRead ?? false,
            createdAt: c.createdAt ?? new Date().toISOString(),
          })));
        }
      }

      if (summaryRes.status === 'fulfilled') {
        const s = summaryRes.value?.data ?? summaryRes.value;
        if (s && typeof s.totalInsightsToday === 'number') {
          setSummary(s);
        }
      }
    } catch {
      setFeed([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handlePress = useCallback(async (card: FeedCard) => {
    try {
      await api.patch(`/ai/feed/${card.id}/read`);
      setFeed(prev => prev.map(c => c.id === card.id ? { ...c, isRead: true } : c));
    } catch {}
  }, []);

  const handleDismiss = useCallback(async (cardId: string) => {
    try {
      await api.patch(`/ai/feed/${cardId}/dismiss`);
      setFeed(prev => prev.filter(c => c.id !== cardId));
    } catch {}
  }, []);

  const emptyState = !loading && feed.length === 0;

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={AI_COLORS.primary}
            colors={[AI_COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ReAnimated.View entering={FadeInUp.duration(400)} style={s.header}>
          <Text style={s.headerTitle}>Today Feed</Text>
          <Text style={s.headerSubtitle}>AI knows your money</Text>
        </ReAnimated.View>

        <SummaryBar summary={summary} />

        {loading && !refreshing ? (
          <View style={s.skeletonContainer}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={s.skeletonCard}>
                <Skeleton width={80} height={20} style={{ borderRadius: 10, marginBottom: 12 }} />
                <Skeleton width="100%" height={18} style={{ borderRadius: 6, marginBottom: 8 }} />
                <Skeleton width="90%" height={14} style={{ borderRadius: 6, marginBottom: 4 }} />
                <Skeleton width="60%" height={14} style={{ borderRadius: 6 }} />
              </View>
            ))}
          </View>
        ) : emptyState ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="sparkles-outline" size={48} color={AI_COLORS.textTertiary} />
            </View>
            <Text style={s.emptyTitle}>No insights yet</Text>
            <Text style={s.emptyText}>
              AI needs more data to generate insights. Add transactions and budgets to get started.
            </Text>
          </View>
        ) : (
          <View style={s.feedList}>
            {feed.map(card => (
              <View key={card.id}>
                <FeedCard card={card} onPress={() => handlePress(card)} />
                {!card.isRead && (
                  <TouchableOpacity
                    style={s.dismissBtn}
                    onPress={() => handleDismiss(card.id)}
                  >
                    <Ionicons name="close-outline" size={16} color={AI_COLORS.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: AI_COLORS.text },
  headerSubtitle: { fontSize: 14, color: AI_COLORS.textSecondary, marginTop: 4 },

  summaryBar: {
    backgroundColor: AI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AI_COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 32, backgroundColor: AI_COLORS.border },
  summaryValue: { fontSize: 20, fontWeight: '700', color: AI_COLORS.text },
  summaryLabel: { fontSize: 11, color: AI_COLORS.textTertiary, marginTop: 4 },

  card: {
    backgroundColor: AI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AI_COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardRead: { opacity: 0.6 },
  feedList: { marginTop: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeLabel: { fontSize: 11, fontWeight: '600' },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: AI_COLORS.text, marginBottom: 6, lineHeight: 20 },
  cardMessage: { fontSize: 13, color: AI_COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: AI_COLORS.textSecondary },
  timeText: { fontSize: 11, color: AI_COLORS.textTertiary, marginLeft: 'auto' },

  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AI_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skeletonContainer: { gap: 12, marginTop: 8 },
  skeletonCard: {
    backgroundColor: AI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AI_COLORS.border,
    padding: 16,
  },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: AI_COLORS.card, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: AI_COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: AI_COLORS.textSecondary, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
