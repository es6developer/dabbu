import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useAiColors, AiCard, SectionHeader } from './components/AiShared';

interface SavingsOpp {
  type: string;
  title: string;
  description: string;
  monthlySavings: number;
  category?: string;
  actionLabel?: string;
}

export function AiSavingsScreen() {
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
        oppCard: {
          backgroundColor: AI_COLORS.card,
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderLeftWidth: 3,
        },
        oppIcon: {
          width: 44,
          height: 44,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
        },
        oppTitle: { fontSize: 15, fontWeight: '700', color: AI_COLORS.text },
        oppDesc: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2 },
        oppBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
        oppBadgeText: { fontSize: 12, fontWeight: '700' },
        oppAction: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
        oppActionText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [opportunities, setOpportunities] = useState<SavingsOpp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<any>('/ai/savings-opportunities');
      const list = res?.data ?? res;
      if (Array.isArray(list)) {
        setOpportunities(
          list.map((o: any) => ({
            type: o.type ?? 'general',
            title: o.title ?? '',
            description: o.description ?? '',
            monthlySavings: Number(o.monthlySavings ?? 0),
            category: o.category,
            actionLabel: o.actionLabel ?? 'Review',
          })),
        );
      } else {
        setOpportunities([]);
      }
    } catch {
      setOpportunities([]);
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

  const totalSavings = opportunities.reduce((sum, o) => sum + o.monthlySavings, 0);

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton width="50%" height={24} borderRadius={8} />
          <Skeleton width="100%" height={100} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (opportunities.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <AntDesign  name="wallet" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No savings opportunities found
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            AI will analyze your spending patterns to find saving opportunities.
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
          <Text style={s.headerTitle}>Savings Opportunities</Text>
          <Text style={s.headerSub}>AI-discovered ways to save money</Text>
        </ReAnimated.View>

        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
        >
          <AiCard padding={20}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: `${AI_COLORS.success}20`,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AntDesign  name="wallet" size={30} color={AI_COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: AI_COLORS.textSecondary }}>
                  Total Potential Savings
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: AI_COLORS.text,
                    letterSpacing: -1,
                  }}
                >
                  ₹{totalSavings.toLocaleString('en-IN')}
                </Text>
                <Text style={{ fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2 }}>
                  per month · {opportunities.length} opportunity
                  {opportunities.length !== 1 ? 'ies' : 'y'} found
                </Text>
              </View>
            </View>
          </AiCard>
        </ReAnimated.View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {opportunities.map((opp, i) => {
            const typeColor =
              opp.type.includes('duplicate') || opp.type.includes('unused')
                ? AI_COLORS.warning
                : opp.type.includes('rest') || opp.type.includes('delivery')
                  ? AI_COLORS.success
                  : AI_COLORS.info;
            return (
              <ReAnimated.View key={i} entering={FadeInLeft.duration(400).delay(i * 80)}>
                <TouchableOpacity activeOpacity={0.8}>
                  <View
                    style={[
                      s.oppCard,
                      { borderColor: AI_COLORS.border, borderLeftColor: typeColor },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[s.oppIcon, { backgroundColor: `${typeColor}20` }]}>
                        <AntDesign
                          name={
                            (opp.type.includes('reload1')
                              ? 'creditcard'
                              : opp.type.includes('rest')
                                ? 'rest'
                                : 'wallet') as any
                          }
                          size={22}
                          color={typeColor}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.oppTitle}>{opp.title}</Text>
                        <Text style={s.oppDesc}>{opp.description}</Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <View style={[s.oppBadge, { backgroundColor: `${AI_COLORS.success}20` }]}>
                            <Text style={[s.oppBadgeText, { color: AI_COLORS.success }]}>
                              +₹{opp.monthlySavings}/mo
                            </Text>
                          </View>
                          <TouchableOpacity style={[s.oppAction, { backgroundColor: typeColor }]}>
                            <Text style={s.oppActionText}>{opp.actionLabel ?? 'Review'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
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
