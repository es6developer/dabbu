import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { Avatar } from './Avatar';

interface TransactionCardProps {
  name: string;
  amount: number;
  category: string;
  date: string;
  avatarUrl?: string | null;
  onPress?: () => void;
  compact?: boolean;
}

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function TransactionCard({
  name,
  amount,
  category,
  date,
  avatarUrl,
  onPress,
  compact = false,
}: TransactionCardProps) {
  const { colors } = useTheme();
  const isExpense = amount < 0;
  const absAmount = Math.abs(amount);

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: compact ? spacing.md : spacing.lg,
        paddingVertical: compact ? spacing.sm : spacing.md,
        borderRadius: borderRadius['2xl'],
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginBottom: spacing.xs,
        columnGap: compact ? spacing.sm : spacing.md,
      }}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${category}, ${fmt(absAmount)}`}
    >
      <Avatar uri={avatarUrl} name={name} size={compact ? 32 : 36} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: compact ? 12 : 14, fontWeight: '600', marginBottom: 1, color: colors.text.primary }} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: spacing.xs }}>
          <Text style={{ fontSize: compact ? 10 : 11, fontWeight: '500', color: colors.text.tertiary }}>{category}</Text>
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.text.tertiary }} />
          <Text style={{ fontSize: compact ? 10 : 11, fontWeight: '500', color: colors.text.tertiary }}>{date}</Text>
        </View>
      </View>
      <Text style={{ fontSize: compact ? 13 : 15, fontWeight: '800', color: isExpense ? colors.text.primary : '#34C759' }}>
        {isExpense ? '-' : '+'}
        {fmt(absAmount)}
      </Text>
    </TouchableOpacity>
  );
}
