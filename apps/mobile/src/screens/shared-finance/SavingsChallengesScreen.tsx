import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface ChallengeParticipant {
  id: string;
  name: string;
  savedAmount: number;
  avatar?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  savedAmount: number;
  startDate: string;
  endDate: string;
  joined: boolean;
  completed: boolean;
  participantCount: number;
  currentStreak: number;
  currency: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  savedAmount: number;
  rank: number;
}

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export function SavingsChallengesScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<{ [key: string]: LeaderboardEntry[] }>({});
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<{ [key: string]: boolean }>({});
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingChallenge, setCompletingChallenge] = useState<Challenge | null>(null);
  const [savedAmount, setSavedAmount] = useState('');
  const [completionNote, setCompletionNote] = useState('');

  const fetchChallenges = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<Challenge[]>('/ai-insights/savings-challenges');
      setChallenges(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChallenges();
    }, [fetchChallenges])
  );

  async function handleJoin(challengeId: string) {
    setJoiningId(challengeId);
    try {
      await api.post(`/ai-insights/savings-challenges/${challengeId}/join`);
      setChallenges(prev => prev.map(c =>
        c.id === challengeId ? { ...c, joined: true, participantCount: c.participantCount + 1 } : c
      ));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join challenge');
    } finally {
      setJoiningId(null);
    }
  }

  async function handleComplete() {
    if (!completingChallenge || !savedAmount.trim() || parseFloat(savedAmount) <= 0) return;
    setCompletingId(completingChallenge.id);
    try {
      await api.post(`/ai-insights/savings-challenges/${completingChallenge.id}/complete`, {
        savedAmount: parseFloat(savedAmount),
        note: completionNote.trim() || undefined,
      });
      setChallenges(prev => prev.map(c =>
        c.id === completingChallenge.id ? {
          ...c,
          completed: true,
          savedAmount: c.savedAmount + parseFloat(savedAmount),
        } : c
      ));
      setShowCompleteModal(false);
      setSavedAmount('');
      setCompletionNote('');
      setCompletingChallenge(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete challenge');
    } finally {
      setCompletingId(null);
    }
  }

  async function fetchLeaderboard(challengeId: string) {
    if (loadingLeaderboard[challengeId]) return;
    setLoadingLeaderboard(prev => ({ ...prev, [challengeId]: true }));
    try {
      const res = await api.get<LeaderboardEntry[]>(`/ai-insights/savings-challenges/${challengeId}/leaderboard`);
      setLeaderboardData(prev => ({ ...prev, [challengeId]: res }));
    } catch {
      // ignore
    } finally {
      setLoadingLeaderboard(prev => ({ ...prev, [challengeId]: false }));
    }
  }

  function toggleLeaderboard(challengeId: string) {
    if (expandedLeaderboard === challengeId) {
      setExpandedLeaderboard(null);
    } else {
      setExpandedLeaderboard(challengeId);
      if (!leaderboardData[challengeId]) {
        fetchLeaderboard(challengeId);
      }
    }
  }

  if (loading && !challenges.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !challenges.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchChallenges()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchChallenges(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Savings Challenges</Text>
          <View style={{ width: 24 }} />
        </View>

        {challenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color={colors.text.tertiary} />
            <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: spacing.md }]}>
              No challenges available
            </Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4, textAlign: 'center' }]}>
              Check back later for new savings challenges
            </Text>
          </View>
        ) : (
          <View style={styles.challengesList}>
            {challenges.map(challenge => {
              const progress = challenge.targetAmount > 0
                ? (challenge.savedAmount / challenge.targetAmount) * 100
                : 0;
              const daysLeft = Math.max(0, Math.ceil(
                (new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              ));
              const isExpanded = expandedLeaderboard === challenge.id;
              const lbEntries = leaderboardData[challenge.id];

              return (
                <Card key={challenge.id} variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
                  <View style={styles.challengeHeader}>
                    <View style={[styles.challengeIcon, { backgroundColor: colors.accent.primary + '15' }]}>
                      <Ionicons name="trophy" size={22} color={colors.accent.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
                        {challenge.title}
                      </Text>
                      <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
                        {daysLeft} days left · {challenge.participantCount} participants
                      </Text>
                    </View>
                    {challenge.completed && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.status.successLight }]}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
                      </View>
                    )}
                  </View>

                  <Text style={[typography.callout, { color: colors.text.secondary, marginTop: 10, lineHeight: 20 }]}>
                    {challenge.description}
                  </Text>

                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <Text style={[typography.subheadBold, { color: colors.accent.primary }]}>
                        {formatAmount(challenge.savedAmount, challenge.currency)}
                      </Text>
                      <Text style={[typography.subhead, { color: colors.text.tertiary }]}>
                        of {formatAmount(challenge.targetAmount, challenge.currency)}
                      </Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
                      <View style={[styles.progressFill, {
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: progress >= 100 ? colors.status.success : colors.accent.primary,
                      }]} />
                    </View>
                    <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 4, textAlign: 'right' }]}>
                      {progress.toFixed(1)}%
                    </Text>
                  </View>

                  {challenge.currentStreak > 0 && (
                    <View style={[styles.streakRow, { backgroundColor: colors.accent.primary + '10' }]}>
                      <Ionicons name="flame" size={16} color={colors.accent.primary} />
                      <Text style={[typography.subheadBold, { color: colors.accent.primary, marginLeft: 6 }]}>
                        {challenge.currentStreak} day streak
                      </Text>
                    </View>
                  )}

                  <View style={styles.challengeActions}>
                    {!challenge.joined && !challenge.completed ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
                        onPress={() => handleJoin(challenge.id)}
                        disabled={joiningId === challenge.id}
                      >
                        {joiningId === challenge.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Join Challenge</Text>
                        )}
                      </TouchableOpacity>
                    ) : challenge.joined && !challenge.completed ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.status.success }]}
                        onPress={() => {
                          setCompletingChallenge(challenge);
                          setShowCompleteModal(true);
                        }}
                      >
                        <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Log Savings</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.actionBtn, { backgroundColor: colors.status.successLight }]}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
                        <Text style={[typography.buttonSmall, { color: colors.status.success, marginLeft: 6 }]}>
                          Completed
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.leaderboardToggle, { backgroundColor: colors.bg.glassLight }]}
                      onPress={() => toggleLeaderboard(challenge.id)}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'people-outline'}
                        size={18}
                        color={colors.text.secondary}
                      />
                      <Text style={[typography.subheadBold, { color: colors.text.secondary, marginLeft: 4 }]}>
                        {isExpanded ? 'Hide' : 'Leaderboard'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isExpanded && (
                    <View style={[styles.leaderboardSection, { borderTopColor: colors.border.subtle }]}>
                      {loadingLeaderboard[challenge.id] ? (
                        <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginTop: 12 }} />
                      ) : lbEntries && lbEntries.length > 0 ? (
                        lbEntries.map((entry, index) => (
                          <View key={entry.id} style={[styles.leaderboardRow, index < lbEntries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle }]}>
                            <Text style={[typography.subheadBold, {
                              color: entry.rank <= 3 ? colors.accent.primary : colors.text.tertiary,
                              width: 28,
                            }]}>
                              #{entry.rank}
                            </Text>
                            <View style={[styles.leaderboardAvatar, { backgroundColor: colors.accent.primary + '20' }]}>
                              <Text style={[typography.caption2, { color: colors.accent.primary, fontWeight: '700' }]}>
                                {entry.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={[typography.callout, { color: colors.text.primary, flex: 1, marginLeft: 10 }]}>
                              {entry.name}
                            </Text>
                            <Text style={[typography.calloutBold, { color: colors.accent.primary }]}>
                              {formatAmount(entry.savedAmount)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 12, textAlign: 'center' }]}>
                          No entries yet
                        </Text>
                      )}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showCompleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[typography.h4, { color: colors.text.primary }]}>Log Savings</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            {completingChallenge && (
              <Text style={[typography.callout, { color: colors.text.secondary, marginBottom: 20 }]}>
                How much did you save for "{completingChallenge.title}"?
              </Text>
            )}
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
              value={savedAmount}
              onChangeText={setSavedAmount}
              placeholder="Amount saved"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle, marginTop: 12 }]}
              value={completionNote}
              onChangeText={setCompletionNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.text.tertiary}
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent.primary, opacity: !savedAmount.trim() || parseFloat(savedAmount) <= 0 ? 0.5 : 1 }]}
              onPress={handleComplete}
              disabled={!savedAmount.trim() || parseFloat(savedAmount) <= 0 || completingId !== null}
            >
              {completingId ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Log Savings</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  challengesList: { paddingHorizontal: 20, marginTop: 8 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center' },
  challengeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  completedBadge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  progressSection: { marginTop: 14 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  challengeActions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  leaderboardToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
  leaderboardSection: { marginTop: 14, borderTopWidth: 1, paddingTop: 10 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  leaderboardAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalInput: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, fontWeight: '500' },
  modalButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
});
