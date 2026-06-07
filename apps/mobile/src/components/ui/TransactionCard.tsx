import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface TransactionCardProps {
  name: string;
  amount: number;
  category: string;
  date: string;
  avatar?: string;
  onPress?: () => void;
}

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function TransactionCard({ name, amount, category, date, avatar, onPress }: TransactionCardProps) {
  const { colors } = useTheme();
  const isExpense = amount < 0;
  const absAmount = Math.abs(amount);

  const catIcons: Record<string, string> = {
    Food: 'fast-food-outline',
    Groceries: 'cart-outline',
    Travel: 'airplane-outline',
    Home: 'home-outline',
    Bills: 'receipt-outline',
    Internet: 'wifi-outline',
    Entertainment: 'film-outline',
    Medical: 'medkit-outline',
    Shopping: 'bag-outline',
    Education: 'school-outline',
  };

  const iconName = catIcons[category] || 'ellipse-outline';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bg.card }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: isExpense ? '#FF4D4F15' : '#34C75915' }]}>
        {avatar ? (
          <Text style={styles.avatarText}>{avatar[0]}</Text>
        ) : (
          <Ionicons
            name={iconName as any}
            size={18}
            color={isExpense ? '#FF4D4F' : '#34C759'}
          />
        )}
      </View>
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
      <Text style={[styles.amount, { color: isExpense ? '#FF4D4F' : '#34C759' }]}>
        {isExpense ? '-' : '+'}{fmt(absAmount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C3EF4',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
