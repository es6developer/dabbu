import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Expense, PersonalExpense } from '../types';

interface Props {
  expense: Expense | PersonalExpense;
  circleName?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#FF6B6B', Transport: '#4ECDC4', Shopping: '#45B7D1',
  Bills: '#96CEB4', Entertainment: '#FFEAA7', Health: '#DDA0DD',
  Education: '#98D8C8', Other: '#CCC',
};

export function ExpenseCard({ expense, circleName }: Props) {
  const catColor = CATEGORY_COLORS[expense.category] || '#CCC';
  const dateStr = 'date' in expense ? new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  return (
    <View style={s.card}>
      <View style={[s.dot, { backgroundColor: catColor }]} />
      <View style={s.center}>
        <Text style={s.amount}>₹{expense.amount.toLocaleString('en-IN')}</Text>
        <Text style={s.desc} numberOfLines={1}>{expense.description}</Text>
      </View>
      <View style={s.right}>
        <Text style={s.category}>{expense.category}</Text>
        {dateStr ? <Text style={s.date}>{dateStr}</Text> : null}
      </View>
      {circleName ? <Text style={s.circleBadge}>{circleName}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: 16, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#2A2A2A',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  center: { flex: 1 },
  amount: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  desc: { fontSize: 12, color: '#AAA', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  category: { fontSize: 11, fontWeight: '600', color: '#FFD700' },
  date: { fontSize: 10, color: '#666', marginTop: 2 },
  circleBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, fontSize: 9, fontWeight: '700', color: '#0A0A0A',
  },
});
