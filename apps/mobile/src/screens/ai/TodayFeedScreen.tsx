import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useAiColors } from './components/AiShared';
import {
  generateFeedFromRealData,
  isGeneratedCard,
  FeedCard as GenFeedCard,
  FeedSummary as GenFeedSummary,
} from '../../services/aiFeedGenerator';

type FeedCard = GenFeedCard;
type FeedSummary = GenFeedSummary;

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  spending_insight: { icon: 'linechart', label: 'Spending' },
  anomaly_alert: { icon: 'star', label: 'Anomaly' },
  savings_opportunity: { icon: 'wallet', label: 'Savings' },
  budget_risk: { icon: 'wallet', label: 'Budget' },
  goal_update: { icon: 'flag', label: 'Goal' },
  couple_update: { icon: 'team', label: 'Couple' },
  family_update: { icon: 'home', label: 'Family' },
  settlement_optimization: { icon: 'swap', label: 'Group' },
  subscription_warning: { icon: 'creditcard', label: 'Subscription' },
  achievement: { icon: 'flag', label: 'Achievement' },
};

function priorityConfig(c: Record<string, string>) {
  return {
    critical: { color: c.danger, bg: c.dangerLight, icon: 'exclamationcircle' },
    high: { color: c.warning, bg: c.warningLight, icon: 'warning' },
    medium: { color: c.primary, bg: c.primaryLight, icon: 'infocirlceo' },
    low: { color: c.textSecondary, bg: 'transparent', icon: 'minuscircleo' },
  } as const;
}

