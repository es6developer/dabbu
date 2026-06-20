import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const typeIcons: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  house: 'home',
  car: 'car',
  vacation: 'earth',
  education: 'book',
  wedding: 'heart',
  emergency: 'warning',
  baby: 'smileo',
  retirement: 'pausecircleo',
  investment: 'linechart',
  savings: 'save',
  debt: 'creditcard',
  other: 'flag',
};

const typeColors: Record<string, string> = {
  house: '#6366F1',
  car: '#F59E0B',
  vacation: '#16A34A',
  education: '#3B82F6',
  wedding: '#EC4899',
  emergency: '#DC2626',
  baby: '#8B5CF6',
  retirement: '#6B7280',
  investment: '#10B981',
  savings: '#7C3AED',
  debt: '#EF4444',
  other: '#6B7280',
};

export function CoupleGoalsWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { coupleGoals } = data || {};
  const goals = Array.isArray(coupleGoals) ? coupleGoals : [];

  if (!goals.length) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[
          styles.card,
          { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
        ]}
      >
        <LinearGradient
          colors={isDark ? ['#F472B608', 'transparent'] : ['#F472B606', 'transparent']}
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
          <View style={[styles.iconBox, { backgroundColor: '#F472B615' }]}>
            <AntDesign name="flag" size={18} color="#F472B6" />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Couple Goals</Text>
        </View>
        <TouchableOpacity
          style={[styles.emptyCta, { borderColor: colors.border.subtle }]}
          onPress={onPress}
        >
          <AntDesign name="pluscircleo" size={18} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            Set your first couple goal
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={isDark ? ['#F472B608', 'transparent'] : ['#F472B606', 'transparent']}
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
        <View style={[styles.iconBox, { backgroundColor: '#F472B615' }]}>
          <AntDesign name="flag" size={18} color="#F472B6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Couple Goals</Text>
        </View>
        <AntDesign name="right" size={14} color={colors.text.tertiary} />
      </View>

      {goals.slice(0, 3).map((goal: any, i: number) => {
        const icon = typeIcons[goal.category || goal.type] || typeIcons.other;
        const color = typeColors[goal.category || goal.type] || '#6B7280';
        const progress = Math.min(
          100,
          Math.max(
            0,
            Number(
              goal.progress ??
                (goal.targetAmount > 0
                  ? Math.round((Number(goal.savedAmount || 0) / Number(goal.targetAmount)) * 100)
                  : 0),
            ),
          ),
        );
        return (
          <View
            key={goal.id || i}
            style={[
              styles.goalRow,
              i < goals.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border.subtle,
              },
            ]}
          >
            <View style={[styles.goalIcon, { backgroundColor: color + '15' }]}>
              <AntDesign name={icon} size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalName, { color: colors.text.primary }]} numberOfLines={1}>
                {goal.name || 'Goal'}
              </Text>
              <View style={styles.goalMeta}>
                <Text style={[styles.goalAmount, { color: colors.text.tertiary }]}>
                  {fmt(Number(goal.savedAmount || 0))} / {fmt(Number(goal.targetAmount || 0))}
                </Text>
              </View>
              <View style={[styles.goalBarBg, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[styles.goalBarFill, { width: `${progress}%`, backgroundColor: color }]}
                />
              </View>
            </View>
            <Text style={[styles.goalPct, { color }]}>{progress}%</Text>
          </View>
        );
      })}
    </TouchableOpacity>
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
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    marginTop: 4,
  },
  emptyText: { fontSize: 13, fontWeight: '500' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  goalMeta: { marginBottom: 4 },
  goalAmount: { fontSize: 11, fontWeight: '500' },
  goalBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 2 },
  goalPct: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
});
