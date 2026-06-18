import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useAiColors, AiCard, SectionHeader, AnimatedProgressRing } from './components/AiShared';

interface SettlementData {
  suggestion: { fromName: string; toName: string; amount: number }[];
  originalTxCount: number;
  optimizedTxCount: number;
  totalAmount: number;
}

export function GroupSpaceAiScreen() {
  const AI_COLORS = useAiColors();
  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1 },
        header: { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
        headerTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: AI_COLORS.text,
          letterSpacing: -0.5,
        },
        headerSub: { fontSize: 13, color: AI_COLORS.textSecondary },
        heroIcon: {
          width: 48,
          height: 48,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
        },
        heroTitle: { fontSize: 18, fontWeight: '700', color: AI_COLORS.text },
        heroSub: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 1 },
        metricLabel: { fontSize: 11, color: AI_COLORS.textTertiary },
        metricValue: { fontSize: 16, fontWeight: '700', color: AI_COLORS.text, marginTop: 2 },
        avatar: {
          width: 36,
          height: 36,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
        },
        avatarText: { fontSize: 14, fontWeight: '700' },
        settleBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: AI_COLORS.primary,
          borderRadius: 12,
          paddingVertical: 14,
        },
        settleBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const route = useRoute<any>();
  const groupId = route.params?.groupId;
  const [settlements, setSettlements] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<any>(`/ai/groups/${groupId}/settlements/optimize`);
      const d = res?.data ?? res;
      setSettlements(d ?? null);
    } catch {
      setSettlements(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

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
          <Skeleton width="100%" height={120} borderRadius={20} />
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (!settlements) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <AntDesign name="calendar" size={48} color={AI_COLORS.textTertiary}  />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No trip data
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            Select a trip or group to see AI-powered settlement intelligence.
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
          <Text style={s.headerTitle}>Settlement Intelligence</Text>
          <Text style={s.headerSub}>AI-optimized group settlements</Text>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 16 }}>
          <AiCard padding={20}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={[s.heroIcon, { backgroundColor: `${AI_COLORS.primary}20` }]}>
                <AntDesign  name="wallet" size={24} color={AI_COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>Settlement Optimizer</Text>
                <Text style={s.heroSub}>
                  Total amount: ₹{settlements.totalAmount?.toLocaleString('en-IN') ?? 0}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.metricLabel}>Original Txns</Text>
                <Text style={s.metricValue}>{settlements.originalTxCount ?? 0}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.metricLabel}>Optimized Txns</Text>
                <Text style={[s.metricValue, { color: AI_COLORS.success }]}>
                  {settlements.optimizedTxCount ?? 0}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.metricLabel}>Savings</Text>
                <Text style={[s.metricValue, { color: AI_COLORS.success }]}>
                  {(settlements.originalTxCount ?? 0) - (settlements.optimizedTxCount ?? 0) > 0
                    ? `-${(settlements.originalTxCount ?? 0) - (settlements.optimizedTxCount ?? 0)} txns`
                    : 'Optimal'}
                </Text>
              </View>
            </View>
          </AiCard>
        </ReAnimated.View>

        {settlements.suggestion?.length > 0 && (
          <>
            <SectionHeader title="Suggested Settlements" subtitle="AI-optimized transfers" />
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {settlements.suggestion.map((settle, i) => (
                <ReAnimated.View key={i} entering={FadeInUp.duration(300).delay(i * 50)}>
                  <AiCard padding={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[s.avatar, { backgroundColor: `${AI_COLORS.primary}20` }]}>
                        <Text style={[s.avatarText, { color: AI_COLORS.primary }]}>
                          {settle.fromName?.[0] ?? '?'}
                        </Text>
                      </View>
                      <AntDesign  name="arrowright" size={16} color={AI_COLORS.primary} />
                      <View style={[s.avatar, { backgroundColor: `${AI_COLORS.success}20` }]}>
                        <Text style={[s.avatarText, { color: AI_COLORS.success }]}>
                          {settle.toName?.[0] ?? '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary }}>
                          {settle.fromName} → {settle.toName}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: AI_COLORS.text }}>
                        ₹{settle.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </AiCard>
                </ReAnimated.View>
              ))}
            </View>

            <ReAnimated.View
              entering={FadeInUp.duration(500)}
              style={{ paddingHorizontal: 16, marginTop: 16 }}
            >
              <TouchableOpacity style={s.settleBtn}>
                <AntDesign  name="checkcircleo" size={18} color="#FFF" />
                <Text style={s.settleBtnText}>Apply Settlements</Text>
              </TouchableOpacity>
            </ReAnimated.View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
