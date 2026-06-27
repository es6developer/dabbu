import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';
import { useLensStore } from '../../../store/lensStore';
import type { LensMode } from '../../../types';

interface QuickActionDef {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof AntDesign>['name'];
  color: string;
  screen: string;
  params?: Record<string, any>;
}

const PERSONAL_ACTIONS: QuickActionDef[] = [
  {
    id: 'add_expense',
    label: 'Add Expense',
    icon: 'minuscircle',
    color: '#DC2626',
    screen: 'AddExpense',
  },
  {
    id: 'add_income',
    label: 'Add Income',
    icon: 'pluscircle',
    color: '#16A34A',
    screen: 'AddExpense',
    params: { type: 'income' },
  },
  { id: 'create_goal', label: 'Create Goal', icon: 'flag', color: '#6366F1', screen: 'GoalsList' },
  {
    id: 'view_analytics',
    label: 'Analytics',
    icon: 'barschart',
    color: '#F59E0B',
    screen: 'Analytics',
  },
];

const PARTNERED_ACTIONS: QuickActionDef[] = [
  {
    id: 'add_shared_expense',
    label: 'Shared Expense',
    icon: 'addusergroup',
    color: '#F43F5E',
    screen: 'AddExpense',
    params: { type: 'shared' },
  },
  {
    id: 'add_shared_income',
    label: 'Shared Income',
    icon: 'pluscircle',
    color: '#22C55E',
    screen: 'AddExpense',
    params: { type: 'shared_income' },
  },
  {
    id: 'contribute_goal',
    label: 'Contribute Goal',
    icon: 'flag',
    color: '#F59E0B',
    screen: 'CoupleGoals',
  },
  { id: 'settle_balance', label: 'Settle', icon: 'swap', color: '#3B82F6', screen: 'Settlement' },
];

const FAMILY_ACTIONS: QuickActionDef[] = [
  {
    id: 'add_household_expense',
    label: 'Household Expense',
    icon: 'minuscircle',
    color: '#059669',
    screen: 'AddExpense',
    params: { type: 'family' },
  },
  { id: 'add_bill', label: 'Add Bill', icon: 'filetext1', color: '#F59E0B', screen: 'AddBill' },
  { id: 'add_goal', label: 'Add Goal', icon: 'flag', color: '#3B82F6', screen: 'GoalsList' },
  {
    id: 'record_allowance',
    label: 'Allowance',
    icon: 'gift',
    color: '#8B5CF6',
    screen: 'SpacesDashboard',
  },
];

const FULL_ACTIONS: QuickActionDef[] = [
  {
    id: 'add_expense',
    label: 'Add Expense',
    icon: 'minuscircle',
    color: '#DC2626',
    screen: 'AddExpense',
  },
  {
    id: 'create_space',
    label: 'Create Space',
    icon: 'team',
    color: '#D97706',
    screen: 'CreateSpace',
  },
  { id: 'add_goal', label: 'Add Goal', icon: 'flag', color: '#F59E0B', screen: 'GoalsList' },
  {
    id: 'add_investment',
    label: 'Add Investment',
    icon: 'linechart',
    color: '#3B82F6',
    screen: 'InvestmentPlanner',
  },
];

const LENS_ACTIONS: Record<LensMode, QuickActionDef[]> = {
  PERSONAL: PERSONAL_ACTIONS,
  PARTNERED: PARTNERED_ACTIONS,
  FAMILY: FAMILY_ACTIONS,
  FULL: FULL_ACTIONS,
};

export function QuickActionsWidget({
  onNavigate,
}: {
  data?: any;
  onPress?: () => void;
  onNavigate?: (screen: string, params?: any) => void;
}) {
  const { colors, isDark } = useTheme();
  const activeLens = useLensStore((s) => s.activeLens);
  const actions = LENS_ACTIONS[activeLens] || FULL_ACTIONS;

  const handleAction = (action: QuickActionDef) => {
    if (onNavigate) {
      onNavigate(action.screen, action.params);
    }
  };

  return (
    <View
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={
          isDark
            ? [colors.accent.primary + '06', 'transparent']
            : [colors.accent.primary + '04', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius['2xl'],
        }}
      />
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent.primary + '12' }]}>
          <AntDesign name={'appstore1' as any} size={18} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Quick Actions</Text>
      </View>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionBtn,
              { backgroundColor: action.color + '10', borderColor: action.color + '20' },
            ]}
            activeOpacity={0.7}
            onPress={() => handleAction(action)}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
              <AntDesign name={action.icon} size={18} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: '46%',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
});