function FeedCard({
  card,
  onPress,
  colors,
}: {
  card: FeedCard;
  onPress: () => void;
  colors: ReturnType<typeof useAiColors>;
}) {
  const pCfg = priorityConfig(colors);
  const pConfig = pCfg[card.priority as keyof typeof pCfg] ?? pCfg.low;
  const tConfig = TYPE_CONFIG[card.type] ?? { icon: 'bulb1', label: 'Insight' };
  const localCard = isGeneratedCard(card.id);
  const st = useMemo(() => styles(colors), [colors]);

  return (
    <ReAnimated.View entering={FadeInUp.duration(400)}>
      <TouchableOpacity
        style={[st.card, card.isRead && st.cardRead]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {localCard && (
          <View style={st.localBadge}>
            <AntDesign  name="star" size={10} color={colors.primary} />
            <Text style={st.localBadgeText}>From your data</Text>
          </View>
        )}
        <View style={st.cardHeader}>
          <View style={[st.typeBadge, { backgroundColor: pConfig.bg }]}>
            <AntDesign name={tConfig.icon as any} size={14} color={pConfig.color} />
            <Text style={[st.typeLabel, { color: pConfig.color }]}>{tConfig.label}</Text>
          </View>
          <View style={[st.priorityDot, { backgroundColor: pConfig.color }]} />
        </View>

        <Text style={st.cardTitle}>{card.title}</Text>
        <Text style={st.cardMessage}>{card.message}</Text>

        <View style={st.cardFooter}>
          {card.impactValue !== null && card.impactValue > 0 && (
            <View style={st.footerItem}>
              <AntDesign  name="tag" size={12} color={colors.textSecondary} />
              <Text style={st.footerText}>₹{card.impactValue.toLocaleString('en-IN')}</Text>
            </View>
          )}
          {card.confidenceScore !== null && (
            <View style={st.footerItem}>
              <AntDesign  name="linechart" size={12} color={colors.textSecondary} />
              <Text style={st.footerText}>{card.confidenceScore}% confidence</Text>
            </View>
          )}
          <Text style={st.timeText}>
            {new Date(card.createdAt).toLocaleDateString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    </ReAnimated.View>
  );
}

function SummaryBar({
  summary,
  colors,
}: {
  summary: FeedSummary | null;
  colors: ReturnType<typeof useAiColors>;
}) {
  const st = useMemo(() => styles(colors), [colors]);
  if (!summary) {
    return null;
  }

  return (
    <ReAnimated.View entering={FadeInUp.duration(500)} style={st.summaryBar}>
      <View style={st.summaryRow}>
        <View style={st.summaryItem}>
          <Text style={st.summaryValue}>{summary.totalInsightsToday}</Text>
          <Text style={st.summaryLabel}>Insights</Text>
        </View>
        <View style={st.summaryDivider} />
        <View style={st.summaryItem}>
          <Text style={[st.summaryValue, { color: colors.success }]}>
            ₹{(summary.savingsPotential || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={st.summaryLabel}>Savings</Text>
        </View>
        <View style={st.summaryDivider} />
        <View style={st.summaryItem}>
          <Text
            style={[
              st.summaryValue,
              { color: summary.riskAlerts > 0 ? colors.danger : colors.textSecondary },
            ]}
          >
            {summary.riskAlerts}
          </Text>
          <Text style={st.summaryLabel}>Alerts</Text>
        </View>
        <View style={st.summaryDivider} />
        <View style={st.summaryItem}>
          <Text style={st.summaryValue}>{summary.goalUpdates}</Text>
          <Text style={st.summaryLabel}>Goals</Text>
        </View>
      </View>
    </ReAnimated.View>
  );
}

export function TodayFeedScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const colors = useAiColors();
  const st = useMemo(() => styles(colors), [colors]);

  const [feed, setFeed] = useState<FeedCard[]>([]);
  const [summary, setSummary] = useState<FeedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  const fetchData = useCallback(async (accessTokenValue: string) => {
    try {
      const generated = await generateFeedFromRealData(accessTokenValue);
      setFeed(generated.feed);
      setSummary(generated.summary);
    } catch {
      setFeed([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadData = useCallback(
    (refresh = false) => {
      const token = accessToken || '';
      if (token) {
        setAccessToken(token);
      }
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setIsLocal(true);
      fetchData(token);
    },
    [accessToken, fetchData],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handlePress = useCallback(async (card: FeedCard) => {
    try {
      await api.patch(`/ai/feed/${card.id}/read`);
      setFeed((prev) => prev.map((c) => (c.id === card.id ? { ...c, isRead: true } : c)));
    } catch {
      /* ignore */
    }
  }, []);

  const handleDismiss = useCallback(async (cardId: string) => {
    try {
      await api.patch(`/ai/feed/${cardId}/dismiss`);
      setFeed((prev) => prev.filter((c) => c.id !== cardId));
    } catch {
      /* ignore */
    }
  }, []);

  const emptyState = !loading && feed.length === 0;

  return (
    <View style={[st.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[
          st.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ReAnimated.View entering={FadeInUp.duration(400)} style={st.header}>
          <Text style={st.headerTitle}>Today Feed</Text>
          <Text style={st.headerSubtitle}>
            {isLocal ? 'Insights from your spending patterns' : 'AI knows your money'}
          </Text>
        </ReAnimated.View>

        <SummaryBar summary={summary} colors={colors} />

        {loading && !refreshing ? (
          <View style={st.skeletonContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={st.skeletonCard}>
                <Skeleton width={80} height={20} style={{ borderRadius: 10, marginBottom: 12 }} />
                <Skeleton width="100%" height={18} style={{ borderRadius: 6, marginBottom: 8 }} />
                <Skeleton width="90%" height={14} style={{ borderRadius: 6, marginBottom: 4 }} />
                <Skeleton width="60%" height={14} style={{ borderRadius: 6 }} />
              </View>
            ))}
          </View>
        ) : emptyState ? (
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <AntDesign  name="star" size={48} color={colors.textTertiary} />
            </View>
            <Text style={st.emptyTitle}>No insights yet</Text>
            <Text style={st.emptyText}>
              AI needs more data to generate insights. Add transactions and budgets to get started.
            </Text>
          </View>
        ) : (
          <View style={st.feedList}>
            {feed.map((card) => (
              <View key={card.id}>
                <FeedCard card={card} onPress={() => handlePress(card)} colors={colors} />
                {!card.isRead && (
                  <TouchableOpacity style={st.dismissBtn} onPress={() => handleDismiss(card.id)}>
                    <AntDesign  name="close" size={16} color={colors.textTertiary} />
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

const styles = (c: ReturnType<typeof useAiColors>) =>
  StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16 },
    header: { marginBottom: 20 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: c.text },
    headerSubtitle: { fontSize: 14, color: c.textSecondary, marginTop: 4 },

    summaryBar: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 20,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 32, backgroundColor: c.border },
    summaryValue: { fontSize: 20, fontWeight: '700', color: c.text },
    summaryLabel: { fontSize: 11, color: c.textTertiary, marginTop: 4 },

    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 12,
    },
    cardRead: { opacity: 0.6 },
    feedList: { marginTop: 4 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    typeLabel: { fontSize: 11, fontWeight: '600' },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 6, lineHeight: 20 },
    cardMessage: { fontSize: 13, color: c.textSecondary, lineHeight: 18, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { fontSize: 11, color: c.textSecondary },
    timeText: { fontSize: 11, color: c.textTertiary, marginLeft: 'auto' },

    dismissBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    skeletonContainer: { gap: 12, marginTop: 8 },
    skeletonCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },

    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.text, marginBottom: 8 },
    emptyText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 20,
    },

    localBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
      alignSelf: 'flex-start',
      backgroundColor: c.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    localBadgeText: { fontSize: 10, fontWeight: '600', color: c.primary },
  });
