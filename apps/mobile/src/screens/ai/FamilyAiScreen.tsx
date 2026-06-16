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
  HealthScoreCard,
  PremiumBadge,
} from './components/AiShared';

interface HealthData {
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

export function FamilyAiScreen() {
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
        gridLabel: {
          fontSize: 11,
          color: AI_COLORS.textSecondary,
          marginTop: 8,
          textAlign: 'center',
        },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [data, setData] = useState<HealthData | null>(null);
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
          <Skeleton width="100%" height={100} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <AntDesign  name="team" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No family data yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            Family financial intelligence will appear here once you set up family sharing.
          </Text>
        </View>
      </View>
    );
  }

  const scores = [
    {
      label: 'Emergency Fund',
      value: data.components?.emergencyFund ?? 0,
      color: AI_COLORS.warning,
    },
    { label: 'Debt Ratio', value: data.components?.debtRatio ?? 0, color: AI_COLORS.success },
    { label: 'Savings Rate', value: data.components?.savingsRate ?? 0, color: AI_COLORS.info },
    { label: 'Goal Progress', value: data.components?.goalProgress ?? 0, color: AI_COLORS.purple },
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
              <Text style={s.headerTitle}>Family AI</Text>
              <Text style={s.headerSub}>Family financial intelligence</Text>
            </View>
            <PremiumBadge premium />
          </View>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 16 }}>
          <HealthScoreCard
            score={data.overallScore}
            trend={data.monthlyChange}
            title="Family Financial Health"
            subtitle={`Level: ${data.financialLevel}`}
          />
        </ReAnimated.View>

        <SectionHeader title="Family Scores" subtitle="Key health indicators" />
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {scores.slice(0, 2).map((item, i) => (
              <ReAnimated.View
                key={i}
                entering={FadeInUp.duration(300).delay(i * 50)}
                style={{ flex: 1 }}
              >
                <AiCard padding={16} style={{ alignItems: 'center' }}>
                  <AnimatedProgressRing
                    size={72}
                    strokeWidth={5}
                    progress={item.value}
                    color={item.color}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '800', color: item.color }}>
                      {item.value}
                    </Text>
                  </AnimatedProgressRing>
                  <Text style={s.gridLabel}>{item.label}</Text>
                </AiCard>
              </ReAnimated.View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {scores.slice(2).map((item, i) => (
              <ReAnimated.View
                key={i}
                entering={FadeInUp.duration(300).delay(i * 50 + 100)}
                style={{ flex: 1 }}
              >
                <AiCard padding={16} style={{ alignItems: 'center' }}>
                  <AnimatedProgressRing
                    size={72}
                    strokeWidth={5}
                    progress={item.value}
                    color={item.color}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '800', color: item.color }}>
                      {item.value}
                    </Text>
                  </AnimatedProgressRing>
                  <Text style={s.gridLabel}>{item.label}</Text>
                </AiCard>
              </ReAnimated.View>
            ))}
          </View>
        </View>

        {data.improvementTips?.length > 0 && (
          <>
            <SectionHeader title="Improvement Tips" subtitle="AI suggestions for your family" />
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
