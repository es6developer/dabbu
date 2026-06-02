import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOAL_ICONS: Record<string, string> = {
  emergency: 'shield-checkmark',
  vacation: 'airplane',
  education: 'school',
  home: 'home',
  car: 'car',
  wedding: 'heart',
  retirement: 'umbrella',
  custom: 'trophy',
};

const GOAL_COLORS: Record<string, string> = {
  emergency: '#FF6B6B',
  vacation: '#00B894',
  education: '#4F6EF7',
  home: '#E85D04',
  car: '#6C5CE7',
  wedding: '#FF6B9D',
  retirement: '#247BA0',
  custom: '#8A5CF6',
};

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function daysRemaining(dateStr: string | null): number | null {
  if (!dateStr) {
    return null;
  }
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function GoalsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadGoals();
  }, [accessToken]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [loading, fadeAnim]);

  async function loadGoals() {
    try {
      const res = await api.get<any>('/goals');
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setGoals(data);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.saved || g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target || g.targetAmount || 0), 0);
  const overallPct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  if (loading) {
    return (
      <View
        style={[
          styles.loading,
          {
            backgroundColor: colors.bg.primary,
            paddingTop: insets.top + 16,
            paddingHorizontal: 24,
            gap: 16,
          },
        ]}
      >
        <Skeleton width={120} height={16} />
        <Skeleton width="100%" height={100} borderRadius={20} />
        <Skeleton width="100%" height={70} borderRadius={16} />
        <Skeleton width="100%" height={70} borderRadius={16} />
        <Skeleton width="80%" height={70} borderRadius={16} />
        <Skeleton width="100%" height={70} borderRadius={16} />
        <Skeleton width="55%" height={70} borderRadius={16} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadGoals();
            }}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          goals.length === 0 ? styles.emptyContainer : { paddingBottom: insets.bottom + 100 }
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.text.tertiary }]}>Financial OS</Text>
                <Text style={[styles.title, { color: colors.text.primary }]}>Goals</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>
            {goals.length > 0 && (
              <LinearGradient
                colors={['#1A1A2E', '#16213E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.overallCard}
              >
                <View style={styles.overallTop}>
                  <Text style={[styles.overallLabel, { color: colors.text.tertiary }]}>
                    Overall Progress
                  </Text>
                  <Text style={[styles.overallPct, { color: colors.accent.primary }]}>
                    {Math.round(overallPct)}%
                  </Text>
                </View>
                <View style={[styles.overallTrack, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      styles.overallFill,
                      { width: `${overallPct}%`, backgroundColor: colors.accent.primary },
                    ]}
                  />
                </View>
                <View style={styles.overallStats}>
                  <Text style={[styles.overallStat, { color: colors.text.secondary }]}>
                    <Text style={{ color: colors.status.success }}>{fmt(totalSaved)}</Text> saved
                  </Text>
                  <Text style={[styles.overallStat, { color: colors.text.secondary }]}>
                    of {fmt(totalTarget)}
                  </Text>
                </View>
              </LinearGradient>
            )}
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const saved = Number(item.saved || item.currentAmount || 0);
          const target = Number(item.target || item.targetAmount || 0);
          const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
          const type = item.type || 'custom';
          const icon = GOAL_ICONS[type] || GOAL_ICONS.custom;
          const color = GOAL_COLORS[type] || GOAL_COLORS.custom;
          const daysLeft = daysRemaining(item.targetDate);
          const monthlyTarget = Number(item.monthlyContribution || 0);
          const monthlyPct =
            monthlyTarget > 0
              ? Math.min((monthlyTarget > saved ? saved / monthlyTarget : 1) * 100, 100)
              : 0;

          const milestones = [
            { label: '25%', reached: pct >= 25, color },
            { label: '50%', reached: pct >= 50, color },
            { label: '75%', reached: pct >= 75, color },
            { label: '100%', reached: pct >= 100, color },
          ];

          const entryAnim = useRef(new Animated.Value(0)).current;
          useEffect(() => {
            Animated.spring(entryAnim, {
              toValue: 1,
              delay: index * 60,
              useNativeDriver: true,
              friction: 8,
            }).start();
          }, []);

          return (
            <Animated.View
              style={{
                transform: [
                  {
                    translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                  },
                ],
                opacity: entryAnim,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {}}
                style={[styles.card, { backgroundColor: colors.bg.secondary }]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon as any} size={22} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text.primary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cardType, { color: colors.text.tertiary }]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.cardAmounts}>
                    <Text style={[styles.cardSaved, { color: colors.status.success }]}>
                      {fmt(saved)}
                    </Text>
                    <Text style={[styles.cardTarget, { color: colors.text.tertiary }]}>
                      of {fmt(target)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]}
                  />
                </View>

                <View style={styles.milestoneRow}>
                  {milestones.map((m, i) => (
                    <View
                      key={m.label}
                      style={[
                        styles.milestone,
                        m.reached
                          ? { backgroundColor: m.color + '25', borderColor: m.color + '40' }
                          : { backgroundColor: colors.bg.tertiary, borderColor: 'transparent' },
                      ]}
                    >
                      <Ionicons
                        name={m.reached ? 'checkmark-circle' : 'ellipse-outline'}
                        size={12}
                        color={m.reached ? m.color : colors.text.tertiary}
                      />
                      <Text
                        style={[
                          styles.milestoneLabel,
                          { color: m.reached ? m.color : colors.text.tertiary },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border.subtle }]}>
                  {daysLeft !== null && (
                    <View style={styles.footerItem}>
                      <Ionicons name="calendar-outline" size={13} color={colors.text.tertiary} />
                      <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                      </Text>
                    </View>
                  )}
                  {monthlyTarget > 0 && monthlyTarget !== undefined && (
                    <View style={styles.footerItem}>
                      <Ionicons name="repeat-outline" size={13} color={colors.text.tertiary} />
                      <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
                        ₹{monthlyTarget.toLocaleString('en-IN')}/mo
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.cardPct, { color }]}>{Math.round(pct)}%</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
              style={styles.emptyIcon}
            >
              <Ionicons name="trophy-outline" size={48} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No goals yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Set a financial goal — save for a vacation, emergency fund, or anything that matters
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.accent.primary }]}
              onPress={() => {}}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyCtaText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overallCard: { marginHorizontal: 24, borderRadius: 20, padding: 18, marginBottom: 16, gap: 10 },
  overallTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  overallPct: { fontSize: 22, fontWeight: '800' },
  overallTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  overallFill: { height: '100%', borderRadius: 999 },
  overallStats: { flexDirection: 'row', justifyContent: 'space-between' },
  overallStat: { fontSize: 12, fontWeight: '500' },

  card: { marginHorizontal: 24, marginBottom: 10, borderRadius: 20, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardType: { fontSize: 11, fontWeight: '500', marginTop: 1, textTransform: 'capitalize' },
  cardAmounts: { alignItems: 'flex-end' },
  cardSaved: { fontSize: 16, fontWeight: '700' },
  cardTarget: { fontSize: 12, fontWeight: '500', marginTop: 1 },

  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },

  milestoneRow: { flexDirection: 'row', gap: 6 },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  milestoneLabel: { fontSize: 10, fontWeight: '700' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, fontWeight: '500' },
  cardPct: { marginLeft: 'auto', fontSize: 13, fontWeight: '700' },

  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48, lineHeight: 20 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
