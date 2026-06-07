import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

interface CircleCardProps {
  name: string;
  membersCount: number;
  totalExpenses: number;
  yourBalance: number;
  type: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const TYPE_CONFIG: Record<string, { icon: string; gradient: [string, string] }> = {
  couple: { icon: 'heart', gradient: ['#FF6B9D', '#FF8FB3'] },
  family: { icon: 'home', gradient: ['#6C3EF4', '#8B5CF6'] },
  friends: { icon: 'people', gradient: ['#00B894', '#00D9A6'] },
  roommates: { icon: 'business', gradient: ['#4F6EF7', '#7C8FF8'] },
  trip: { icon: 'airplane', gradient: ['#E85D04', '#FF8A3C'] },
  default: { icon: 'ellipse', gradient: ['#6C3EF4', '#8B5CF6'] },
};

export function CircleCard({ name, membersCount, totalExpenses, yourBalance, type, onPress, onLongPress }: CircleCardProps) {
  const { colors, isDark } = useTheme();
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.default;
  const isPositive = yourBalance >= 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.outer,
        {
          backgroundColor: colors.bg.card,
          borderColor: colors.border.default,
          shadowColor: isDark ? '#000000' : colors.border.subtle,
        },
      ]}
    >
      <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
        <View style={styles.coverOverlay}>
          <View style={styles.coverTop}>
            <View style={styles.typeBadge}>
              <Ionicons name={cfg.icon as any} size={12} color="#FFF" />
              <Text style={styles.typeLabel}>{type}</Text>
            </View>
          </View>
          <Text style={styles.coverName} numberOfLines={1}>{name}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Members</Text>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{membersCount}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Expenses</Text>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{fmt(totalExpenses)}</Text>
          </View>
        </View>

        <View style={[styles.balanceRow, { backgroundColor: isPositive ? colors.status.successLight : colors.status.errorLight }]}>
          <Ionicons
            name={isPositive ? 'arrow-down' : 'arrow-up'}
            size={12}
            color={isPositive ? colors.status.success : colors.status.error}
          />
          <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>
            Your balance
          </Text>
          <Text style={[styles.balanceValue, { color: isPositive ? colors.status.success : colors.status.error }]}>
            {isPositive ? '+' : '-'}{fmt(Math.abs(yourBalance))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cover: {
    height: 90,
  },
  coverOverlay: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  coverTop: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  coverName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    padding: 14,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
