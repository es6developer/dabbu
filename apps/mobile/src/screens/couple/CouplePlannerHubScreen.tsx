import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';

const PLANNERS = [
  {
    type: 'BABY', title: 'Baby Planner', subtitle: 'Plan for your growing family',
    icon: 'happy-outline', color: '#FF8A65', gradient: ['#FF8A6520', '#161224'],
    fields: ['Expected Timeline', 'Current Savings', 'Monthly Income', 'Hospital Type'],
  },
  {
    type: 'HOUSE', title: 'House Planner', subtitle: 'Own your dream home together',
    icon: 'home-outline', color: '#60A5FA', gradient: ['#60A5FA20', '#161224'],
    fields: ['Property Price', 'Down Payment', 'Interest Rate', 'Loan Tenure'],
  },
  {
    type: 'CAR', title: 'Car Planner', subtitle: 'Drive your dream car',
    icon: 'car-outline', color: '#34C759', gradient: ['#34C75920', '#161224'],
    fields: ['Car Price', 'Down Payment', 'Interest Rate', 'Loan Tenure'],
  },
  {
    type: 'RETIREMENT', title: 'Retirement Planner', subtitle: 'Secure your future together',
    icon: 'umbrella-outline', color: '#A78BFA', gradient: ['#A78BFA20', '#161224'],
    fields: ['Current Age', 'Retirement Age', 'Monthly Expense', 'Current Corpus'],
  },
];

function PlannerCard({ planner, onPress, progress }: {
  planner: typeof PLANNERS[0]; onPress: () => void; progress: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: '#161224', borderRadius: 20, padding: 20, marginBottom: 12,
        shadowColor: planner.color, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{
          width: 48, height: 48, borderRadius: 16, backgroundColor: `${planner.color}20`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={planner.icon as any} size={24} color={planner.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>{planner.title}</Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{planner.subtitle}</Text>
          <View style={{ height: 4, backgroundColor: '#1E293B', borderRadius: 2, marginTop: 10 }}>
            <View style={{
              width: `${Math.min(progress, 100)}%`, height: 4,
              backgroundColor: planner.color, borderRadius: 2,
            }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#64748B' }}>{planner.fields.length} inputs needed</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: planner.color }}>
              {progress > 0 ? `${Math.round(progress)}% complete` : 'Not started'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
}

export function CouplePlannerHubScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [planners, setPlanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlanners = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get<any[]>('/couple/planners');
      setPlanners(Array.isArray(res) ? res : []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPlanners(); }, [fetchPlanners]);

  const getProgress = (type: string) => {
    const pl = planners.find((p: any) => p.plannerType === type);
    if (!pl) return 0;
    const target = Number(pl.targetAmount || 0);
    const current = Number(pl.currentSavings || 0);
    return target > 0 ? (current / target) * 100 : 5;
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0D0B1A' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPlanners(true)} tintColor="#8B5CF6" />}
    >
      <LinearGradient colors={['#1a1428', '#0D0B1A']} style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: '#1E293B',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>Life Planners</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Plan your biggest life decisions together</Text>
          </View>
        </View>
      </LinearGradient>

      <UpgradeBanner
        variant="inline"
        message="Upgrade to Premium for detailed projections, affordability scores, and AI-powered recommendations."
      />

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 14 }}>
          Financial Life Planners
        </Text>

        {PLANNERS.map((pl) => (
          <PlannerCard
            key={pl.type}
            planner={pl}
            progress={getProgress(pl.type)}
            onPress={() => navigation.navigate('CouplePlannerDetail', { plannerType: pl.type })}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 12 }}>
          Dream Boards
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CouplePlanners')}
          style={{
            backgroundColor: '#161224', borderRadius: 16, padding: 16,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}
        >
          <View style={{
            width: 44, height: 44, borderRadius: 14, backgroundColor: '#8B5CF620',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="sparkles-outline" size={22} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Custom Dream Boards</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Create boards for any goal - vacation, wedding, or anything else
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
