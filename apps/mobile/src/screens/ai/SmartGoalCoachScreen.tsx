import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import {
  AI_COLORS, AnimatedProgressRing, AiCard, SectionHeader,
} from './components/AiShared';

interface GoalWithPrediction {
  id: string;
  name: string;
  current: number;
  target: number;
  emoji: string;
  predictedCompletionDate?: string;
  successProbability?: number;
  currentPace?: string;
  requiredMonthlyContribution?: number;
  improvementTip?: string;
}

export function SmartGoalCoachScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [goals, setGoals] = useState<GoalWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (accessToken) setAccessToken(accessToken);
    setLoading(true);
    try {
      const res = await api.get<any>('/goals');
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      if (list.length === 0) { setGoals([]); setLoading(false); return; }

      const enriched = (
        await Promise.allSettled(
          list.slice(0, 5).map(async (g: any) => {
            let pred = {};
            try {
              const pRes = await api.get<any>(`/ai/goals/${g.id}/prediction`);
              const p = pRes?.data ?? pRes;
              if (p) pred = { predictedCompletionDate: p.predictedCompletionDate, successProbability: p.successProbability, currentPace: p.currentPace, requiredMonthlyContribution: p.requiredMonthlyContribution, improvementTip: p.improvementTip };
            } catch { /* ignore */ }
            return { id: g.id, name: g.name ?? g.title ?? '', current: Number(g.currentAmount ?? g.saved ?? 0), target: Number(g.targetAmount ?? g.target ?? 0), emoji: g.emoji ?? '🎯', ...pred } as GoalWithPrediction;
          }),
        )
      ).filter((r) => r.status === 'fulfilled').map((r: any) => r.value);
      setGoals(enriched);
    } catch { setGoals([]); } finally { setLoading(false); }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton width="50%" height={24} borderRadius={8} />
          <Skeleton width="100%" height={140} borderRadius={24} />
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (goals.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <Ionicons name="trophy-outline" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>No goals yet</Text>
          <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 32 }}>
            Create a goal and AI will help you track and predict completion.
          </Text>
        </View>
      </View>
    );
  }

  const hero = goals[0];
  const heroPct = hero.target > 0 ? Math.min(100, Math.round((hero.current / hero.target) * 100)) : 0;

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <ReAnimated.View entering={FadeInUp.duration(400)} style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.headerTitle}>Goal Coach</Text>
          <Text style={s.headerSub}>AI-powered goal tracking and predictions</Text>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 16 }}>
          <View style={[s.heroCard, { borderColor: AI_COLORS.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Text style={{ fontSize: 40 }}>{hero.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>{hero.name}</Text>
                <Text style={s.heroAmt}>₹{hero.current.toLocaleString('en-IN')} / ₹{hero.target.toLocaleString('en-IN')}</Text>
                <View style={[s.pBar, { backgroundColor: AI_COLORS.border }]}>
                  <View style={[s.pBarFill, { width: `${heroPct}%`, backgroundColor: heroPct >= 80 ? AI_COLORS.success : AI_COLORS.primary }]} />
                </View>
              </View>
              <AnimatedProgressRing size={72} strokeWidth={5} progress={heroPct} color={heroPct >= 80 ? AI_COLORS.success : AI_COLORS.primary}>
                <Text style={s.heroPct}>{heroPct}%</Text>
              </AnimatedProgressRing>
            </View>

            {hero.predictedCompletionDate && (
              <View style={[s.divider, { backgroundColor: AI_COLORS.border }]} />
            )}

            {(hero.predictedCompletionDate || hero.successProbability) && (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {hero.predictedCompletionDate && (
                  <View style={{ flex: 1 }}>
                    <Text style={s.predLabel}>Predicted Completion</Text>
                    <Text style={s.predValue}>{new Date(hero.predictedCompletionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                )}
                {hero.successProbability !== undefined && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.predLabel}>Success Probability</Text>
                    <Text style={[s.predValue, { color: hero.successProbability >= 80 ? AI_COLORS.success : hero.successProbability >= 50 ? AI_COLORS.warning : AI_COLORS.danger }]}>
                      {hero.successProbability}%
                    </Text>
                  </View>
                )}
              </View>
            )}

            {hero.improvementTip && (
              <View style={[s.tipCard, { backgroundColor: `${AI_COLORS.primary}15`, borderColor: `${AI_COLORS.primary}30` }]}>
                <Ionicons name="bulb-outline" size={16} color={AI_COLORS.primary} />
                <Text style={{ fontSize: 12, color: AI_COLORS.textSecondary, flex: 1 }}>{hero.improvementTip}</Text>
              </View>
            )}
          </View>
        </ReAnimated.View>

        {goals.length > 1 && (
          <>
            <SectionHeader title="All Goals" subtitle="Track your progress" />
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {goals.slice(1).map((goal) => {
                const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
                return (
                  <ReAnimated.View key={goal.id} entering={FadeInUp.duration(300)}>
                    <AiCard padding={16}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 28 }}>{goal.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: AI_COLORS.text }}>{goal.name}</Text>
                          <Text style={{ fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2 }}>₹{goal.current.toLocaleString('en-IN')} / ₹{goal.target.toLocaleString('en-IN')}</Text>
                          <View style={[s.pBar, { backgroundColor: AI_COLORS.border, marginTop: 6 }]}>
                            <View style={[s.pBarFill, { width: `${pct}%`, backgroundColor: pct >= 80 ? AI_COLORS.success : AI_COLORS.primary }]} />
                          </View>
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: pct >= 80 ? AI_COLORS.success : AI_COLORS.primary }}>{pct}%</Text>
                      </View>
                      {goal.successProbability !== undefined && (
                        <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary, marginTop: 6 }}>
                          {goal.successProbability}% success probability
                        </Text>
                      )}
                    </AiCard>
                  </ReAnimated.View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: AI_COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: AI_COLORS.textSecondary },
  heroCard: { backgroundColor: AI_COLORS.card, borderRadius: 24, padding: 20, borderWidth: 1, gap: 16 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: AI_COLORS.text },
  heroAmt: { fontSize: 13, color: AI_COLORS.textSecondary, marginTop: 2 },
  heroPct: { fontSize: 16, fontWeight: '800', color: AI_COLORS.text },
  pBar: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  pBarFill: { height: '100%', borderRadius: 2 },
  divider: { height: 1 },
  predLabel: { fontSize: 11, color: AI_COLORS.textTertiary },
  predValue: { fontSize: 14, fontWeight: '700', color: AI_COLORS.text, marginTop: 2 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
});
