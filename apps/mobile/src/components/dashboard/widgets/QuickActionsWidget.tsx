import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const defaultActionColors: Record<string, string> = {
  'Add Expense': '#DC2626',
  'Add Income': '#16A34A',
  'Create Goal': '#6366F1',
  'Create Budget': '#6366F1',
};

const actionIcons = {
  'Add Expense': 'remove-circle-outline',
  'Add Income': 'add-circle-outline',
  'Create Goal': 'flag-outline',
  'Create Budget': 'piechart',
} as const;

export function QuickActionsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { quickActions } = data || {};
  const actions = Array.isArray(quickActions)
    ? quickActions
    : ['Add Expense', 'Add Income', 'Create Goal', 'Create Budget'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="bulb1" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Quick Actions</Text>
      </View>
      <View style={styles.grid}>
        {actions.slice(0, 4).map((label: any, i: number) => {
          const lbl = typeof label === 'string' ? label : (label?.label || label?.name || `Action ${i + 1}`);
          const icon = (actionIcons as any)[lbl] || label?.icon || 'add-circle-outline';
          const color = defaultActionColors[lbl] || label?.color || '#6366F1';
          return (
            <View key={i} style={[styles.btn, { backgroundColor: colors.bg.tertiary }]}>
              <AntDesign name={icon} size={18} color={color} />
              <Text style={[styles.btnLabel, { color: colors.text.primary }]}>{lbl}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flex: 1, minWidth: '45%' },
  btnLabel: { fontSize: 12, fontWeight: '600' },
});
