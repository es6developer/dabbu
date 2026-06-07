import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

interface SplitMember {
  name: string;
  amount: number;
  isPaid?: boolean;
}

interface SplitSummaryCardProps {
  totalAmount: number;
  members: SplitMember[];
  splitMethod: string;
}

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function SplitSummaryCard({ totalAmount, members, splitMethod }: SplitSummaryCardProps) {
  const { colors } = useTheme();

  const methodIcons: Record<string, string> = {
    equal: 'reorder-three-outline',
    percentage: 'pie-chart-outline',
    manual: 'create-outline',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
      <LinearGradient
        colors={['#6C3EF410', '#8B5CF608']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <View style={styles.header}>
          <View style={[styles.methodBadge, { backgroundColor: '#6C3EF415' }]}>
            <Ionicons name={(methodIcons[splitMethod] || 'reorder-three-outline') as any} size={12} color="#6C3EF4" />
            <Text style={styles.methodText}>{splitMethod}</Text>
          </View>
          <Text style={[styles.totalLabel, { color: colors.text.tertiary }]}>Total</Text>
        </View>

        <Text style={styles.totalAmount}>{fmt(totalAmount)}</Text>

        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

        <Text style={[styles.membersLabel, { color: colors.text.secondary }]}>
          Members ({members.length})
        </Text>

        {members.map((member, index) => (
          <View key={index} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <View style={[styles.avatar, { backgroundColor: '#6C3EF415' }]}>
                <Text style={styles.avatarText}>{member.name[0]}</Text>
              </View>
              <Text style={[styles.memberName, { color: colors.text.primary }]}>{member.name}</Text>
            </View>
            <View style={styles.memberRight}>
              <Text style={[styles.memberAmount, { color: colors.text.primary }]}>
                {fmt(member.amount)}
              </Text>
              {member.isPaid !== undefined && (
                <Ionicons
                  name={member.isPaid ? 'checkmark-circle' : 'time-outline'}
                  size={14}
                  color={member.isPaid ? '#34C759' : '#F59E0B'}
                />
              )}
            </View>
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6C3EF4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gradientBg: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  methodText: {
    color: '#6C3EF4',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#6C3EF4',
    letterSpacing: -1,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  membersLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C3EF4',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
