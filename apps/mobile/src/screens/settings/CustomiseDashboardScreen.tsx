import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useTheme } from '../../theme';
import { api, setAccessToken, getAccessToken } from '../../services/api';

const WIDGET_META: Record<string, { label: string; icon: string; desc: string }> = {
  balance: {
    label: 'Balance Panel',
    icon: 'wallet',
    desc: 'Account balance, income, expense summary',
  },
  quickActions: {
    label: 'Quick Actions',
    icon: 'bulb1',
    desc: 'Add Expense, Scan Bill, Split, Reminder',
  },
  financialHealth: {
    label: 'Financial Health',
    icon: 'heart',
    desc: 'Health score, factors, recommendations',
  },
  monthlySpending: {
    label: 'Monthly Spending',
    icon: 'piechart',
    desc: 'Category breakdown with bars',
  },
  savingsProgress: {
    label: 'Savings Progress',
    icon: 'wallet',
    desc: 'Overall savings bar and summary',
  },
  goals: {
    label: 'Goals',
    icon: 'star',
    desc: 'Individual goal progress cards',
  },
  upcomingBills: {
    label: 'Upcoming Bills',
    icon: 'filetext1',
    desc: 'Bills due within 15 days',
  },
  subscriptions: {
    label: 'Subscriptions',
    icon: 'creditcard',
    desc: 'Monthly/yearly subscription totals',
  },
  insights: {
    label: 'Smart Insights',
    icon: 'bulb1',
    desc: 'AI-powered spending insights',
  },
  gamification: {
    label: 'Achievements',
    icon: 'star',
    desc: 'Badges earned and activity streaks',
  },
  sharedCircles: {
    label: 'Shared Circles',
    icon: 'team',
    desc: 'Your shared finance groups',
  },
  familySummary: {
    label: 'Family Finance',
    icon: 'home',
    desc: 'Couple/family group summaries',
  },
  snapshots: { label: 'Snapshot Cards', icon: 'barchart', desc: 'Top spend & groups summary' },
  spaces: { label: 'Spaces', icon: 'appstore1', desc: 'Expense group spaces' },
  recentActivity: { label: 'Recent Activity', icon: 'clockcircleo', desc: 'Latest transactions' },
  features: { label: 'Features Grid', icon: 'appstore1', desc: 'App feature shortcuts' },
};

export function CustomiseDashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setAccessToken(getAccessToken());
    try {
      const res = await api.get<any>('/user/preferences');
      const layout = res?.dashboardLayout || [];
      setWidgets(layout.sort((a: any, b: any) => a.order - b.order));
    } catch {
      /* use defaults */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const layout = widgets.map((w, i) => ({ id: w.id, visible: w.visible, order: i }));
    try {
      await api.put('/user/preferences/dashboard', { layout });
      Alert.alert('Saved', 'Dashboard layout updated');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (index: number) => {
    setWidgets((prev) => prev.map((w, i) => (i === index ? { ...w, visible: !w.visible } : w)));
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<any>) => {
    const meta = WIDGET_META[item.id] || { label: item.id, icon: 'questioncircle', desc: '' };
    const idx = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.widgetItem,
            {
              backgroundColor: isActive ? colors.bg.tertiary : colors.bg.secondary,
              borderColor: isActive ? colors.accent.primary : colors.border.subtle,
              opacity: item.visible ? 1 : 0.5,
            },
          ]}
        >
          <AntDesign
             name="menufold"
            size={20}
            color={colors.text.tertiary}
            style={{ marginRight: 12 }}
          />
          <View style={[styles.widgetIcon, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign name={meta.icon as any} size={20} color={colors.accent.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.widgetLabel, { color: colors.text.primary }]}>{meta.label}</Text>
            <Text style={[styles.widgetDesc, { color: colors.text.tertiary }]}>{meta.desc}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleVisibility(idx)} style={styles.eyeBtn}>
            <AntDesign
              name={item.visible ? 'eye' : 'eyeo'}
              size={20}
              color={item.visible ? colors.accent.primary : colors.text.tertiary}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}
      >
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Customise Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
        Drag to reorder. Tap eye to show/hide.
      </Text>

      <DraggableFlatList
        data={widgets}
        onDragEnd={({ data }) => setWidgets(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, gap: 10 }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accent.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.saveText, { color: colors.text.primary }]}>Save Layout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, marginBottom: 8 },
  widgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  widgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  widgetLabel: { fontSize: 15, fontWeight: '700' },
  widgetDesc: { fontSize: 11, marginTop: 2 },
  eyeBtn: { padding: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '700' },
});
