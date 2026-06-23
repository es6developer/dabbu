import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { ProfileBubble } from '../../components/ui/ProfileBubble';
import { api } from '../../services/api';

function fmt(v: number) {
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function FamilySavings() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [members, setMembers] = useState<any[]>([]);
  const [goalTotal, setGoalTotal] = useState(0);
  const [goalSaved, setGoalSaved] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/family-space/dashboard').then((res: any) => {
      const d = res?.data || res || {};
      if (!mounted) return;
      const savedByMember = d.savedByMember || {};
      const memberList = (d.members || []).map((m: any) => ({
        name: m.firstName || m.name || 'Member',
        role: m.role || 'Member',
        saved: savedByMember[m.id] || 0,
      }));
      setMembers(memberList);
      setGoalTotal(d.goalTotal || 0);
      setGoalSaved(d.goalSaved || 0);
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const goalPct = goalTotal > 0 ? (goalSaved / goalTotal) * 100 : 0;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* ── Header ──────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <AntDesign  name="left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold" style={{ color: colors.text.primary }}>
            Family Savings
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('FamilySpace')}
            activeOpacity={0.7}
            className="px-3.5 py-1.5 rounded-full"
            style={{ backgroundColor: colors.brand.light }}
          >
            <Text className="text-[12px] font-semibold" style={{ color: colors.accent.primary }}>
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
                style={{ color: isDark ? 'rgba(255,255,255,0.7)' : colors.accent.hover }}
              >
                FAMILY GOAL
              </Text>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)' }}
              >
                <Text className="text-[11px] font-bold" style={{ color: colors.accent.primary }}>
                  {goalPct.toFixed(0)}%
                </Text>
              </View>
            </View>

            <Text
              className="font-bold mt-1"
              style={{
                fontSize: 32,
                lineHeight: 38,
                color: isDark ? '#FFFFFF' : colors.text.primary,
              }}
            >
              {fmt(goalTotal)}
            </Text>
            <Text
              className="text-[12px] font-medium mt-1"
              style={{ color: isDark ? 'rgba(255,255,255,0.55)' : colors.accent.primary }}
            >
              {fmt(goalSaved)} saved · {fmt(goalTotal - goalSaved)} remaining
            </Text>

            {/* Progress bar */}
            <View
              className="mt-5 h-3 rounded-full overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(124, 58, 237, 0.12)',
              }}
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${goalPct}%`, backgroundColor: colors.accent.primary }}
              />
            </View>

            {/* Contributor avatars */}
            <View className="flex-row items-center mt-4 gap-2">
              {members.slice(0, 4).map((m, i) => (
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
                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : colors.accent.hover }}
                  >
                    {m.saved > 0 ? `${((m.saved / goalSaved) * 100).toFixed(0)}%` : '0%'}
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

          {members.map((member, i) => {
            const memberPct = goalSaved > 0 ? (member.saved / goalSaved) * 100 : 0;
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
                    <Text className="text-[11px] font-bold" style={{ color: colors.accent.primary }}>
                      {memberPct.toFixed(0)}%
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-3 h-1.5 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124, 58, 237, 0.08)',
                  }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${memberPct}%`,
                      backgroundColor: colors.accent.primary,
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
                <AntDesign  name="pluscircleo" size={24} color={colors.status.success} />
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
              <AntDesign  name="right" size={18} color={colors.text.tertiary} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
