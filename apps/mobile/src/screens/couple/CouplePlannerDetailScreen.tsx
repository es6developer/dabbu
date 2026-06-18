import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradePrompt } from '../../components/ui/UpgradePrompt';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { usePremium } from '../../store/PremiumContext';

const PLANNER_META: Record<string, { icon: string; color: string; title: string; badge: string }> = {
  BABY: { icon: 'smileo', color: '#FF8A65', title: 'Baby Planner', badge: 'PREMIUM' },
  HOUSE: { icon: 'home', color: '#60A5FA', title: 'House Planner', badge: 'PREMIUM' },
  CAR: { icon: 'car', color: '#34C759', title: 'Car Planner', badge: 'PREMIUM' },
  RETIREMENT: { icon: 'Safety', color: '#5AC8FA', title: 'Retirement Planner', badge: 'PREMIUM' },
};

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ fontSize: 13, color: colors.text.secondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color || colors.text.primary }}>{value}</Text>
    </View>
  );
}

function ProgressSection({ current, target, label }: { current: number; target: number; label: string }) {
  const { colors } = useTheme();
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }}>{pct}%</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.bg.tertiary, borderRadius: 4 }}>
        <View style={{ width: `${pct}%`, height: 8, backgroundColor: colors.accent.primary, borderRadius: 4 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: colors.status.success }}>Current: \u20B9{current.toLocaleString('en-IN')}</Text>
        <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Target: \u20B9{target.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

function AffordabilityGauge({ score }: { score: number }) {
  const { colors } = useTheme();
  const color = score >= 80 ? colors.status.success : score >= 60 ? colors.status.warning : colors.status.error;
  return (
    <View style={{ alignItems: 'center', padding: 16 }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: color,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color }}>{score}</Text>
      </View>
      <Text style={{ fontSize: 11, color }}>{score >= 80 ? 'Affordable' : score >= 60 ? 'Moderate' : 'Stretch'}</Text>
    </View>
  );
}

export function CouplePlannerDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { checkEntitlement } = usePremium();
  const { plannerType } = route.params || {};
  const meta = PLANNER_META[plannerType] || { icon: 'flag', color: colors.text.tertiary, title: 'Planner', badge: '' };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planner, setPlanner] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchPlanner = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get<any>(`/couple/planners/${plannerType.toLowerCase()}`);
      setPlanner(res);
      setError('');
    } catch (e: any) {
      if (e?.status === 404) setError('No planner yet');
      else setError('Failed to load planner');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [plannerType]);

  useEffect(() => { fetchPlanner(); }, [fetchPlanner]);

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPlanner(true)} tintColor={colors.accent.primary} />}
    >
      <View style={{ backgroundColor: colors.bg.secondary, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.tertiary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AntDesign  name="left" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{meta.title}</Text>
          </View>
          {meta.badge === 'PREMIUM' && (
            <View style={{ backgroundColor: colors.brand.light, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent.primary }}>{meta.badge}</Text>
            </View>
          )}
        </View>
      </View>

      {!checkEntitlement('advanced_ai').allowed && meta.badge === 'PREMIUM' ? (
        <UpgradePrompt feature={meta.title} />
      ) : error ? (
        <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
          <AntDesign name={meta.icon as any} size={48} color={meta.color} style={{ opacity: 0.5 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>No {meta.title} Yet</Text>
          <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center' }}>
            Set up your {meta.title.toLowerCase()} to get personalized projections and recommendations.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: meta.color, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 }}
            onPress={() => {
              navigation.navigate('CouplePlannerForm', { plannerType });
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      ) : planner ? (
        <View style={{ padding: 20 }}>
          {/* Summary Card */}
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 16, backgroundColor: `${meta.color}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AntDesign name={meta.icon as any} size={24} color={meta.color} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{meta.title}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                  {planner.status === 'active' ? 'Active' : planner.status}
                </Text>
              </View>
            </View>

            {planner.targetAmount > 0 && (
              <ProgressSection
                current={Number(planner.currentSavings || 0)}
                target={Number(planner.targetAmount)}
                label="Overall Progress"
              />
            )}

            {/* Affordability (House/Car) */}
            {planner.affordabilityScore != null && (
              <AffordabilityGauge score={planner.affordabilityScore} />
            )}
          </View>

          {/* Key Stats */}
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Projections</Text>
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.default }}>
              {Object.entries(planner.metadata || planner).map(([key, val]) => {
                if (typeof val === 'object' || val === null || val === undefined) return null;
                if (['id', 'groupId', 'plannerType', 'status', 'createdAt', 'updatedAt', 'startedAt', 'completedAt', 'metadata'].includes(key)) return null;
                if (['currentSavings', 'targetAmount', 'monthlyTarget'].includes(key)) return null;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                const v = typeof val === 'number'
                  ? (key.includes('Rate') || key.includes('Score') || key === 'downPaymentPercent' || key === 'emiToIncomeRatio' || key === 'inflationRate' || key === 'expectedReturns')
                    ? `${Number(val)}${key.includes('Rate') || key === 'inflationRate' || key === 'expectedReturns' ? '%' : ''}`
                    : `\u20B9${Number(val).toLocaleString('en-IN')}`
                  : String(val);
                return <StatRow key={key} label={label} value={v} />;
              })}
            </View>
          </View>

          {/* Refresh / Edit */}
          <TouchableOpacity
            style={{
              backgroundColor: meta.color, borderRadius: 16, padding: 16,
              alignItems: 'center', marginTop: 8,
            }}
            onPress={() => {
              navigation.navigate('CouplePlannerForm', { plannerType });
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
              {planner.targetAmount ? 'Update Planner' : 'Create Planner'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}
