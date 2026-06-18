import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { ProfileBubble } from '../../components/ui/ProfileBubble';
import { ReferralPill } from '../../components/ui/ReferralPill';
import { NotificationBell } from '../../components/ui/NotificationBell';
import { HeroCard } from '../../components/ui/HeroCard';
import { QuickActionBar } from '../../components/ui/QuickActionBar';
import { Card } from '../../components/ui/Card';

// ─── Mock Data ─────────────────────────────────────────────────
const MOCK_USER = { name: 'Karthik', initial: 'K' };
const MOCK_BALANCE = 845000;
const MOCK_INCOME = 125000;
const MOCK_EXPENSE = 82000;

const RECENT_TXNS = [
  { id: '1', name: 'Zomato Order', amount: -845, category: 'Food', date: 'Today' },
  { id: '2', name: 'Freelance Pay', amount: 25000, category: 'Income', date: 'Yesterday' },
  { id: '3', name: 'Electricity Bill', amount: -3200, category: 'Bills', date: '2 days ago' },
  { id: '4', name: 'Uber Ride', amount: -560, category: 'Travel', date: '2 days ago' },
  { id: '5', name: 'Rent Transfer', amount: -22000, category: 'Housing', date: '3 days ago' },
];

export function DashboardHub() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* ── Header ─────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <View className="flex-row items-center gap-3">
            <ProfileBubble name={MOCK_USER.name} size={42} onPress={() => {}} />
            <View>
              <Text
                className="text-[13px] font-medium leading-4"
                style={{ color: colors.text.secondary }}
              >
                Welcome back,
              </Text>
              <Text
                className="text-[17px] font-bold leading-5 mt-0.5"
                style={{ color: colors.text.primary }}
              >
                {MOCK_USER.name}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2.5">
            <ReferralPill onPress={() => {}} />
            <NotificationBell count={3} onPress={() => {}} />
          </View>
        </View>

        {/* ── Hero Card ──────────────────────────────── */}
        <HeroCard
          totalBalance={MOCK_BALANCE}
          monthlyIncome={MOCK_INCOME}
          monthlyExpense={MOCK_EXPENSE}
        />

        {/* ── Quick Actions ──────────────────────────── */}
        <View className="mt-5">
          <QuickActionBar
            actions={[
              { icon: 'pluscircle', label: 'Add Expense', onPress: () => navigation.navigate('Expense', { screen: 'AddExpense' }) },
              { icon: 'swap', label: 'Transfer', onPress: () => {} },
              { icon: 'team', label: 'Split', onPress: () => navigation.navigate('Circles', { screen: 'SplitExpense' }) },
              { icon: 'filetext1', label: 'Bills', onPress: () => navigation.navigate('Expense', { screen: 'BillsList' }) },
              { icon: 'linechart', label: 'Reports', onPress: () => navigation.navigate('Settings', { screen: 'Reports' }) },
            ]}
          />
        </View>

        {/* ── Quick Stats Grid ───────────────────────── */}
        <View className="flex-row mx-5 mt-5 gap-3">
          <Card variant="default" padding="lg" style={{ flex: 1 }}>
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.status.successLight }}
              >
                <AntDesign  name="down" size={18} color={colors.status.success} />
              </View>
              <View>
                <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                  Income
                </Text>
                <Text
                  className="text-[16px] font-bold mt-0.5"
                  style={{ color: colors.text.primary }}
                >
                  ₹{MOCK_INCOME.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </Card>

          <Card variant="default" padding="lg" style={{ flex: 1 }}>
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.status.errorLight }}
              >
                <AntDesign  name="up" size={18} color={colors.status.error} />
              </View>
              <View>
                <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                  Expenses
                </Text>
                <Text
                  className="text-[16px] font-bold mt-0.5"
                  style={{ color: colors.text.primary }}
                >
                  ₹{MOCK_EXPENSE.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* ── Recent Transactions ────────────────────── */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[17px] font-bold" style={{ color: colors.text.primary }}>
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Expense', { screen: 'ExpenseHome' })} activeOpacity={0.7}>
              <Text className="text-[13px] font-semibold" style={{ color: colors.accent.primary }}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          <Card variant="default" padding="md">
            {RECENT_TXNS.map((tx, i) => (
              <TouchableOpacity key={tx.id} onPress={() => {}} activeOpacity={0.7}>
                <View className="flex-row items-center py-2.5">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor:
                        tx.amount < 0 ? 'rgba(239, 68, 68, 0.10)' : 'rgba(16, 185, 129, 0.10)',
                    }}
                  >
                    <AntDesign
                      name={(tx.amount < 0 ? 'close' : 'plus') as any}
                      size={18}
                      color={tx.amount < 0 ? '#EF4444' : '#10B981'}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-[14px] font-semibold"
                      style={{ color: colors.text.primary }}
                    >
                      {tx.name}
                    </Text>
                    <Text
                      className="text-[11px] font-medium mt-0.5"
                      style={{ color: colors.text.tertiary }}
                    >
                      {((tx.category as any)?.name || tx.category || '')} · {tx.date}
                    </Text>
                  </View>
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: tx.amount < 0 ? colors.text.primary : '#10B981' }}
                  >
                    {tx.amount < 0 ? '' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                  </Text>
                </View>
                {i < RECENT_TXNS.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border.subtle,
                      marginLeft: 52,
                    }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* ── Family Savings Card ────────────────────── */}
        <View className="mx-5 mt-5 mb-8">
          <Card variant="highlight" padding="xl">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)' }}
                >
                  <AntDesign  name="team" size={22} color={colors.accent.primary} />
                </View>
                <View>
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#6D28D9' }}
                  >
                    Family Savings Goal
                  </Text>
                  <Text
                    className="text-[11px] font-medium mt-0.5"
                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#7C3AED' }}
                  >
                    4 members · 65% achieved
                  </Text>
                </View>
              </View>
              <AntDesign  name="right" size={18} color={colors.accent.primary} />
            </View>

            {/* Progress bar */}
            <View
              className="mt-4 h-2 rounded-full overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(124, 58, 237, 0.12)',
              }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: '65%',
                  backgroundColor: colors.accent.primary,
                }}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
