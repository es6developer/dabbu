import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import {
  AI_COLORS,
  HealthScoreCard,
  QuickActionBtn,
  SectionHeader,
  AnimatedProgressRing,
  AiCard,
  PulseView,
} from './components/AiShared';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.72;

const QUICK_ACTIONS = [
  { icon: 'add-circle' as const, label: 'Add Expense' },
  { icon: 'camera' as const, label: 'Scan Receipt' },
  { icon: 'swap-horizontal' as const, label: 'Split Expense' },
  { icon: 'sparkles' as const, label: 'Ask AI' },
  { icon: 'newspaper-outline' as const, label: 'Today Feed' },
];

interface DashboardData {
  healthScore: number;
  healthTrend: number;
  insights: { title: string; message: string; severity: string; confidence: number }[];
  alerts: { severity: string; message: string; amount: string }[];
  dnaScores: { label: string; value: number; color: string }[];
}

export function AiHomeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const scrollX = useRef(new Animated.Value(0)).current;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    setLoading(true);
    try {
      const [healthRes, dashRes, dnaRes, anomalyRes] = await Promise.allSettled([
        api.get<any>('/ai/health-score'),
        api.get<any>('/ai/dashboard'),
        api.get<any>('/ai/dna'),
        api.get<any>('/ai/anomalies'),
      ]);

      let hs = 0,
        ht = 0;
      if (healthRes.status === 'fulfilled') {
        const h = healthRes.value?.data ?? healthRes.value;
        if (h) {
          hs = h.overallScore ?? h.score ?? 0;
          ht = h.monthlyChange ?? h.trend ?? 0;
        }
      }

      let insights: DashboardData['insights'] = [];
      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value?.data ?? dashRes.value;
        const cards = (d?.cards ?? d?.widgets ?? Array.isArray(d)) ? d : null;
        if (Array.isArray(cards)) {
          insights = cards.map((c: any) => ({
            title: c.title ?? c.label ?? '',
            message: c.description ?? c.message ?? '',
            severity:
              c.priority && c.priority > 50
                ? 'warning'
                : c.priority && c.priority > 30
                  ? 'info'
                  : 'success',
            confidence: 0.85,
          }));
        }
      }

      let alerts: DashboardData['alerts'] = [];
      if (anomalyRes.status === 'fulfilled') {
        const list = anomalyRes.value?.data ?? anomalyRes.value;
        if (Array.isArray(list)) {
          alerts = list.map((a: any) => ({
            severity: a.severity ?? a.risk ?? 'info',
            message: a.message ?? a.description ?? '',
            amount: a.amount ? `₹${Number(a.amount).toLocaleString('en-IN')}` : '',
          }));
        }
      }

      let dnaScores: DashboardData['dnaScores'] = [
        { label: 'Saver', value: 0, color: AI_COLORS.success },
        { label: 'Impulse', value: 0, color: AI_COLORS.warning },
        { label: 'Luxury', value: 0, color: AI_COLORS.info },
        { label: 'Consistency', value: 0, color: AI_COLORS.purple },
      ];
      if (dnaRes.status === 'fulfilled') {
        const d = dnaRes.value?.data ?? dnaRes.value;
        if (d?.scores && Array.isArray(d.scores)) {
          dnaScores = d.scores.map((s: any) => ({
            label: s.label ?? s.name ?? '',
            value: s.value ?? s.score ?? 0,
            color: s.color ?? AI_COLORS.primary,
          }));
        } else if (d?.traits && Array.isArray(d.traits)) {
          dnaScores = d.traits.map((t: any) => ({
            label: t.label ?? t.name ?? '',
            value: t.value ?? t.score ?? 0,
            color: t.color ?? AI_COLORS.primary,
          }));
        }
      }

      setData({
        healthScore: hs,
        healthTrend: ht,
        insights: insights.slice(0, 6),
        alerts,
        dnaScores,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const navigateTo = useCallback(
    (screen: string) => {
      navigation.navigate(screen);
    },
    [navigation],
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton width="60%" height={24} borderRadius={8} />
          <Skeleton width="100%" height={100} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ReAnimated.View
          entering={FadeInUp.duration(400)}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <View>
            <Text style={s.greeting}>{greeting}, Karthik</Text>
            <Text style={s.date}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigateTo('AiNotifications')} style={s.bellWrap}>
            <Ionicons name="notifications" size={22} color={AI_COLORS.text} />
            <View style={s.bellDot} />
          </TouchableOpacity>
        </ReAnimated.View>

        {data && (
          <>
            <ReAnimated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 16 }}>
              <HealthScoreCard
                score={data.healthScore}
                trend={data.healthTrend}
                title="Dabbu AI"
                subtitle={
                  data.healthScore >= 80
                    ? 'Your finances are healthier than last week.'
                    : 'Focus on improving your financial health.'
                }
                onPress={() => navigateTo('AiFinancialDna')}
              />
            </ReAnimated.View>

            <ReAnimated.View entering={FadeInUp.duration(600)} style={s.qaSection}>
              {QUICK_ACTIONS.map((qa, i) => (
                <QuickActionBtn
                  key={i}
                  icon={qa.icon}
                  label={qa.label}
                  onPress={() => {
                    if (qa.label === 'Ask AI') {
                      navigateTo('AIDashboard');
                    } else if (qa.label === 'Scan Receipt') {
                      navigateTo('BillScanner');
                    } else if (qa.label === 'Today Feed') {
                      navigateTo('TodayFeed');
                    } else {
                      navigateTo('NewAddExpense');
                    }
                  }}
                />
              ))}
            </ReAnimated.View>

            {data.insights.length > 0 && (
              <>
                <SectionHeader
                  title="AI Insights"
                  subtitle="What Dabbu thinks"
                  action="See All"
                  onAction={() => navigateTo('AiInsights')}
                />
                <Animated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                  })}
                  snapToInterval={CARD_W + 12}
                  decelerationRate="fast"
                >
                  {data.insights.map((insight, i) => (
                    <ReAnimated.View
                      key={i}
                      entering={FadeInRight.duration(400).delay(i * 100)}
                      style={{ width: CARD_W }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigateTo('AiInsights')}
                      >
                        <AiCard padding={20} style={{ minHeight: 160 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              marginBottom: 12,
                            }}
                          >
                            <View
                              style={[
                                s.carouselIcon,
                                { backgroundColor: `${AI_COLORS.primary}20` },
                              ]}
                            >
                              <Ionicons name="bulb" size={20} color={AI_COLORS.primary} />
                            </View>
                            <Text style={s.carouselType}>{insight.severity.toUpperCase()}</Text>
                          </View>
                          <Text style={s.carouselTitle}>{insight.title}</Text>
                          <Text style={s.carouselMsg}>{insight.message}</Text>
                          <View style={s.carouselFooter}>
                            <Text style={s.carouselConf}>
                              {Math.round((insight.confidence || 0.8) * 100)}% confidence
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color={AI_COLORS.primary} />
                          </View>
                        </AiCard>
                      </TouchableOpacity>
                    </ReAnimated.View>
                  ))}
                </Animated.ScrollView>
              </>
            )}
          </>
        )}

        {!data && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Ionicons name="sparkles-outline" size={48} color={AI_COLORS.textTertiary} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
              No data yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: AI_COLORS.textSecondary,
                textAlign: 'center',
                paddingHorizontal: 32,
              }}
            >
              Insights will appear here once the AI service processes your data.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PulseView style={[s.aiFab, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity
          onPress={() => navigateTo('AIDashboard')}
          activeOpacity={0.8}
          style={s.aiFabBtn}
        >
          <Ionicons name="sparkles" size={24} color="#FFF" />
        </TouchableOpacity>
      </PulseView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 24, fontWeight: '700', color: AI_COLORS.text, letterSpacing: -0.3 },
  date: { fontSize: 13, color: AI_COLORS.textSecondary, marginTop: 2 },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AI_COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AI_COLORS.border,
  },
  bellDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AI_COLORS.danger,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  qaSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  carouselIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselType: {
    fontSize: 10,
    fontWeight: '700',
    color: AI_COLORS.textTertiary,
    letterSpacing: 1,
  },
  carouselTitle: { fontSize: 17, fontWeight: '700', color: AI_COLORS.text, letterSpacing: -0.2 },
  carouselMsg: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 6, lineHeight: 17 },
  carouselFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  carouselConf: { fontSize: 11, color: AI_COLORS.textTertiary },
  aiFab: { position: 'absolute', right: 20 },
  aiFabBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: AI_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: AI_COLORS.primaryGlow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
});
