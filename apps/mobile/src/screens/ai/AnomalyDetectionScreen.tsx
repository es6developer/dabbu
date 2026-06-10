import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useAiColors, AiCard, SectionHeader, SeverityBadge } from './components/AiShared';

interface AnomalyItem {
  type: string;
  category?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actualValue: number;
  expectedValue: number;
  deviationPct: number;
}

export function AnomalyDetectionScreen() {
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
        countCircle: {
          width: 52,
          height: 52,
          borderRadius: 26,
          justifyContent: 'center',
          alignItems: 'center',
        },
        countNum: { fontSize: 22, fontWeight: '800' },
        countLabel: { fontSize: 11, color: AI_COLORS.textSecondary, marginTop: 6 },
        aIcon: {
          width: 40,
          height: 40,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
        },
        aTitle: { fontSize: 14, fontWeight: '700', color: AI_COLORS.text },
        aDesc: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2, lineHeight: 17 },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/anomalies');
      const list = res?.data ?? res;
      if (Array.isArray(list)) {
        setAnomalies(
          list.map((a: any) => ({
            type: a.type ?? '',
            category: a.category,
            description: a.description ?? '',
            severity: a.severity ?? 'low',
            actualValue: Number(a.actualValue ?? 0),
            expectedValue: Number(a.expectedValue ?? 0),
            deviationPct: Number(a.deviationPct ?? 0),
          })),
        );
      } else {
        setAnomalies([]);
      }
    } catch {
      setAnomalies([]);
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

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...anomalies].sort(
    (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9),
  );
  const criticalCount = anomalies.filter(
    (a) => a.severity === 'critical' || a.severity === 'high',
  ).length;
  const warningCount = anomalies.filter((a) => a.severity === 'medium').length;

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton width="50%" height={24} borderRadius={8} />
          <Skeleton width="100%" height={80} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={14} />
          <Skeleton width="100%" height={80} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (anomalies.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <Ionicons name="checkmark-circle-outline" size={48} color={AI_COLORS.success} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No anomalies detected
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            Your spending patterns look normal. AI will alert you if anything unusual is detected.
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
          <Text style={s.headerTitle}>Anomaly Detection</Text>
          <Text style={s.headerSub}>Unusual patterns detected in your spending</Text>
        </ReAnimated.View>

        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
        >
          <AiCard padding={20}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[s.countCircle, { backgroundColor: `${AI_COLORS.danger}20` }]}>
                  <Text style={[s.countNum, { color: AI_COLORS.danger }]}>{criticalCount}</Text>
                </View>
                <Text style={s.countLabel}>Critical</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[s.countCircle, { backgroundColor: `${AI_COLORS.warning}20` }]}>
                  <Text style={[s.countNum, { color: AI_COLORS.warning }]}>{warningCount}</Text>
                </View>
                <Text style={s.countLabel}>Warnings</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[s.countCircle, { backgroundColor: `${AI_COLORS.info}20` }]}>
                  <Text style={[s.countNum, { color: AI_COLORS.info }]}>{anomalies.length}</Text>
                </View>
                <Text style={s.countLabel}>Total</Text>
              </View>
            </View>
          </AiCard>
        </ReAnimated.View>

        <SectionHeader title="Feed" subtitle="Sorted by severity" />
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {sorted.map((a, i) => {
            const clr =
              a.severity === 'critical' || a.severity === 'high'
                ? AI_COLORS.danger
                : a.severity === 'medium'
                  ? AI_COLORS.warning
                  : AI_COLORS.info;
            return (
              <ReAnimated.View key={i} entering={FadeInRight.duration(400).delay(i * 60)}>
                <TouchableOpacity activeOpacity={0.8}>
                  <AiCard padding={14} style={{ borderLeftWidth: 3, borderLeftColor: clr }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[s.aIcon, { backgroundColor: `${clr}20` }]}>
                        <Ionicons
                          name={
                            a.type === 'spending_spike'
                              ? 'trending-up'
                              : a.type === 'large_transaction'
                                ? 'cart'
                                : a.type === 'income_drop'
                                  ? 'trending-down'
                                  : 'warning-outline'
                          }
                          size={20}
                          color={clr}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <Text style={s.aTitle}>{a.category ?? a.type}</Text>
                          <SeverityBadge
                            severity={
                              a.severity === 'critical' || a.severity === 'high'
                                ? 'critical'
                                : a.severity === 'medium'
                                  ? 'warning'
                                  : 'info'
                            }
                          />
                        </View>
                        <Text style={s.aDesc}>{a.description}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                          <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary }}>
                            Actual: ₹{a.actualValue.toLocaleString('en-IN')}
                          </Text>
                          <Text style={{ fontSize: 11, color: AI_COLORS.textTertiary }}>
                            Expected: ₹{a.expectedValue.toLocaleString('en-IN')}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: clr }}>
                            +{a.deviationPct.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </AiCard>
                </TouchableOpacity>
              </ReAnimated.View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
