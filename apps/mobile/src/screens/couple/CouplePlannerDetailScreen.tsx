import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradePrompt } from '../../components/ui/UpgradePrompt';

const PLANNER_META: Record<string, { icon: string; color: string; title: string; badge: string }> = {
  BABY: { icon: 'happy-outline', color: '#FF8A65', title: 'Baby Planner', badge: 'PREMIUM' },
  HOUSE: { icon: 'home-outline', color: '#60A5FA', title: 'House Planner', badge: 'PREMIUM' },
  CAR: { icon: 'car-outline', color: '#34C759', title: 'Car Planner', badge: 'PREMIUM' },
  RETIREMENT: { icon: 'umbrella-outline', color: '#A78BFA', title: 'Retirement Planner', badge: 'PREMIUM' },
};

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ fontSize: 13, color: '#94A3B8' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color || '#FFF' }}>{value}</Text>
    </View>
  );
}

function ProgressSection({ current, target, label }: { current: number; target: number; label: string }) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, color: '#64748B' }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>{pct}%</Text>
      </View>
      <View style={{ height: 8, backgroundColor: '#1E293B', borderRadius: 4 }}>
        <View style={{ width: `${pct}%`, height: 8, backgroundColor: '#8B5CF6', borderRadius: 4 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: '#34C759' }}>Current: \u20B9{current.toLocaleString('en-IN')}</Text>
        <Text style={{ fontSize: 11, color: '#64748B' }}>Target: \u20B9{target.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

function AffordabilityGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#34C759' : score >= 60 ? '#F59E0B' : '#FF6B6B';
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
  const { plannerType } = route.params || {};
  const meta = PLANNER_META[plannerType] || { icon: 'flag-outline', color: '#64748B', title: 'Planner', badge: '' };

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

  const isPremium = false; // TODO: check user premium status

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0D0B1A' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPlanner(true)} tintColor="#8B5CF6" />}
    >
      <LinearGradient colors={['#1a1428', '#0D0B1A']} style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: '#1E293B',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>{meta.title}</Text>
          </View>
          {meta.badge === 'PREMIUM' && (
            <View style={{ backgroundColor: '#8B5CF620', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#8B5CF6' }}>{meta.badge}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {!isPremium && meta.badge === 'PREMIUM' ? (
        <UpgradePrompt feature={meta.title} />
      ) : error ? (
        <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
          <Ionicons name={meta.icon as any} size={48} color={meta.color} style={{ opacity: 0.5 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>No {meta.title} Yet</Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
            Set up your {meta.title.toLowerCase()} to get personalized projections and recommendations.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: meta.color, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 }}
            onPress={() => {
              navigation.navigate('CouplePlannerForm', { plannerType });
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      ) : planner ? (
        <View style={{ padding: 20 }}>
          {/* Summary Card */}
          <View style={{ backgroundColor: '#161224', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 16, backgroundColor: `${meta.color}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={meta.icon as any} size={24} color={meta.color} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>{meta.title}</Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
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
          <View style={{ backgroundColor: '#161224', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 8 }}>Projections</Text>
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1E293B' }}>
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
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
              {planner.targetAmount ? 'Update Planner' : 'Create Planner'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}
