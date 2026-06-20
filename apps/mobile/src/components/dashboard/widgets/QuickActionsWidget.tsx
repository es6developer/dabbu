import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const actions = [
  {
    id: 'add_expense',
    label: 'Add Expense',
    icon: 'minuscircle' as const,
    color: '#DC2626',
    screen: 'AddExpense',
  },
  {
    id: 'add_income',
    label: 'Add Income',
    icon: 'pluscircle' as const,
    color: '#16A34A',
    screen: 'AddExpense?type=income',
  },
  {
    id: 'create_goal',
    label: 'Create Goal',
    icon: 'flag' as const,
    color: '#6366F1',
    screen: 'CoupleGoals',
  },
  {
    id: 'create_budget',
    label: 'Create Budget',
    icon: 'piechart' as const,
    color: '#F59E0B',
    screen: 'CoupleBudgets',
  },
  {
    id: 'add_savings',
    label: 'Add Savings',
    icon: 'save' as const,
    color: '#10B981',
    screen: 'CoupleSavings',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: 'clockcircleo' as const,
    color: '#EC4899',
    screen: 'CoupleTimeline',
  },
];

export function QuickActionsWidget({
  data,
  onPress: parentOnPress,
  onNavigate,
}: {
  data: any;
  onPress?: () => void;
  onNavigate?: (screen: string, params?: any) => void;
}) {
  const { colors, isDark } = useTheme();

  const handleAction = (action: (typeof actions)[0]) => {
    if (onNavigate) {
      const [screen, qs] = action.screen.split('?');
      const params: Record<string, any> = { mode: 'couple' };
      if (qs) {
        qs.split('&').forEach((p) => {
          const [k, v] = p.split('=');
          params[k] = v;
        });
      }
      onNavigate(screen, params);
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
        {actions.slice(0, 4).map((action) => (
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
