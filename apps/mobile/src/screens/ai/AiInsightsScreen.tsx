import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'transactions', label: 'Transactions', icon: 'cash' },
  { key: 'shared_finance', label: 'Shared Finance', icon: 'people' },
  { key: 'goals', label: 'Goals', icon: 'trophy' },
  { key: 'budgets', label: 'Budgets', icon: 'wallet' },
];

export function AiInsightsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [insights, setInsights] = useState<any[]>([]);
  const [narrative, setNarrative] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInsights = useCallback(
    async (section: string, refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [insightsRes, narrativeRes] = await Promise.allSettled([
          api.get<any>(`/accounts/ai-insights?section=${section}`),
          api.post<any>('/ai/narrative', { section, context: { section } }),
        ]);

        if (insightsRes.status === 'fulfilled') {
          setInsights(insightsRes.value?.data || []);
        }
        if (narrativeRes.status === 'fulfilled') {
          setNarrative(narrativeRes.value?.data || null);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadInsights(activeSection);
    }, [loadInsights, activeSection]),
  );

  const severityColor = (sev: string) =>
    sev === 'critical'
      ? '#FF6B6B'
      : sev === 'warning'
        ? '#FDCB6E'
        : sev === 'success'
          ? '#00B894'
          : '#74B9FF';

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={['#8B5CF6', '#6D28D9']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>AI Insights</Text>
            <Text style={s.headerSub}>Smart analysis across all sections</Text>
          </View>
          <View style={s.headerBadge}>
            <Ionicons name="sparkles" size={14} color="#FFF" />
            <Text style={s.headerBadgeText}>BETA</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.sectionTabs}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {SECTIONS.map((sec) => (
          <TouchableOpacity
            key={sec.key}
            style={[
              s.sectionTab,
              {
                backgroundColor: activeSection === sec.key ? '#8B5CF6' : colors.bg.secondary,
              },
            ]}
            onPress={() => {
              setActiveSection(sec.key);
              loadInsights(sec.key);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sec.icon as any}
              size={14}
              color={activeSection === sec.key ? '#FFF' : colors.text.tertiary}
            />
            <Text
              style={[
                s.sectionTabLabel,
                { color: activeSection === sec.key ? '#FFF' : colors.text.tertiary },
              ]}
            >
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadInsights(activeSection, true)}
            tintColor="#8B5CF6"
          />
        }
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="100%" height={120} borderRadius={16} />
            <Skeleton width="100%" height={80} borderRadius={12} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </View>
        ) : (
          <>
            {narrative?.summary && (
              <View style={[s.narrativeCard, { backgroundColor: colors.bg.secondary }]}>
                <View style={s.narrativeHeader}>
                  <Ionicons name="sparkles" size={18} color="#8B5CF6" />
                  <Text style={[s.narrativeTitle, { color: colors.text.primary }]}>
                    AI Analysis
                  </Text>
                </View>
                <Text style={[s.narrativeText, { color: colors.text.secondary }]}>
                  {narrative.summary}
                </Text>
                {narrative.highlights?.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[s.narrativeSub, { color: colors.text.primary }]}>Highlights</Text>
                    {narrative.highlights.map((h: string, i: number) => (
                      <View key={i} style={s.bulletRow}>
                        <Text style={[s.bullet, { color: '#00B894' }]}>◆</Text>
                        <Text style={[s.bulletText, { color: colors.text.tertiary }]}>{h}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {narrative.recommendations?.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[s.narrativeSub, { color: colors.text.primary }]}>
                      Recommendations
                    </Text>
                    {narrative.recommendations.map((r: string, i: number) => (
                      <View key={i} style={s.bulletRow}>
                        <Text style={[s.bullet, { color: '#8B5CF6' }]}>▶</Text>
                        <Text style={[s.bulletText, { color: colors.text.tertiary }]}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {narrative.riskFlags?.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[s.narrativeSub, { color: colors.text.primary }]}>Risk Flags</Text>
                    {narrative.riskFlags.map((f: string, i: number) => (
                      <View key={i} style={s.bulletRow}>
                        <Text style={[s.bullet, { color: '#FF6B6B' }]}>⚠</Text>
                        <Text style={[s.bulletText, { color: colors.text.tertiary }]}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {insights.map((insight: any, i: number) => {
              const sevColor = severityColor(insight.severity);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.insightCard,
                    { backgroundColor: colors.bg.secondary, borderLeftColor: sevColor },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={s.insightRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.insightTitle, { color: colors.text.primary }]}>
                        {insight.title}
                      </Text>
                      <Text style={[s.insightMsg, { color: colors.text.tertiary }]}>
                        {insight.message}
                      </Text>
                    </View>
                    {insight.source === 'ai' && (
                      <View style={[s.aiBadge, { backgroundColor: '#8B5CF618' }]}>
                        <Ionicons name="sparkles" size={10} color="#8B5CF6" />
                        <Text style={s.aiBadgeText}>AI</Text>
                      </View>
                    )}
                  </View>
                  <View style={[s.sevTag, { backgroundColor: `${sevColor}18` }]}>
                    <Text style={[s.sevText, { color: sevColor }]}>{insight.severity}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {insights.length === 0 && !narrative && (
              <View style={s.emptyState}>
                <Ionicons name="sparkles-outline" size={48} color={colors.text.tertiary} />
                <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No insights yet</Text>
                <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                  AI insights will appear here once the AI service is configured and enabled.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  sectionTabs: { paddingVertical: 12, maxHeight: 56 },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sectionTabLabel: { fontSize: 13, fontWeight: '600' },

  narrativeCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  narrativeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  narrativeTitle: { fontSize: 16, fontWeight: '700' },
  narrativeText: { fontSize: 13, lineHeight: 20 },
  narrativeSub: { fontSize: 13, fontWeight: '700', marginBottom: 6 },

  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'flex-start' },
  bullet: { fontSize: 12, marginTop: 2 },
  bulletText: { fontSize: 12, lineHeight: 18, flex: 1 },

  insightCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightMsg: { fontSize: 12, marginTop: 2, lineHeight: 17 },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiBadgeText: { fontSize: 9, fontWeight: '700', color: '#8B5CF6', letterSpacing: 0.5 },

  sevTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  sevText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
