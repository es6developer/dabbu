import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { spacing } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useAiColors, AiCard, SectionHeader, PremiumBadge } from './components/AiShared';

const SECTIONS = [
  { key: 'predictions', label: 'Predictions', icon: 'linechart' as const },
  { key: 'anomalies', label: 'Anomalies', icon: 'warning' as const },
  { key: 'savings', label: 'Savings', icon: 'wallet' as const },
  { key: 'recommendations', label: 'Recommendations', icon: 'bulb1' as const },
];

interface InsightItem {
  title: string;
  message: string;
  severity: string;
  confidence?: number;
  icon?: string;
}

export function AiInsightsScreen() {
  const AI_COLORS = useAiColors();
  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1 },
        header: { paddingHorizontal: 20, paddingBottom: 8, gap: 6 },
        headerTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: AI_COLORS.text,
          letterSpacing: -0.5,
        },
        headerSub: { fontSize: 13, color: AI_COLORS.textSecondary, marginTop: 2 },
        sectionTab: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 14,
          borderWidth: 1,
        },
        sectionTabLabel: { fontSize: 13, fontWeight: '600' },
        insightCard: {
          padding: 14,
          borderRadius: 14,
          marginBottom: 6,
          borderLeftWidth: 3,
          borderWidth: 1,
        },
        insightIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
        },
        badge: {
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 8,
        },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [activeSection, setActiveSection] = useState('predictions');
  const [items, setItems] = useState<InsightItem[]>([]);
  const [narrative, setNarrative] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (section: string) => {
    try {
      const sectionMap: Record<string, string> = {
        predictions: 'dashboard',
        anomalies: 'transactions',
        savings: 'budgets',
        recommendations: 'goals',
      };
      const [insightsRes, narrativeRes] = await Promise.allSettled([
        api.get<any>(`/ai/insights?section=${sectionMap[section] ?? 'dashboard'}`),
        api.post<any>('/ai/narrative', {
          section: sectionMap[section] ?? 'dashboard',
          context: {},
        }),
      ]);

      if (insightsRes.status === 'fulfilled') {
        const list = insightsRes.value?.data ?? insightsRes.value;
        if (Array.isArray(list)) {
          setItems(
            list.map((i: any) => ({
              title: i.title ?? '',
              message: i.message ?? '',
              severity: i.severity ?? 'info',
              confidence: i.confidence ?? undefined,
              icon: i.icon ?? 'bulb1',
            })),
          );
        } else {
          setItems([]);
        }
      }
      if (narrativeRes.status === 'fulfilled') {
        setNarrative(narrativeRes.value?.data ?? null);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadData = useCallback(
    (section: string, refresh = false) => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      fetchData(section);
    },
    [accessToken, fetchData],
  );

  useFocusEffect(
    useCallback(() => {
      loadData(activeSection);
    }, [loadData, activeSection]),
  );

  const severityColor = (sev: string) =>
    sev === 'critical'
      ? AI_COLORS.danger
      : sev === 'warning'
        ? AI_COLORS.warning
        : sev === 'success'
          ? AI_COLORS.success
          : AI_COLORS.info;

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(activeSection, true)}
            tintColor={AI_COLORS.primary}
          />
        }
      >
        <ReAnimated.View
          entering={FadeInUp.duration(400)}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={s.headerTitle}>AI Insights</Text>
              <Text style={s.headerSub}>Smart analysis across all areas</Text>
            </View>
            <PremiumBadge />
          </View>
        </ReAnimated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: spacing.lg, paddingVertical: 12 }}
        >
          {SECTIONS.map((sec) => (
            <TouchableOpacity
              key={sec.key}
              style={[
                s.sectionTab,
                {
                  backgroundColor: activeSection === sec.key ? AI_COLORS.primary : AI_COLORS.card,
                  borderColor: activeSection === sec.key ? AI_COLORS.primary : AI_COLORS.border,
                },
              ]}
              onPress={() => {
                setActiveSection(sec.key);
                loadData(sec.key);
              }}
              activeOpacity={0.7}
            >
              <AntDesign
                name={sec.icon as any}
                size={16}
                color={activeSection === sec.key ? '#FFF' : AI_COLORS.textSecondary}
              />
              <Text
                style={[
                  s.sectionTabLabel,
                  { color: activeSection === sec.key ? '#FFF' : AI_COLORS.textSecondary },
                ]}
              >
                {sec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton width="100%" height={120} borderRadius={16} />
            <Skeleton width="100%" height={80} borderRadius={12} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </View>
        ) : (
          <>
            {narrative?.summary && (
              <ReAnimated.View
                entering={FadeInUp.duration(500)}
                style={{ paddingHorizontal: 16, marginBottom: 8 }}
              >
                <AiCard padding={16}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                  >
                    <AntDesign  name="star" size={16} color={AI_COLORS.primary} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: AI_COLORS.text }}>
                      AI Analysis
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary, lineHeight: 19 }}>
                    {narrative.summary}
                  </Text>
                  {narrative.highlights?.length > 0 && (
                    <View style={{ marginTop: 12, gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: AI_COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        Highlights
                      </Text>
                      {narrative.highlights.map((h: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                          <Text style={{ color: AI_COLORS.success }}>◆</Text>
                          <Text style={{ fontSize: 12, color: AI_COLORS.textTertiary, flex: 1 }}>
                            {h}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </AiCard>
              </ReAnimated.View>
            )}

            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {items.map((item, i) => {
                const clr = severityColor(item.severity);
                return (
                  <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 50)}>
                    <TouchableOpacity activeOpacity={0.8}>
                      <View
                        style={[
                          s.insightCard,
                          {
                            backgroundColor: AI_COLORS.card,
                            borderLeftColor: clr,
                            borderColor: AI_COLORS.border,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={[s.insightIcon, { backgroundColor: `${clr}20` }]}>
                            <AntDesign
                              name={(item.icon as any) || 'bulb1'}
                              size={18}
                              color={clr}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontSize: 14, fontWeight: '700', color: AI_COLORS.text }}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: AI_COLORS.textSecondary,
                                marginTop: 2,
                                lineHeight: 17,
                              }}
                            >
                              {item.message}
                            </Text>
                            {item.confidence !== undefined && (
                              <View
                                style={[s.badge, { backgroundColor: `${clr}20`, marginTop: 6 }]}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '600', color: clr }}>
                                  {(item.confidence * 100).toFixed(0)}% confidence
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </ReAnimated.View>
                );
              })}
            </View>

            {!loading && items.length === 0 && !narrative && (
              <View
                style={{ alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 }}
              >
                <AntDesign  name="star" size={48} color={AI_COLORS.textTertiary} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
                  No insights yet
                </Text>
                <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary, textAlign: 'center' }}>
                  AI insights will appear here after analysis.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
