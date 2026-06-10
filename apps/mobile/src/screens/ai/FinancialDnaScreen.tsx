import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  RadarChart,
  AiCard,
  SectionHeader,
  PremiumBadge,
} from './components/AiShared';

interface DnaData {
  spendingScore: number;
  savingScore: number;
  disciplineScore: number;
  weekendSpendingPct: number;
  luxurySpendingScore: number;
  impulsePurchaseScore: number;
  familyContributionScore: number;
  settlementReliabilityScore: number;
  spendingPersonality: string;
  savingPersonality: string;
  riskLevel: string;
  incomeConsistency: string;
  billPaymentBehavior: string;
  insights: string[];
  overallScore: number;
}

const PERSONALITY_EMOJIS: Record<string, string> = {
  frugal: '🐿️',
  balanced: '⚖️',
  spender: '💸',
  lavish: '💎',
  hoarder: '🏦',
  moderate: '📊',
  conservative: '🛡️',
  aggressive: '🚀',
};

export function FinancialDnaScreen() {
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
        bigScore: { fontSize: 42, fontWeight: '800', color: AI_COLORS.text, letterSpacing: -1 },
        bigScoreLabel: { fontSize: 12, color: AI_COLORS.textTertiary },
        scoreTitle: { fontSize: 18, fontWeight: '700', color: AI_COLORS.text, marginTop: 16 },
        scoreDesc: {
          fontSize: 13,
          color: AI_COLORS.textSecondary,
          textAlign: 'center',
          marginTop: 6,
          lineHeight: 18,
          paddingHorizontal: 20,
        },
        mIcon: {
          width: 38,
          height: 38,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
        },
        mLabel: { fontSize: 14, fontWeight: '600', color: AI_COLORS.text },
        mDetail: { fontSize: 11, color: AI_COLORS.textSecondary, marginTop: 1 },
        mVal: { fontSize: 10, fontWeight: '800' },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [data, setData] = useState<DnaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePersonality, setActivePersonality] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/dna');
      const d = res?.data ?? res;
      if (d) {
        const overall = Math.round((d.spendingScore + d.savingScore + d.disciplineScore) / 3);
        setData({ ...d, overallScore: overall });
        setActivePersonality(d.spendingPersonality ?? 'balanced');
      } else {
        setData(null);
      }
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
          <Skeleton width={160} height={160} borderRadius={80} style={{ alignSelf: 'center' }} />
          <Skeleton width="100%" height={60} borderRadius={14} />
          <Skeleton width="100%" height={60} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <Ionicons name="analytics-outline" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No DNA profile yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            Your financial DNA will be computed after the weekly AI analysis.
          </Text>
        </View>
      </View>
    );
  }

  const categories = [
    {
      label: 'Saver Score',
      value: data.savingScore ?? 50,
      icon: 'wallet-outline' as const,
      color: AI_COLORS.success,
      desc: data.savingPersonality ?? 'N/A',
    },
    {
      label: 'Impulse Score',
      value: 100 - (data.impulsePurchaseScore ?? 50),
      icon: 'flame' as const,
      color: AI_COLORS.warning,
      desc: `${data.impulsePurchaseScore ?? 50}% impulse`,
    },
    {
      label: 'Luxury Score',
      value: data.luxurySpendingScore ?? 50,
      icon: 'diamond-outline' as const,
      color: AI_COLORS.info,
      desc: `${data.luxurySpendingScore ?? 50}% luxury`,
    },
    {
      label: 'Consistency Score',
      value: data.disciplineScore ?? 50,
      icon: 'sync-outline' as const,
      color: AI_COLORS.purple,
      desc: data.incomeConsistency ?? 'N/A',
    },
  ];

  const personalityTypes = [
    {
      label: 'Spender',
      value: data.spendingScore ?? 50,
      emoji: PERSONALITY_EMOJIS[data.spendingPersonality] ?? '💸',
      key: data.spendingPersonality,
    },
    {
      label: 'Saver',
      value: data.savingScore ?? 50,
      emoji: PERSONALITY_EMOJIS[data.savingPersonality] ?? '🏦',
      key: data.savingPersonality,
    },
    { label: 'Discipline', value: data.disciplineScore ?? 50, emoji: '📊', key: 'discipline' },
    {
      label: 'Risk',
      value: data.riskLevel === 'aggressive' ? 80 : data.riskLevel === 'moderate' ? 50 : 20,
      emoji: data.riskLevel === 'aggressive' ? '🚀' : data.riskLevel === 'moderate' ? '⚖️' : '🛡️',
      key: data.riskLevel,
    },
  ];

  const radarData = categories.map((c) => ({
    label: c.label.split(' ')[0],
    value: c.value,
    color: c.color,
  }));

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
          <Text style={s.headerTitle}>Financial DNA</Text>
          <Text style={s.headerSub}>Your unique financial fingerprint</Text>
          <PremiumBadge premium />
        </ReAnimated.View>

        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ paddingHorizontal: 16, alignItems: 'center', paddingVertical: 20 }}
        >
          <AnimatedProgressRing
            size={160}
            strokeWidth={10}
            progress={data.overallScore}
            color={AI_COLORS.primary}
          >
            <Text style={s.bigScore}>{data.overallScore}</Text>
            <Text style={s.bigScoreLabel}>of 100</Text>
          </AnimatedProgressRing>
          <Text style={s.scoreTitle}>Financial Health</Text>
          <Text style={s.scoreDesc}>
            {data.spendingPersonality === 'frugal'
              ? 'You are a natural saver with strong discipline.'
              : data.spendingPersonality === 'balanced'
                ? 'You balance spending and saving well.'
                : data.spendingPersonality === 'spender'
                  ? 'You enjoy spending but can improve savings.'
                  : 'Consider more mindful spending habits.'}
          </Text>
        </ReAnimated.View>

        <SectionHeader title="Behavior Metrics" subtitle="Key behavioral indicators" />
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {[
            {
              label: 'Weekend Spending',
              value: data.weekendSpendingPct ?? 50,
              icon: 'calendar-outline' as const,
              color: AI_COLORS.warning,
              detail: `${data.weekendSpendingPct ?? 0}% on weekends`,
            },
            {
              label: 'Impulse Purchases',
              value: 100 - (data.impulsePurchaseScore ?? 50),
              icon: 'flame-outline' as const,
              color: AI_COLORS.success,
              detail: `${data.impulsePurchaseScore ?? 0}% impulse rate`,
            },
            {
              label: 'Luxury Spending',
              value: data.luxurySpendingScore ?? 50,
              icon: 'diamond-outline' as const,
              color: AI_COLORS.info,
              detail: `${data.luxurySpendingScore ?? 0}% on luxury`,
            },
            {
              label: 'Discipline Score',
              value: data.disciplineScore ?? 50,
              icon: 'trending-up-outline' as const,
              color: AI_COLORS.purple,
              detail: `Bill payment: ${data.billPaymentBehavior ?? 'N/A'}`,
            },
          ].map((m, i) => (
            <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 50)}>
              <AiCard padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[s.mIcon, { backgroundColor: `${m.color}20` }]}>
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mLabel}>{m.label}</Text>
                    <Text style={s.mDetail}>{m.detail}</Text>
                  </View>
                  <AnimatedProgressRing
                    size={44}
                    strokeWidth={4}
                    progress={m.value}
                    color={m.color}
                  >
                    <Text style={[s.mVal, { color: m.color }]}>{m.value}</Text>
                  </AnimatedProgressRing>
                </View>
              </AiCard>
            </ReAnimated.View>
          ))}
        </View>

        <SectionHeader title="DNA Visualization" subtitle="How your traits compare" />
        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ alignItems: 'center', paddingVertical: 10 }}
        >
          <RadarChart size={280} data={radarData} />
        </ReAnimated.View>

        {data.insights.length > 0 && (
          <>
            <SectionHeader title="AI Insights" subtitle="What your DNA reveals" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {data.insights.map((insight, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 40)}>
                  <AiCard padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="bulb-outline" size={16} color={AI_COLORS.primary} />
                      <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary, flex: 1 }}>
                        {insight}
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
