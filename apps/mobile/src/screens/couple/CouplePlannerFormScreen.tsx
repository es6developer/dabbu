import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useLifeEventStore } from '../../store/lifeEventStore';

const PLANNER_CONFIG: Record<string, { type: string; icon: string; color: string }> = {
  House: { type: 'HOUSE', icon: 'home', color: '#F59E0B' },
  Baby: { type: 'BABY', icon: 'smileo', color: '#22C55E' },
  Car: { type: 'CAR', icon: 'car', color: '#3B82F6' },
  Education: { type: 'EDUCATION', icon: 'book', color: '#8B5CF6' },
  Vacation: { type: 'VACATION', icon: 'star', color: '#06B6D4' },
  Retirement: { type: 'RETIREMENT', icon: 'linechart', color: '#6366F1' },
};

export function CouplePlannerFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const plannerType: string = route.params?.plannerType || 'House';
  const cfg = PLANNER_CONFIG[plannerType] || PLANNER_CONFIG.House;

  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert('Enter target amount');
      return;
    }
    setSaving(true);
    try {
      const space = await api.post<any>('/spaces', { name: plannerType, type: cfg.type, icon: cfg.icon });
      const spaceId = space?.data?.id;
      if (spaceId) {
        await api.post<any>('/goals', {
          name: `${plannerType} Fund`,
          targetAmount: parseFloat(targetAmount),
          monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : undefined,
          spaceId,
          type: cfg.type.toLowerCase(),
        });
      }
      const eventStore = useLifeEventStore.getState();
      await eventStore.createEvent({
        eventType: cfg.type as any,
        title: plannerType,
        description: `${plannerType} plan with target of ₹${parseFloat(targetAmount).toLocaleString('en-IN')}`,
        spaceId,
        source: 'planner_created',
      });
      Alert.alert(`${plannerType} Plan Created`, 'Your Space, Goal, and Life Event are ready!', [
        { text: 'View', onPress: () => navigation.replace('LifeEventsList') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign name="left" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text.primary }]}>Configure {plannerType}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: cfg.color + '20', alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name={cfg.icon as any} size={28} color={cfg.color} />
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Target Amount (₹)</Text>
        <TextInput
          style={{ backgroundColor: colors.bg.card, borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '700', color: colors.text.primary }}
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="decimal-pad"
          placeholder="e.g. 500000"
          placeholderTextColor={colors.text.tertiary}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Monthly Contribution (₹, optional)</Text>
        <TextInput
          style={{ backgroundColor: colors.bg.card, borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
          value={monthlyContribution}
          onChangeText={setMonthlyContribution}
          keyboardType="decimal-pad"
          placeholder="e.g. 15000"
          placeholderTextColor={colors.text.tertiary}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Target Date (optional)</Text>
        <TextInput
          style={{ backgroundColor: colors.bg.card, borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
          value={deadline}
          onChangeText={setDeadline}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text.tertiary}
        />

        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving}
          style={{ backgroundColor: colors.accent.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 24 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Create {plannerType} Plan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
});
