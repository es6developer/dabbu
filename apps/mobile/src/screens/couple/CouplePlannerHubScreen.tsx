import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { spacing, borderRadius, shadows } from '../../theme/design';

const PLANNERS = [
  {
    type: 'BABY', title: 'Baby Planner', subtitle: 'Plan for your growing family',
    icon: 'smileo', color: '#FF8A65', gradient: ['#FF8A6520', '#161224'],
    fields: ['Expected Timeline', 'Current Savings', 'Monthly Income', 'Hospital Type'],
  },
  {
    type: 'HOUSE', title: 'House Planner', subtitle: 'Own your dream home together',
    icon: 'home', color: '#60A5FA', gradient: ['#60A5FA20', '#161224'],
    fields: ['Property Price', 'Down Payment', 'Interest Rate', 'Loan Tenure'],
  },
  {
    type: 'CAR', title: 'Car Planner', subtitle: 'Drive your dream car',
    icon: 'car', color: '#34C759', gradient: ['#34C75920', '#161224'],
    fields: ['Car Price', 'Down Payment', 'Interest Rate', 'Loan Tenure'],
  },
  {
    type: 'RETIREMENT', title: 'Retirement Planner', subtitle: 'Secure your future together',
    icon: 'Safety', color: '#5AC8FA', gradient: ['#5AC8FA20', '#161224'],
    fields: ['Current Age', 'Retirement Age', 'Monthly Expense', 'Current Corpus'],
  },
];

function PlannerCard({ planner, onPress, progress }: {
  planner: typeof PLANNERS[0]; onPress: () => void; progress: number;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: colors.bg.primary, borderRadius: 20, padding: 20, marginBottom: 12,
        shadowColor: planner.color, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{
          width: 48, height: 48, borderRadius: 16, backgroundColor: `${planner.color}20`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AntDesign name={planner.icon as any} size={24} color={planner.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text.primary }}>{planner.title}</Text>
          <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>{planner.subtitle}</Text>
          <View style={{ height: 4, backgroundColor: colors.border.default, borderRadius: 2, marginTop: 10 }}>
            <View style={{
              width: `${Math.min(progress, 100)}%`, height: 4,
              backgroundColor: planner.color, borderRadius: 2,
            }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{planner.fields.length} inputs needed</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: planner.color }}>
              {progress > 0 ? `${Math.round(progress)}% complete` : 'Not started'}
            </Text>
          </View>
        </View>
        <AntDesign  name="right" size={18} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
}

export function CouplePlannerHubScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPlanners(true)} tintColor={colors.accent.primary} />}
    >
      <View style={{ backgroundColor: colors.bg.secondary, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.tertiary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AntDesign  name="left" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>Life Planners</Text>
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Plan your biggest life decisions together</Text>
          </View>
        </View>
      </View>

      <UpgradeBanner
        variant="inline"
        message="Upgrade to Premium for detailed projections, affordability scores, and AI-powered recommendations."
      />

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 14 }}>
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
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
          Dream Boards
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CouplePlanners')}
          style={{
            backgroundColor: colors.bg.primary, borderRadius: 16, padding: 16,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}
        >
          <View style={{
            width: 44, height: 44, borderRadius: 14, backgroundColor: `${colors.accent.primary}20`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AntDesign  name="star" size={22} color={colors.accent.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>Custom Dream Boards</Text>
            <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
              Create boards for any goal - vacation, wedding, or anything else
            </Text>
          </View>
        <AntDesign  name="right" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
