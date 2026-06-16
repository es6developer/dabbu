import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import {
  useAiColors,
  AnimatedProgressRing,
  AiCard,
  SectionHeader,
  HealthScoreCard,
  PremiumBadge,
} from './components/AiShared';

interface ReviewData {
  period: string;
  summary: string;
  income: { total: number; sources: { name: string; amount: number }[]; vsLastMonth: number };
  expenses: {
    total: number;
    byCategory: { category: string; amount: number; percentage: number }[];
    vsLastMonth: number;
  };
  savings: { total: number; rate: number; vsLastMonth: number };
  budgets: {
    onTrack: number;
    exceeded: number;
    total: number;
    details: { name: string; status: string; spent: number; budget: number }[];
  };
  goals: { progress: { name: string; progress: number; status: string }[]; highlight: string };
  bills: {
    paid: number;
    pending: number;
    upcoming: { name: string; amount: number; dueDate: string }[];
  };
  healthScore: { current: number; change: number; level: string };
  insights: string[];
  recommendations: string[];
  achievements: string[];
  nextMonthFocus: string;
}

export function MonthlyAiReviewScreen() {
  const AI_COLORS = useAiColors();
  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1 },
        header: { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
        headerBadge: {
          fontSize: 12,
          fontWeight: '800',
          color: AI_COLORS.primary,
          letterSpacing: 1,
        },
        headerTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: AI_COLORS.text,
          letterSpacing: -0.5,
        },
        headerSub: { fontSize: 13, color: AI_COLORS.textSecondary },
        heroCard: {
          backgroundColor: AI_COLORS.card,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: AI_COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        heroLabel: {
          fontSize: 11,
          fontWeight: '800',
          color: AI_COLORS.primary,
          letterSpacing: 1.5,
          marginBottom: 6,
        },
        heroTitle: { fontSize: 22, fontWeight: '700', color: AI_COLORS.text, letterSpacing: -0.3 },
        heroDesc: { fontSize: 13, color: AI_COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
        heroStat: { alignItems: 'center', flex: 1 },
        heroStatVal: { fontSize: 15, fontWeight: '700', color: AI_COLORS.text },
        heroStatLabel: { fontSize: 10, color: AI_COLORS.textTertiary, marginTop: 2 },
        heroScore: { fontSize: 22, fontWeight: '800' },
        shareBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: AI_COLORS.primary,
          borderRadius: 16,
          paddingVertical: 14,
        },
        shareBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/monthly-review');
      const d = res?.data ?? res;
      setData(d ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    setLoading(true);
    fetchData();
  }, [accessToken, fetchData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton width="40%" height={20} borderRadius={8} />
          <Skeleton width="100%" height={140} borderRadius={24} />
          <Skeleton width="100%" height={80} borderRadius={14} />
          <Skeleton width="100%" height={80} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <Ionicons name="document-text-outline" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No review available
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            Your monthly review will be generated at the end of the month.
          </Text>
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
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View>
              <Text style={s.headerBadge}>Monthly AI Review</Text>
              <Text style={s.headerTitle}>{data.period}</Text>
              <Text style={s.headerSub}>Premium Financial Report</Text>
            </View>
            <PremiumBadge premium />
          </View>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 16 }}>
          <View style={s.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroLabel}>YOUR MONTH</Text>
              <Text style={s.heroTitle}>
                You saved ₹{(data.savings?.total ?? 0).toLocaleString('en-IN')} this month
              </Text>
              <Text style={s.heroDesc}>{data.summary}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>
                    ₹{(data.income?.total ?? 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={s.heroStatLabel}>Income</Text>
                </View>
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>
                    ₹{(data.expenses?.total ?? 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={s.heroStatLabel}>Spent</Text>
                </View>
                <View style={s.heroStat}>
                  <Text style={[s.heroStatVal, { color: AI_COLORS.success }]}>
                    ₹{(data.savings?.total ?? 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={s.heroStatLabel}>Saved</Text>
                </View>
              </View>
            </View>
            <AnimatedProgressRing
              size={80}
              strokeWidth={6}
              progress={data.healthScore?.current ?? 0}
              color={AI_COLORS.success}
            >
              <Text style={[s.heroScore, { color: AI_COLORS.success }]}>
                {data.healthScore?.current ?? 0}
              </Text>
            </AnimatedProgressRing>
          </View>
        </ReAnimated.View>

        {data.achievements?.length > 0 && (
          <>
            <SectionHeader title="Achievements" subtitle="What you accomplished" />
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {data.achievements.map((a, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 60)}>
                  <AiCard padding={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="trophy-outline" size={20} color={AI_COLORS.warning} />
                      <Text style={{ fontSize: 13, color: AI_COLORS.text, flex: 1 }}>{a}</Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
            </View>
          </>
        )}

        <SectionHeader title="Financial Health" subtitle="This month's score" />
        <ReAnimated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 16 }}>
          <HealthScoreCard
            score={data.healthScore?.current ?? 0}
            trend={data.healthScore?.change ?? 0}
            title="Monthly Health Score"
            subtitle={data.healthScore?.level ?? ''}
          />
        </ReAnimated.View>

        {data.budgets && (
          <>
            <SectionHeader
              title="Budget Overview"
              subtitle={`${data.budgets.onTrack ?? 0} on track, ${data.budgets.exceeded ?? 0} exceeded`}
            />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {(data.budgets.details ?? []).map((b, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons
                        name={b.status === 'exceeded' ? 'alert-circle' : 'checkmark-circle'}
                        size={18}
                        color={b.status === 'exceeded' ? AI_COLORS.danger : AI_COLORS.success}
                      />
                      <Text style={{ flex: 1, fontSize: 13, color: AI_COLORS.text }}>{b.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: AI_COLORS.text }}>
                        ₹{b.spent.toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary }}>
                        / ₹{b.budget.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
            </View>
          </>
        )}

        {data.recommendations?.length > 0 && (
          <>
            <SectionHeader title="Recommendations" subtitle="AI suggestions" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.recommendations.map((r, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="bulb-outline" size={16} color={AI_COLORS.primary} />
                      <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary, flex: 1 }}>
                        {r}
                      </Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
            </View>
          </>
        )}

        {data.nextMonthFocus && (
          <ReAnimated.View
            entering={FadeInUp.duration(500)}
            style={{ paddingHorizontal: 16, marginTop: 16 }}
          >
            <AiCard padding={16} style={{ borderColor: AI_COLORS.primary, borderWidth: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="flag-outline" size={20} color={AI_COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: AI_COLORS.primary }}>
                    NEXT MONTH FOCUS
                  </Text>
                  <Text style={{ fontSize: 14, color: AI_COLORS.text, marginTop: 2 }}>
                    {data.nextMonthFocus}
                  </Text>
                </View>
              </View>
            </AiCard>
          </ReAnimated.View>
        )}

        {data.income?.sources?.length > 0 && (
          <>
            <SectionHeader title="Income Sources" subtitle="Where your money came from" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.income.sources.map((s, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: AI_COLORS.text }}>{s.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: AI_COLORS.success }}>
                        ₹{s.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
              {data.income.vsLastMonth != null && (
                <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary, textAlign: 'center', marginTop: 4 }}>
                  {data.income.vsLastMonth >= 0 ? '↑' : '↓'} {Math.abs(data.income.vsLastMonth).toFixed(1)}% vs last month
                </Text>
              )}
            </View>
          </>
        )}

        {data.expenses?.byCategory?.length > 0 && (
          <>
            <SectionHeader title="Expenses by Category" subtitle="Where your money went" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.expenses.byCategory.map((c, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, color: AI_COLORS.text }}>{c.category}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: AI_COLORS.text }}>
                            ₹{c.amount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: AI_COLORS.card, borderRadius: 2, marginTop: 6 }}>
                          <View style={{ width: `${Math.min(c.percentage, 100)}%`, height: '100%', backgroundColor: AI_COLORS.primary, borderRadius: 2 }} />
                        </View>
                      </View>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
              {data.expenses.vsLastMonth != null && (
                <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary, textAlign: 'center', marginTop: 4 }}>
                  {data.expenses.vsLastMonth >= 0 ? '↑' : '↓'} {Math.abs(data.expenses.vsLastMonth).toFixed(1)}% vs last month
                </Text>
              )}
            </View>
          </>
        )}

        {data.goals?.progress?.length > 0 && (
          <>
            <SectionHeader title="Goal Progress" subtitle="Savings goals this month" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.goals.progress.map((g, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons
                        name={g.status === 'completed' ? 'checkmark-circle' : 'time-outline'}
                        size={18}
                        color={g.status === 'completed' ? AI_COLORS.success : AI_COLORS.warning}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: AI_COLORS.text }}>{g.name}</Text>
                        <View style={{ height: 4, backgroundColor: AI_COLORS.card, borderRadius: 2, marginTop: 4 }}>
                          <View style={{ width: `${Math.min(g.progress, 100)}%`, height: '100%', backgroundColor: g.status === 'completed' ? AI_COLORS.success : AI_COLORS.primary, borderRadius: 2 }} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: AI_COLORS.text }}>{g.progress}%</Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
              {data.goals.highlight && (
                <Text style={{ fontSize: 11, color: AI_COLORS.textSecondary, textAlign: 'center', marginTop: 4 }}>{data.goals.highlight}</Text>
              )}
            </View>
          </>
        )}

        {data.bills && (
          <>
            <SectionHeader title="Bills" subtitle={`${data.bills.paid ?? 0} paid, ${data.bills.pending ?? 0} pending`} />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              <AiCard padding={12}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.success }}>{data.bills.paid ?? 0}</Text>
                    <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary }}>Paid</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.warning }}>{data.bills.pending ?? 0}</Text>
                    <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary }}>Pending</Text>
                  </View>
                </View>
              </AiCard>
              {(data.bills.upcoming ?? []).length > 0 && (
                <View style={{ gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: AI_COLORS.textTertiary }}>UPCOMING</Text>
                  {data.bills.upcoming.slice(0, 3).map((b, i) => (
                    <AiCard key={i} padding={10}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: AI_COLORS.text }}>{b.name}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: AI_COLORS.text }}>
                          ₹{b.amount.toLocaleString('en-IN')} · {b.dueDate}
                        </Text>
                      </View>
                    </AiCard>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {data.insights?.length > 0 && (
          <>
            <SectionHeader title="Insights" subtitle="AI-powered observations" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.insights.map((insight, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 60)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="bulb-outline" size={16} color={AI_COLORS.warning} />
                      <Text style={{ fontSize: 12, color: AI_COLORS.textSecondary, flex: 1 }}>
                        {insight}
                      </Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
            </View>
          </>
        )}

        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ paddingHorizontal: 16, marginTop: 24 }}
        >
          <TouchableOpacity
            style={s.shareBtn}
            onPress={async () => {
              try {
                const text = [
                  `📊 Monthly Review — ${data.period}`,
                  '',
                  `Savings: ₹${(data.savings?.total ?? 0).toLocaleString('en-IN')} (${data.savings?.rate ?? 0}%)`,
                  `Income: ₹${(data.income?.total ?? 0).toLocaleString('en-IN')}`,
                  `Expenses: ₹${(data.expenses?.total ?? 0).toLocaleString('en-IN')}`,
                  `Health Score: ${data.healthScore?.current ?? 0}/100`,
                  '',
                  data.nextMonthFocus ? `🎯 Next Focus: ${data.nextMonthFocus}` : '',
                ].filter(Boolean).join('\n');
                await Share.share({ message: text, title: `Monthly Review — ${data.period}` });
              } catch {
                Alert.alert('Error', 'Could not share');
              }
            }}
          >
            <Ionicons name="download-outline" size={18} color="#FFF" />
            <Text style={s.shareBtnText}>Share as PDF</Text>
          </TouchableOpacity>
        </ReAnimated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
