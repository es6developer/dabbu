import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { ProfileBubble } from '../../components/ui/ProfileBubble';
import { spacing } from '../../theme/design';

interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  from?: string;
  shared?: boolean;
}

const TXNS: Transaction[] = [
  { id: '1', name: 'Zomato Order', amount: -845, category: 'Food', date: 'Today', shared: true },
  { id: '2', name: 'Freelance Pay', amount: 25000, category: 'Income', date: 'Yesterday' },
  {
    id: '3',
    name: 'Electricity Bill',
    amount: -3200,
    category: 'Bills',
    date: '2 days ago',
    shared: true,
    from: 'Split · you paid ₹2,100',
  },
  { id: '4', name: 'Uber Ride', amount: -560, category: 'Travel', date: '2 days ago' },
  {
    id: '5',
    name: 'Rent Transfer',
    amount: -22000,
    category: 'Housing',
    date: '3 days ago',
    shared: true,
    from: 'Split · ₹11,000 each',
  },
  {
    id: '6',
    name: 'Groceries',
    amount: -4200,
    category: 'Food',
    date: '4 days ago',
    shared: true,
    from: 'Shared with Family',
  },
  { id: '7', name: 'Refund', amount: 1200, category: 'Misc', date: '5 days ago' },
];

const FILTERS = ['All', 'Income', 'Expense', 'Shared', 'Bills'];

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function TransactionsList() {
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* ── Header ──────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
            <AntDesign  name="left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold" style={{ color: colors.text.primary }}>
            Transactions
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => {}}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.tertiary }}
            >
              <AntDesign  name="search1" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {}}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.tertiary }}
            >
              <AntDesign  name="filter" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filter Pills ────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: spacing.lg }}
          className="mb-4"
        >
          {FILTERS.map((f) => {
            const isActive = f === activeFilter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive
                    ? colors.accent.primary
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : colors.bg.secondary,
                  borderWidth: 1,
                  borderColor: isActive
                    ? 'transparent'
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : colors.border.default,
                }}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isActive ? '#FFFFFF' : colors.text.secondary }}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Monthly Summary ─────────────────────── */}
        <View className="mx-5 mb-4">
          <Card variant="default" padding="lg">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[13px] font-medium" style={{ color: colors.text.secondary }}>
                June 2026
              </Text>
              <View className="flex-row items-center gap-1">
                <AntDesign  name="calendar" size={13} color={colors.text.tertiary} />
                <Text className="text-[11px] font-medium" style={{ color: colors.text.tertiary }}>
                  This Month
                </Text>
              </View>
            </View>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                  Income
                </Text>
                <Text className="text-[18px] font-bold mt-0.5" style={{ color: '#10B981' }}>
                  {fmt(124500)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                  Spent
                </Text>
                <Text
                  className="text-[18px] font-bold mt-0.5"
                  style={{ color: colors.text.primary }}
                >
                  {fmt(82300)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                  Saved
                </Text>
                <Text className="text-[18px] font-bold mt-0.5" style={{ color: '#10B981' }}>
                  {fmt(42200)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* ── Transaction List ─────────────────────── */}
        <View className="mx-5 mb-8">
          {TXNS.map((tx, i) => (
            <TouchableOpacity key={tx.id} onPress={() => {}} activeOpacity={0.7}>
              <Card variant="default" padding="md" style={{ marginBottom: spacing.lg }}>
                <View className="flex-row items-center">
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor:
                        tx.amount < 0 ? 'rgba(239, 68, 68, 0.10)' : 'rgba(16, 185, 129, 0.10)',
                    }}
                  >
                    <AntDesign
                      name={tx.amount < 0 ? 'down' : 'up'}
                      size={18}
                      color={tx.amount < 0 ? '#EF4444' : '#10B981'}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="text-[14px] font-semibold"
                        style={{ color: colors.text.primary }}
                      >
                        {tx.name}
                      </Text>
                      {tx.shared && (
                        <AntDesign  name="team" size={12} color={colors.accent.primary} />
                      )}
                    </View>
                    <Text
                      className="text-[11px] font-medium mt-0.5"
                      style={{ color: colors.text.tertiary }}
                    >
                      {((tx.category as any)?.name || tx.category || '')}
                      {tx.from ? ` · ${tx.from}` : ''}
                    </Text>
                  </View>
                  <Text
                    className="text-[15px] font-bold"
                    style={{
                      color: tx.amount < 0 ? colors.text.primary : '#10B981',
                    }}
                  >
                    {tx.amount < 0 ? '' : '+'}
                    {fmt(Math.abs(tx.amount))}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── FAB ────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => {}}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl items-center justify-center"
        style={{
          backgroundColor: colors.accent.primary,
          shadowColor: colors.accent.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <AntDesign  name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
