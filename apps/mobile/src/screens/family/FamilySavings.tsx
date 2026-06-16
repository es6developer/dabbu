import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { ProfileBubble } from '../../components/ui/ProfileBubble';

const FAMILY_MEMBERS = [
  { name: 'Karthik', role: 'You', saved: 320000 },
  { name: 'Priya', role: 'Spouse', saved: 280000 },
  { name: 'Ananya', role: 'Sister', saved: 150000 },
  { name: 'Rajesh', role: 'Father', saved: 100000 },
];

const GOAL_TOTAL = 1200000;
const GOAL_SAVED = 850000;
const GOAL_PCT = (GOAL_SAVED / GOAL_TOTAL) * 100;

function fmt(v: number) {
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function FamilySavings() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* ── Header ──────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold" style={{ color: colors.text.primary }}>
            Family Savings
          </Text>
          <TouchableOpacity
            onPress={() => {}}
            activeOpacity={0.7}
            className="px-3.5 py-1.5 rounded-full"
            style={{ backgroundColor: colors.brand.light }}
          >
            <Text className="text-[12px] font-semibold" style={{ color: colors.brand.primary }}>
              + Invite
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Progress Card ──────────────────── */}
        <View className="mx-5">
          <Card variant="highlight" padding="xl">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className="text-[13px] font-semibold tracking-wide"
                style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#6D28D9' }}
              >
                FAMILY GOAL
              </Text>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
              >
                <Text className="text-[11px] font-bold" style={{ color: colors.brand.primary }}>
                  {GOAL_PCT.toFixed(0)}%
                </Text>
              </View>
            </View>

            <Text
              className="font-bold mt-1"
              style={{
                fontSize: 32,
                lineHeight: 38,
                color: isDark ? '#FFFFFF' : '#0F172A',
              }}
            >
              {fmt(GOAL_TOTAL)}
            </Text>
            <Text
              className="text-[12px] font-medium mt-1"
              style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#7C3AED' }}
            >
              {fmt(GOAL_SAVED)} saved · {fmt(GOAL_TOTAL - GOAL_SAVED)} remaining
            </Text>

            {/* Progress bar */}
            <View
              className="mt-5 h-3 rounded-full overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(139, 92, 246, 0.12)',
              }}
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${GOAL_PCT}%`, backgroundColor: colors.brand.primary }}
              />
            </View>

            {/* Contributor avatars */}
            <View className="flex-row items-center mt-4 gap-2">
              {FAMILY_MEMBERS.slice(0, 4).map((m, i) => (
                <View
                  key={m.name}
                  className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  <ProfileBubble name={m.name} size={18} />
                  <Text
                    className="text-[10px] font-semibold"
                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#6D28D9' }}
                  >
                    {m.saved > 0 ? `${((m.saved / GOAL_SAVED) * 100).toFixed(0)}%` : '0%'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* ── Member Breakdown ─────────────────────── */}
        <View className="mx-5 mt-6">
          <Text className="text-[17px] font-bold mb-3" style={{ color: colors.text.primary }}>
            Members
          </Text>

          {FAMILY_MEMBERS.map((member, i) => {
            const memberPct = (member.saved / GOAL_SAVED) * 100;
            return (
              <Card key={member.name} variant="default" padding="lg" style={{ marginBottom: 10 }}>
                <View className="flex-row items-center">
                  <ProfileBubble name={member.name} size={40} />
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-[14px] font-semibold"
                      style={{ color: colors.text.primary }}
                    >
                      {member.name}
                    </Text>
                    <Text
                      className="text-[11px] font-medium mt-0.5"
                      style={{ color: colors.text.tertiary }}
                    >
                      {member.role} · {fmt(member.saved)}
                    </Text>
                  </View>
                  <View
                    className="px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: colors.brand.light }}
                  >
                    <Text className="text-[11px] font-bold" style={{ color: colors.brand.primary }}>
                      {memberPct.toFixed(0)}%
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-3 h-1.5 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(139, 92, 246, 0.08)',
                  }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${memberPct}%`,
                      backgroundColor: colors.brand.primary,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                </View>
              </Card>
            );
          })}
        </View>

        {/* ── Quick Top-Up ─────────────────────────── */}
        <View className="mx-5 mt-2 mb-8">
          <Card variant="default" padding="xl">
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.status.successLight }}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.status.success} />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold" style={{ color: colors.text.primary }}>
                  Quick Top-Up
                </Text>
                <Text
                  className="text-[11px] font-medium mt-0.5"
                  style={{ color: colors.text.tertiary }}
                >
                  Add funds to reach your family goal faster
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
