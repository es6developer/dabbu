import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useLifeEventStore } from '../../store/lifeEventStore';

import { alertService } from "../../components/ui";
import { PremiumGate } from '../../components/ui/PremiumGate';
const WEDDING_BUDGETS = [
  { label: 'Intimate (50 guests)', cost: 500000 },
  { label: 'Medium (150 guests)', cost: 1500000 },
  { label: 'Grand (300+ guests)', cost: 3000000 },
  { label: 'Luxury Wedding', cost: 5000000 },
];

const SAVING_TIMELINES = [6, 12, 18, 24];

function fmt(v: number) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

export function WeddingPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [budget, setBudget] = useState('');
  const [saved, setSaved] = useState('0');
  const [timeline, setTimeline] = useState(12);
  const [result, setResult] = useState<{
    monthlySaving: number;
    totalBudget: number;
    gap: number;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  const calculate = () => {
    const b = parseFloat(budget) || 0;
    const s = parseFloat(saved) || 0;
    if (b <= 0) return;
    const gap = b - s;
    const monthly = gap / timeline;
    setResult({ monthlySaving: monthly, totalBudget: b, gap });
  };

  const createWeddingPlan = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const space = await api.post<any>('/spaces', { name: 'Wedding', type: 'WEDDING', icon: 'heart' });
      const spaceId = space?.data?.id;
      if (spaceId) {
        await api.post<any>('/goals', {
          name: 'Wedding Fund',
          targetAmount: result?.totalBudget || parseFloat(budget) || 500000,
          spaceId,
          type: 'wedding',
        });
      }
      const eventStore = useLifeEventStore.getState();
      await eventStore.createEvent({
        eventType: 'WEDDING',
        title: 'Wedding',
        description: `Wedding planned with budget of ₹${(result?.totalBudget || 0).toLocaleString('en-IN')}`,
        spaceId,
        source: 'planner_created',
      });
      alertService.alert('Wedding Plan Created', 'Your Wedding Space, Goal, and Life Event have been created. Start saving today!', [
        { text: 'View Plan', onPress: () => navigation?.navigate('LifeEventsList') },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      alertService.alert('Error', e?.message || 'Failed to create wedding plan');
    } finally {
      setCreating(false);
    }
  };

  return (
    <PremiumGate featureKey="investment_tracker">
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>💍 Wedding Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24, marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 8 }}>Wedding Size</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {WEDDING_BUDGETS.map((w) => (
              <TouchableOpacity
                key={w.label}
                onPress={() => setBudget(String(w.cost))}
                style={{
                  paddingHorizontal: 18, paddingVertical: 8, borderRadius: 24,
                  backgroundColor: budget === String(w.cost) ? colors.accent.primary : colors.bg.tertiary,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: budget === String(w.cost) ? '#fff' : colors.text.secondary }}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Budget (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
            placeholder="e.g. 1500000"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Already Saved (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={saved}
            onChangeText={setSaved}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Timeline to Wedding (months)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SAVING_TIMELINES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTimeline(t)}
                style={{ flex: 1, backgroundColor: timeline === t ? colors.accent.primary : colors.bg.tertiary, paddingVertical: 10, borderRadius: 24, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: timeline === t ? '#fff' : colors.text.primary }}>{t}mo</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={calculate}
            style={{ backgroundColor: colors.accent.primary, borderRadius: 28, paddingVertical: 18, alignItems: 'center', marginTop: 24 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Calculate</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 20 }}>Wedding Plan</Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Total Budget</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>{fmt(result.totalBudget)}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Monthly Saving Needed</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.status.success }}>{fmt(result.monthlySaving)}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Gap</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: result.gap > 0 ? colors.status.warning : colors.status.success }}>{fmt(result.gap)}</Text>
            </View>
            <TouchableOpacity
              onPress={createWeddingPlan}
              style={{ backgroundColor: colors.accent.primary, borderRadius: 28, paddingVertical: 18, alignItems: 'center', marginTop: 14 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Create Wedding Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
    </PremiumGate>
  );
}
