import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IconName = keyof typeof Ionicons.glyphMap;

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

const STREAK_ICONS: Record<string, IconName> = {
  daily: 'flame',
  weekly: 'calendar',
  monthly: 'calendar-number',
};

export function BadgeWallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [gamification, setGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {setRefreshing(true);}
      else {setLoading(true);}
      try {
        if (accessToken) {setAccessToken(accessToken);}
        const [gamRes, checkRes] = await Promise.all([
          api.get<any>('/gamification'),
          api.post<any>('/gamification/check'),
        ]);
        setGamification(gamRes?.data || gamRes);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton width={160} height={14} />
          <Skeleton width="100%" height={100} borderRadius={20} />
          <Skeleton width="100%" height={60} borderRadius={12} />
          <Skeleton width="100%" height={60} borderRadius={12} />
          <Skeleton width="100%" height={60} borderRadius={12} />
        </View>
      </View>
    );
  }

  const userBadges = gamification?.badges || [];
  const allBadges = gamification?.allBadges || [];
  const streaks = gamification?.streaks || [];
  const earnedCount = gamification?.earnedCount || 0;
  const totalBadges = gamification?.totalBadges || allBadges.length;

  const earned = userBadges.filter((b: any) => b.isEarned);
  const inProgress = userBadges.filter((b: any) => !b.isEarned);
  const unstarted = allBadges.filter(
    (b: any) => !userBadges.find((u: any) => u.badgeId === b.id),
  );

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      {/* Hero */}
      <LinearGradient
        colors={['#2D1B4E', '#1A0A2E']}
        style={[s.hero, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.heroRow}>
          <View style={s.heroBadgeWrap}>
            <Ionicons name="trophy" size={32} color="#FDCB6E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Achievements</Text>
            <Text style={s.heroSub}>
              {earnedCount} of {totalBadges} badges earned
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Streaks */}
      {streaks.length > 0 && (
        <View style={[s.section, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Streaks</Text>
          <View style={s.streakRow}>
            {streaks.map((s: any) => (
              <View key={s.id} style={[s.streakCard, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons
                  name={STREAK_ICONS[s.streakType] || 'flame'}
                  size={20}
                  color={s.currentStreak > 0 ? '#FDCB6E' : colors.text.tertiary}
                />
                <Text style={[s.streakValue, { color: colors.text.primary }]}>
                  {s.currentStreak}
                </Text>
                <Text style={[s.streakMeta, { color: colors.text.tertiary }]}>
                  {s.streakType}
                </Text>
                <Text style={[s.streakSub, { color: colors.text.tertiary }]}>
                  Best: {s.longestStreak}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Earned Badges */}
      {earned.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            Earned ({earned.length})
          </Text>
          <View style={s.badgeGrid}>
            {earned.map((ub: any) => {
              const b = ub.badge;
              const tierColor = TIER_COLORS[b.tier] || '#CD7F32';
              return (
                <View key={ub.id} style={[s.badgeCard, { backgroundColor: colors.bg.secondary }]}>
                  <View style={[s.badgeIconWrap, { backgroundColor: `${tierColor}25`, borderColor: tierColor }]}>
                    <Ionicons name={(b.icon || 'trophy') as IconName} size={24} color={tierColor} />
                  </View>
                  <Text style={[s.badgeName, { color: colors.text.primary }]}>{b.name}</Text>
                  <Text style={[s.badgeDesc, { color: colors.text.tertiary }]}>{b.description}</Text>
                  {ub.earnedAt && (
                    <Text style={[s.badgeDate, { color: colors.text.tertiary }]}>
                      {new Date(ub.earnedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                  <View style={[s.tierBadge, { backgroundColor: `${tierColor}25` }]}>
                    <Text style={[s.tierText, { color: tierColor }]}>{b.tier}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            In Progress ({inProgress.length})
          </Text>
          {inProgress.map((ub: any) => {
            const b = ub.badge;
            const progress = Number(ub.progress);
            const threshold = b.criteria?.threshold || 100;
            const pctVal = threshold > 0 ? (progress / threshold) * 100 : 0;
            return (
              <View key={ub.id} style={[s.progressCard, { backgroundColor: colors.bg.secondary }]}>
                <View style={s.progressTop}>
                  <View
                    style={[s.progressIcon, { backgroundColor: `${colors.text.tertiary}18` }]}
                  >
                    <Ionicons
                      name={(b.icon || 'trophy') as IconName}
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.progressName, { color: colors.text.primary }]}>{b.name}</Text>
                    <Text style={[s.progressDesc, { color: colors.text.tertiary }]}>
                      {b.description}
                    </Text>
                  </View>
                </View>
                <View style={[s.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${pctVal}%`, backgroundColor: colors.accent.primary },
                    ]}
                  />
                </View>
                <Text style={[s.progressStat, { color: colors.text.tertiary }]}>
                  {progress} / {threshold}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Unstarted Badges */}
      {unstarted.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            Available ({unstarted.length})
          </Text>
          <View style={s.badgeGrid}>
            {unstarted.map((b: any) => {
              const tierColor = TIER_COLORS[b.tier] || '#CD7F32';
              return (
                <View
                  key={b.id}
                  style={[s.badgeCard, s.badgeLocked, { backgroundColor: colors.bg.secondary }]}
                >
                  <View
                    style={[
                      s.badgeIconWrap,
                      { backgroundColor: `${colors.text.tertiary}12`, borderColor: 'transparent' },
                    ]}
                  >
                    <Ionicons
                      name={(b.icon || 'trophy') as IconName}
                      size={24}
                      color={colors.text.tertiary}
                    />
                  </View>
                  <Text style={[s.badgeName, { color: colors.text.tertiary }]}>{b.name}</Text>
                  <Text style={[s.badgeDesc, { color: colors.text.tertiary }]}>
                    {b.description}
                  </Text>
                  <View style={[s.tierBadge, { backgroundColor: `${tierColor}15` }]}>
                    <Text style={[s.tierText, { color: tierColor }]}>{b.tier}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {totalBadges === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={colors.text.tertiary} />
          <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No Badges Yet</Text>
          <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
            Complete goals, track expenses, and save money to earn achievements.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 28 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroBadgeWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(253,203,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },

  // Streaks
  streakRow: { flexDirection: 'row', gap: 10 },
  streakCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 4,
  },
  streakValue: { fontSize: 24, fontWeight: '800' },
  streakMeta: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  streakSub: { fontSize: 10 },

  // Badge Grid
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 6,
  },
  badgeLocked: { opacity: 0.6 },
  badgeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  badgeDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  badgeDate: { fontSize: 9, marginTop: 2 },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  tierText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // In Progress
  progressCard: { borderRadius: 16, padding: 14, marginBottom: 8 },
  progressTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  progressIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progressName: { fontSize: 13, fontWeight: '600' },
  progressDesc: { fontSize: 11, marginTop: 1 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressStat: { fontSize: 11, fontWeight: '500', marginTop: 4, textAlign: 'right' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
});
