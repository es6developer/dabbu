import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { getCategoryIcon } from '../../config/categoryIcons';
import { Avatar } from './Avatar';

interface TransactionCardProps {
  name: string;
  amount: number;
  category: string;
  date: string;
  avatarUrl?: string | null;
  onPress?: () => void;
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
}: TransactionCardProps) {
  const { colors } = useTheme();
  const isExpense = amount < 0;
  const absAmount = Math.abs(amount);

  const iconName = getCategoryIcon(category, 'minuscirlceo');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Avatar uri={avatarUrl} name={name} size={36} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.category, { color: colors.text.tertiary }]}>{category}</Text>
          <View style={[styles.dot, { backgroundColor: colors.text.tertiary }]} />
          <Text style={[styles.category, { color: colors.text.tertiary }]}>{date}</Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: isExpense ? colors.text.primary : '#34C759' }]}>
        {isExpense ? '-' : '+'}
        {fmt(absAmount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F97316',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  category: {
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
  },
});
