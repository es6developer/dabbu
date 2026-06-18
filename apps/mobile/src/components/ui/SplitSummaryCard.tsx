import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Avatar } from './Avatar';

interface SplitMember {
  name: string;
  amount: number;
  isPaid?: boolean;
  avatarUrl?: string | null;
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
    equal: 'menufold',
    percentage: 'piechart',
    manual: 'edit',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
      <View style={styles.gradientBg}>
        <View style={styles.header}>
          <View style={[styles.methodBadge, { backgroundColor: `${colors.accent.primary}15` }]}>
            <AntDesign
              name={(methodIcons[splitMethod] || 'menufold') as any}
              size={12}
              color={colors.accent.primary}
            />
            <Text style={styles.methodText}>{splitMethod}</Text>
          </View>
          <Text style={[styles.totalLabel, { color: colors.text.tertiary }]}>Total</Text>
        </View>

        <Text style={[styles.totalAmount, { color: colors.accent.primary }]}>
          {fmt(totalAmount)}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

        <Text style={[styles.membersLabel, { color: colors.text.secondary }]}>
          Members ({members.length})
        </Text>

        {members.map((member, index) => (
          <View key={index} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Avatar uri={member.avatarUrl} name={member.name} size={32} />
              <Text style={[styles.memberName, { color: colors.text.primary }]}>{member.name}</Text>
            </View>
            <View style={styles.memberRight}>
              <Text style={[styles.memberAmount, { color: colors.text.primary }]}>
                {fmt(member.amount)}
              </Text>
              {member.isPaid !== undefined && (
                <AntDesign
                  name={(member.isPaid ? 'checkcircle' : 'clockcircleo') as any}
                  size={14}
                  color={member.isPaid ? '#34C759' : '#F59E0B'}
                />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
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
    color: '#F97316',
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
    color: '#F97316', // will be overridden by inline for theme support
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
    color: '#F97316',
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
