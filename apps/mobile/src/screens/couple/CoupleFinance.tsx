import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { ProfileBubble } from '../../components/ui/ProfileBubble';

const TABS = ['Overview', 'Expenses', 'Balances'];

const SHARED_EXPENSES = [
  { name: 'Rent', amount: 22000, paidBy: 'You', date: '1 Jun' },
  { name: 'Groceries', amount: 5600, paidBy: 'Priya', date: '3 Jun' },
  { name: 'Electricity', amount: 3400, paidBy: 'You', date: '5 Jun' },
  { name: 'Dinner Out', amount: 2400, paidBy: 'Priya', date: '7 Jun' },
  { name: 'Netflix', amount: 649, paidBy: 'You', date: '10 Jun' },
];

function fmt(v: number) {
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CoupleFinance() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('Overview');

  const totalShared = 34049;
  const youPaid = 26049;
  const theyPaid = 8000;
  const balance = youPaid - theyPaid;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* ── Header ──────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-2">
          <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
            <AntDesign  name="left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold" style={{ color: colors.text.primary }}>
            Couple Space
          </Text>
          <TouchableOpacity
            onPress={() => {}}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.tertiary }}
          >
            <AntDesign  name="ellipsis1" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── Couple Avatar Row ──────────────────── */}
        <View className="items-center py-4">
          <View className="flex-row items-center -space-x-2">
            <View className="z-10">
              <ProfileBubble name="You" size={56} />
            </View>
            <View className="-ml-4">
              <ProfileBubble name="Priya" size={56} />
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 mt-2">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.status.success }}
            />
            <Text className="text-[13px] font-medium" style={{ color: colors.text.secondary }}>
              Connected · Shared since May 2026
            </Text>
          </View>
        </View>

        {/* ── Balance Card ────────────────────────── */}
        <View className="mx-5">
          <Card variant="highlight" padding="xl">
            <Text
              className="text-[12px] font-semibold tracking-wide text-center"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6D28D9' }}
            >
              TOTAL SHARED THIS MONTH
            </Text>
            <Text
              className="text-center font-bold mt-1"
              style={{
                fontSize: 34,
                lineHeight: 40,
                color: isDark ? '#FFFFFF' : '#0F172A',
              }}
            >
              {fmt(totalShared)}
            </Text>

            <View className="flex-row mt-5 gap-3">
              <View
                className="flex-1 items-center py-3 rounded-xl"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
                }}
              >
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#7C3AED' }}
                >
                  You paid
                </Text>
                <Text className="text-[18px] font-bold mt-1" style={{ color: '#10B981' }}>
                  {fmt(youPaid)}
                </Text>
              </View>
              <View
                className="flex-1 items-center py-3 rounded-xl"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
                }}
              >
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#7C3AED' }}
                >
                  They paid
                </Text>
                <Text className="text-[18px] font-bold mt-1" style={{ color: colors.text.primary }}>
                  {fmt(theyPaid)}
                </Text>
              </View>
            </View>

            {/* Settle up banner */}
            {balance > 0 && (
              <TouchableOpacity
                onPress={() => {}}
                activeOpacity={0.7}
                className="flex-row items-center justify-center mt-4 py-3 rounded-xl gap-2"
                style={{ backgroundColor: colors.status.successLight }}
              >
                <AntDesign  name="wallet" size={18} color={colors.status.success} />
                <Text className="text-[13px] font-bold" style={{ color: '#10B981' }}>
                  Settle Up · {fmt(balance)}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* ── Tab Bar ─────────────────────────────── */}
        <View className="mx-5 mt-6 mb-4">
          <View
            className="flex-row rounded-xl p-1"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bg.tertiary,
            }}
          >
            {TABS.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                  className="flex-1 py-2.5 rounded-xl items-center"
                  style={{
                    backgroundColor: isActive ? colors.brand.primary : 'transparent',
                  }}
                >
                  <Text
                    className="text-[13px] font-semibold"
                    style={{
                      color: isActive ? '#FFFFFF' : colors.text.secondary,
                    }}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Expenses List ────────────────────────── */}
        <View className="mx-5 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[15px] font-bold" style={{ color: colors.text.primary }}>
              Shared Expenses
            </Text>
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
              <Text className="text-[12px] font-semibold" style={{ color: colors.brand.primary }}>
                + Add
              </Text>
            </TouchableOpacity>
          </View>

          {SHARED_EXPENSES.map((exp, i) => {
            const isYou = exp.paidBy === 'You';
            return (
              <Card key={i} variant="default" padding="md" style={{ marginBottom: 8 }}>
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: isYou
                        ? 'rgba(139, 92, 246, 0.10)'
                        : 'rgba(16, 185, 129, 0.10)',
                    }}
                  >
                    <AntDesign
                      name={isYou ? 'user' : 'person'}
                      size={16}
                      color={isYou ? colors.brand.primary : colors.status.success}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-[14px] font-semibold"
                      style={{ color: colors.text.primary }}
                    >
                      {exp.name}
                    </Text>
                    <Text
                      className="text-[11px] font-medium mt-0.5"
                      style={{ color: colors.text.tertiary }}
                    >
                      Paid by {exp.paidBy} · {exp.date}
                    </Text>
                  </View>
                  <Text className="text-[15px] font-bold" style={{ color: colors.text.primary }}>
                    {fmt(exp.amount)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
