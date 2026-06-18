import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
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
  PremiumBadge,
  MetricRow,
} from './components/AiShared';

interface ScoreData {
  overallScore: number;
  components: {
    savingsRate: number;
    debtRatio: number;
    budgetDiscipline: number;
    goalProgress: number;
    billConsistency: number;
    emergencyFund: number;
  };
  monthlyChange: number;
  financialLevel: string;
  improvementTips: string[];
}

export function CoupleAiScreen() {
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
        headerSub: { fontSize: 13, color: AI_COLORS.textSecondary },
        bigScore: { fontSize: 36, fontWeight: '800', color: AI_COLORS.text, letterSpacing: -1 },
        bigScoreLabel: { fontSize: 10, color: AI_COLORS.textTertiary, marginTop: 2 },
        scoreTitle: { fontSize: 18, fontWeight: '700', color: AI_COLORS.text, marginTop: 16 },
        scoreDesc: {
          fontSize: 13,
          color: AI_COLORS.textSecondary,
          textAlign: 'center',
          marginTop: 6,
          lineHeight: 18,
          paddingHorizontal: 20,
        },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/health-score');
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
          <Skeleton width="50%" height={24} borderRadius={8} />
          <Skeleton width={140} height={140} borderRadius={70} style={{ alignSelf: 'center' }} />
          <Skeleton width="100%" height={60} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <AntDesign  name="hearto" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No couple data yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            Create a couple space to see relationship finance intelligence.
          </Text>
        </View>
      </View>
    );
  }

  const metrics = [
    {
      label: 'Budget Discipline',
      value: data.components?.budgetDiscipline ?? 0,
      color: AI_COLORS.success,
    },
    { label: 'Savings Rate', value: data.components?.savingsRate ?? 0, color: AI_COLORS.warning },
    { label: 'Goal Progress', value: data.components?.goalProgress ?? 0, color: AI_COLORS.info },
    {
      label: 'Bill Consistency',
      value: data.components?.billConsistency ?? 0,
      color: AI_COLORS.purple,
    },
  ];

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
              <Text style={s.headerTitle}>Couple AI</Text>
              <Text style={s.headerSub}>Relationship finance intelligence</Text>
            </View>
            <PremiumBadge premium />
          </View>
        </ReAnimated.View>

        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ paddingHorizontal: 16, alignItems: 'center', paddingVertical: 12 }}
        >
          <AnimatedProgressRing
            size={140}
            strokeWidth={10}
            progress={data.overallScore}
            color={AI_COLORS.success}
          >
            <Text style={s.bigScore}>{data.overallScore}</Text>
            <Text style={s.bigScoreLabel}>compatibility</Text>
          </AnimatedProgressRing>
          <Text style={s.scoreTitle}>Financial Compatibility</Text>
          <Text style={s.scoreDesc}>
            Based on your shared financial health score. Level: {data.financialLevel}
          </Text>
        </ReAnimated.View>

        <SectionHeader title="Key Metrics" subtitle="Financial health components" />
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {metrics.map((m, i) => (
            <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 60)}>
              <AiCard padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <AnimatedProgressRing
                    size={48}
                    strokeWidth={4}
                    progress={m.value}
                    color={m.color}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: m.color }}>
                      {m.value}
                    </Text>
                  </AnimatedProgressRing>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: AI_COLORS.text }}>
                    {m.label}
                  </Text>
                  <AntDesign
                    name={(m.value >= 60 ? 'checkcircle' : 'exclamationcircle') as any}
                    size={20}
                    color={m.color}
                  />
                </View>
              </AiCard>
            </ReAnimated.View>
          ))}
        </View>

        {data.improvementTips?.length > 0 && (
          <>
            <SectionHeader title="Improvement Tips" subtitle="AI suggestions" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.improvementTips.map((tip, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AntDesign  name="bulb1" size={16} color={AI_COLORS.primary} />
                      <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary, flex: 1 }}>
                        {tip}
                      </Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
