import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useTheme } from '../../theme';

const LEVEL_COLORS: Record<string, string> = {
  'Platinum Couple': '#E2E8F0',
  'Gold Couple': '#F59E0B',
  'Silver Couple': '#94A3B8',
  'Bronze Couple': '#CD7F32',
};

const XP_PER_LEVEL = 1000;

const ACHIEVEMENTS_META: Record<string, { icon: string; desc: string }> = {
  first_expense: { icon: 'cart', desc: 'Add your first shared expense' },
  first_goal: { icon: 'flag', desc: 'Create your first goal' },
  first_bill: { icon: 'calendar', desc: 'Pay your first bill' },
  first_settle: { icon: 'cash', desc: 'Complete your first settlement' },
  streak_7: { icon: 'flame', desc: '7-day financial streak' },
  streak_30: { icon: 'flame', desc: '30-day financial streak' },
  milestone_50: { icon: 'star', desc: '50 combined transactions' },
  net_worth_1l: { icon: 'trending-up', desc: 'Reach \u20B91L net worth together' },
  planner_complete: { icon: 'checkmark-done', desc: 'Complete your first planner' },
};

function LevelProgress({ xp }: { xp: number }) {
  const { colors } = useTheme();
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const currentLevel = Math.floor(xp / XP_PER_LEVEL) + 1;

  const icons = ['🥉', '🥈', '🥇', '💎'];
  const label =
    currentLevel >= 4
      ? 'Platinum'
      : currentLevel === 3
        ? 'Gold'
        : currentLevel === 2
          ? 'Silver'
          : 'Bronze';

  return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 48, marginBottom: 8 }}>{icons[Math.min(currentLevel - 1, 3)]}</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>Level {currentLevel}</Text>
      <Text style={{ fontSize: 14, color: colors.accent.primary, fontWeight: '600', marginTop: 2 }}>
        {label} Couple
      </Text>
      <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
        {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to next level
      </Text>
      <View
        style={{
          width: '80%',
          height: 6,
          backgroundColor: colors.bg.tertiary,
          borderRadius: 3,
          marginTop: 10,
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: 6,
            backgroundColor: colors.accent.primary,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

function AchievementCard({ id, unlocked, data }: { id: string; unlocked: boolean; data: any }) {
  const { colors } = useTheme();
  const meta = ACHIEVEMENTS_META[id] || { icon: 'trophy', desc: id };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        opacity: unlocked ? 1 : 0.4,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: unlocked ? colors.brand.light : colors.bg.tertiary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={unlocked ? (meta.icon as any) : 'lock-closed'}
          size={18}
          color={unlocked ? colors.accent.primary : colors.text.tertiary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: unlocked ? colors.text.primary : colors.text.tertiary }}>
          {data?.name || meta.desc}
        </Text>
        {data?.unlockedAt && (
          <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 2 }}>
            Unlocked{' '}
            {new Date(data.unlockedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        )}
      </View>
      {unlocked && <Ionicons name="checkmark-circle-outline" size={18} color={colors.status.success} />}
    </View>
  );
}

export function CoupleGamificationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGamification = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get<any>('/couple/gamification');
      setData(res);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGamification();
  }, [fetchGamification]);

  if (loading) {
    return <LoadingScreen />;
  }

  const achievements: Record<string, any> = {};
  if (Array.isArray(data?.achievements)) {
    for (const ach of data.achievements) {
      achievements[ach.code] = ach;
    }
  } else if (data?.achievements && typeof data?.achievements === 'object') {
    Object.assign(achievements, data.achievements);
  }
  const levels = data?.levels || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchGamification(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.default,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>Couple Journey</Text>
        </View>
      </View>

      <LevelProgress xp={data?.xp || 0} />

      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
          Achievements
        </Text>
        <View style={{ gap: 8 }}>
          {Object.entries(ACHIEVEMENTS_META).map(([id, meta]) => (
            <AchievementCard
              key={id}
              id={id}
              unlocked={!!achievements[id]}
              data={achievements[id]}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
