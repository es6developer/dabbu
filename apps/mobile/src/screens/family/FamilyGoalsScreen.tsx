import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

interface Goal {
  id: string;
  name: string;
  category: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  completed: boolean;
  progress: number;
  aiPredictedDate?: string;
}

const TEMPLATES = [
  { icon: 'home', name: 'House', color: '#3B82F6' },
  { icon: 'book', name: 'Education', color: '#8B5CF6' },
  { icon: 'heart', name: 'Marriage', color: '#EC4899' },
  { icon: 'warning', name: 'Emergency', color: '#F59E0B' },
  { icon: 'car', name: 'Vehicle', color: '#10B981' },
  { icon: 'calendar', name: 'Retirement', color: '#6366F1' },
  { icon: 'flag', name: 'Vacation', color: '#06B6D4' },
  { icon: 'star', name: 'Custom', color: '#6B7280' },
];

const CATEGORY_COLORS: Record<string, string> = {
  House: '#3B82F6', Education: '#8B5CF6', Marriage: '#EC4899',
  'Emergency Fund': '#F59E0B', Emergency: '#F59E0B',
  Vehicle: '#10B981', Retirement: '#6366F1', Vacation: '#06B6D4',
  Custom: '#6B7280',
};

const CATEGORY_ICONS: Record<string, keyof typeof AntDesign.glyphMap> = {
  House: 'home', Education: 'book', Marriage: 'heart',
  'Emergency Fund': 'warning', Emergency: 'warning',
  Vehicle: 'car', Retirement: 'calendar', Vacation: 'flag',
  Custom: 'star',
};

const fmt = (amount: number) => {
  if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  return '₹' + amount.toLocaleString('en-IN');
};

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[skeleton.card, { backgroundColor: colors.bg.tertiary }]}>
      <View style={[skeleton.icon, { backgroundColor: colors.skeleton.base }]} />
      <View style={[skeleton.line, { width: '70%', backgroundColor: colors.skeleton.base, marginTop: 10 }]} />
      <View style={[skeleton.line, { width: '50%', backgroundColor: colors.skeleton.base, marginTop: 6 }]} />
      <View style={[skeleton.bar, { backgroundColor: colors.skeleton.base, marginTop: 12 }]} />
      <View style={[skeleton.line, { width: '40%', backgroundColor: colors.skeleton.base, marginTop: 8 }]} />
    </View>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { colors } = useTheme();
  const color = CATEGORY_COLORS[goal.category] || '#6B7280';
  const icon = CATEGORY_ICONS[goal.category] || 'star';
  const progress = Math.min(goal.progress, 100);

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.bg.tertiary }]}>
      <View style={[styles.goalIconWrap, { backgroundColor: color + '20' }]}>
        <AntDesign name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.goalName, { color: colors.text.primary }]} numberOfLines={1}>
        {goal.name}
      </Text>
      <View style={styles.goalAmountRow}>
        <Text style={[styles.goalTarget, { color: colors.text.tertiary }]}>
          {fmt(goal.targetAmount)}
        </Text>
        <Text style={[styles.goalDeadline, { color: colors.text.tertiary }]}>
          {goal.deadline}
        </Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.bg.elevated }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.goalBottom}>
        <Text style={[styles.goalSaved, { color: colors.text.secondary }]}>
          Saved {fmt(goal.savedAmount)}
        </Text>
        <Text style={[styles.goalPct, { color: colors.text.primary }]}>
          {progress.toFixed(0)}%
        </Text>
      </View>
      {goal.aiPredictedDate && (
        <View style={[styles.aiBadge, { backgroundColor: colors.brand.light }]}>
          <AntDesign name="star" size={10} color={colors.accent.primary} />
          <Text style={[styles.aiBadgeText, { color: colors.accent.primary }]}>
            AI: {goal.aiPredictedDate}
          </Text>
        </View>
      )}
    </View>
  );
}

function CompletedGoalRow({ goal }: { goal: Goal }) {
  const { colors } = useTheme();
  const color = CATEGORY_COLORS[goal.category] || '#6B7280';
  const icon = CATEGORY_ICONS[goal.category] || 'star';

  return (
    <View style={[styles.completedCard, { backgroundColor: colors.bg.tertiary }]}>
      <View style={[styles.completedIcon, { backgroundColor: colors.status.successLight }]}>
        <AntDesign name="checkcircle" size={18} color={colors.status.success} />
      </View>
      <View style={styles.completedInfo}>
        <Text style={[styles.completedName, { color: colors.text.primary }]}>{goal.name}</Text>
        <Text style={[styles.completedAmount, { color: colors.text.tertiary }]}>
          {fmt(goal.savedAmount)} saved
        </Text>
      </View>
      <View style={[styles.completedCat, { backgroundColor: color + '20' }]}>
        <AntDesign name={icon} size={14} color={color} />
      </View>
    </View>
  );
}

function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <AntDesign name="flag" size={52} color={colors.text.tertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No goals yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
        Start by creating a goal for your family
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
        onPress={onNavigate}
        activeOpacity={0.8}
      >
        <AntDesign name="plus" size={16} color="#FFFFFF" />
        <Text style={styles.emptyBtnText}>Create Your First Goal</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FamilyGoalsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const familyId = route?.params?.familyId;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      if (accessToken) setAccessToken(accessToken);
      let fid = familyId;
      if (!fid) {
        const families = await api.get<any[]>('/family');
        if (Array.isArray(families) && families.length > 0) {
          fid = families[0].id;
        }
      }
      const qs = fid ? `?familyId=${fid}` : '';
      const res = await api.get<any>(`/family/goals${qs}`);
      setGoals(Array.isArray(res) ? res : []);
    } catch {
      // error state handled by empty fallback
    }
  }, [familyId, accessToken]);

  useEffect(() => {
    fetchGoals().finally(() => setLoading(false));
  }, [fetchGoals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const handleNewGoal = () => {
    navigation?.navigate('CreateGoal', { familyId });
  };

  const handleTemplatePress = (template: string) => {
    navigation?.navigate('CreateGoal', { familyId, category: template });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Family Goals</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
      >
        {/* Templates */}
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Goal Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.name}
              style={[styles.templateChip, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => handleTemplatePress(t.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.templateIcon, { backgroundColor: t.color + '20' }]}>
                <AntDesign name={t.icon as keyof typeof AntDesign.glyphMap} size={18} color={t.color} />
              </View>
              <Text style={[styles.templateLabel, { color: colors.text.primary }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading skeleton */}
        {loading ? (
          <View style={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : goals.length === 0 ? (
          <EmptyState onNavigate={handleNewGoal} />
        ) : (
          <>
            {/* Active Goals */}
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>
              Active Goals ({activeGoals.length})
            </Text>
            {activeGoals.length === 0 ? (
              <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>
                No active goals
              </Text>
            ) : (
              <View style={styles.grid}>
                {activeGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </View>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text.secondary, marginTop: 8 }]}>
                  Completed ({completedGoals.length})
                </Text>
                {completedGoals.map((goal) => (
                  <CompletedGoalRow key={goal.id} goal={goal} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 24 }]}
        onPress={handleNewGoal}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  templatesScroll: {
    paddingLeft: 20,
    marginBottom: 24,
  },
  templateChip: {
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 80,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  templateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  goalCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  goalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  goalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTarget: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalDeadline: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalSaved: {
    fontSize: 11,
    fontWeight: '500',
  },
  goalPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completedInfo: {
    flex: 1,
  },
  completedName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  completedAmount: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedCat: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

const skeleton = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
});
