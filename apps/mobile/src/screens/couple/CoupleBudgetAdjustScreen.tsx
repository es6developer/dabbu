import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

import { alertService } from "../../components/ui";
export function CoupleBudgetAdjustScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/budgets');
      const data = (res as any)?.data || res || [];
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      const adj: Record<string, string> = {};
      list.forEach((c: any) => { adj[c.id] = String(c.amount || ''); });
      setAdjustments(adj);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(adjustments).map(([id, amount]) =>
          amount ? api.patch(`/budgets/${id}`, { amount: parseFloat(amount) }) : Promise.resolve()
        ),
      );
      alertService.alert('Budget Updated', 'Your budget adjustments have been saved.');
      navigation.goBack();
    } catch (e: any) {
      alertService.alert('Error', e?.message || 'Failed to save adjustments');
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
          <Text style={[s.title, { color: colors.text.primary }]}>Adjust Budget</Text>
        </View>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor={colors.accent.primary} />}>
          {categories.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <AntDesign name="piechart" size={48} color={colors.text.tertiary} />
              <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600', marginTop: 12 }}>No budgets yet</Text>
              <Text style={{ color: colors.text.tertiary, marginTop: 4 }}>Create a budget first to adjust it</Text>
            </View>
          ) : categories.map((cat) => (
            <View key={cat.id} style={{ backgroundColor: colors.bg.card, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>{cat.name || cat.category}</Text>
              <TextInput
                style={{ backgroundColor: colors.bg.tertiary, borderRadius: 10, padding: 12, fontSize: 15, fontWeight: '700', color: colors.text.primary }}
                value={adjustments[cat.id] || ''}
                onChangeText={(t) => setAdjustments((prev) => ({ ...prev, [cat.id]: t }))}
                keyboardType="decimal-pad"
                placeholder="Amount"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          ))}
          {categories.length > 0 && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{ backgroundColor: colors.accent.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Save Adjustments</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
});
