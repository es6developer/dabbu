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
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing } from '../../theme';
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
  const [showCreate, setShowCreate] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalType, setGoalType] = useState('savings');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalMonthly, setGoalMonthly] = useState('');
  const [goalNotes, setGoalNotes] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreateGoal() {
    if (!goalName.trim()) {
      Alert.alert('Error', 'Goal name is required');
      return;
    }
    const target = parseFloat(goalTarget);
    if (!target || target <= 0) {
      Alert.alert('Error', 'Target amount must be greater than 0');
      return;
    }
    setCreating(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const payload: any = {
        name: goalName.trim(),
        targetAmount: target,
        type: goalType,
      };
      if (goalDeadline.trim()) {
        payload.deadline = goalDeadline.trim();
      }
      if (goalMonthly.trim()) {
        payload.monthlyContribution = parseFloat(goalMonthly) || undefined;
      }
      if (goalNotes.trim()) {
        payload.notes = goalNotes.trim();
      }
      await api.post('/goals', payload);
      setShowCreate(false);
      setGoalName('');
      setGoalTarget('');
      setGoalType('savings');
      setGoalDeadline('');
      setGoalMonthly('');
      setGoalNotes('');
      loadGoals();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  }

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
      <BaseScreen>
        <View style={{ paddingHorizontal: 24, gap: 16, paddingTop: spacing.sm }}>
          <Skeleton width={120} height={16} />
          <Skeleton width="100%" height={100} borderRadius={20} />
          <Skeleton width="100%" height={70} borderRadius={16} />
          <Skeleton width="100%" height={70} borderRadius={16} />
          <Skeleton width="80%" height={70} borderRadius={16} />
          <Skeleton width="100%" height={70} borderRadius={16} />
          <Skeleton width="55%" height={70} borderRadius={16} />
        </View>
      </BaseScreen>
    );
  }

  return (
    <>
    <BaseScreen noPadding>
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
          goals.length === 0
            ? styles.emptyContainer
            : { paddingBottom: insets.bottom + 100, paddingHorizontal: spacing.lg }
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <PageHeader
              title="Goals"
              subtitle="Family Finance"
            />
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
          <EmptyState
            icon="trophy-outline"
            title="No goals yet"
            message="Set a financial goal — save for a vacation, emergency fund, or anything that matters"
            actionLabel="Create Goal"
            onAction={() => setShowCreate(true)}
          />
        }
      />
    </BaseScreen>

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Create Goal</Text>

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Goal Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={goalName}
                onChangeText={setGoalName}
                placeholder="e.g. Emergency Fund"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Target Amount (₹)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={goalTarget}
                onChangeText={setGoalTarget}
                placeholder="500000"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Type</Text>
              <View style={styles.typeRow}>
                {['savings', 'investment', 'debt', 'custom'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }, goalType === t && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary }]}
                    onPress={() => setGoalType(t)}
                  >
                    <Text style={[styles.typeBtnText, { color: colors.text.tertiary }, goalType === t && { color: '#FFF' }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Deadline (optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={goalDeadline}
                onChangeText={setGoalDeadline}
                placeholder="2026-12-31"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Monthly Contribution (optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={goalMonthly}
                onChangeText={setGoalMonthly}
                placeholder="50000"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle, height: 80, textAlignVertical: 'top' }]}
                value={goalNotes}
                onChangeText={setGoalNotes}
                placeholder="Any notes..."
                placeholderTextColor={colors.text.tertiary}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={handleCreateGoal}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalBtnText}>Create Goal</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.bg.tertiary }]}
                  onPress={() => setShowCreate(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.lg },

  overallCard: { marginHorizontal: spacing.lg, borderRadius: 20, padding: 18, marginBottom: spacing.lg, gap: 10 },
  overallTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  overallPct: { fontSize: 22, fontWeight: '800' },
  overallTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  overallFill: { height: '100%', borderRadius: 999 },
  overallStats: { flexDirection: 'row', justifyContent: 'space-between' },
  overallStat: { fontSize: 12, fontWeight: '500' },

  card: { marginHorizontal: spacing.lg, marginBottom: 10, borderRadius: 20, padding: 16, gap: 12 },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeBtnText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
