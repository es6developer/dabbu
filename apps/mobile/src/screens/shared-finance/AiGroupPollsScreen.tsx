import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  createdBy: { id: string; name: string };
  options: PollOption[];
  totalVotes: number;
  userVoted: boolean;
  userVotedOptionId?: string;
  createdAt: string;
  expiresAt?: string;
}

export function AiGroupPollsScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string } }, 'params'>>();
  const { groupId } = route.params;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [creating, setCreating] = useState(false);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const fetchPolls = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<Poll[]>(`/ai-insights/groups/${groupId}/polls`);
      setPolls(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load polls');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchPolls();
    }, [fetchPolls])
  );

  async function handleVote(pollId: string, optionId: string) {
    if (votingPollId) return;
    setVotingPollId(pollId);
    try {
      await api.post(`/ai-insights/polls/${pollId}/vote`, { optionId });
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        const updatedOptions = p.options.map(o => ({
          ...o,
          voteCount: o.id === optionId ? o.voteCount + 1 : o.id === p.userVotedOptionId ? Math.max(0, o.voteCount - 1) : o.voteCount,
          percentage: 0,
        }));
        const totalVotes = updatedOptions.reduce((sum, o) => sum + o.voteCount, 0);
        return {
          ...p,
          userVoted: true,
          userVotedOptionId: optionId,
          totalVotes,
          options: updatedOptions.map(o => ({ ...o, percentage: totalVotes > 0 ? (o.voteCount / totalVotes) * 100 : 0 })),
        };
      }));
    } catch (err: any) {
      // ignore
    } finally {
      setVotingPollId(null);
    }
  }

  function addOptionField() {
    setNewOptions(prev => [...prev, '']);
  }

  function removeOptionField(index: number) {
    if (newOptions.length <= 2) return;
    setNewOptions(prev => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    setNewOptions(prev => prev.map((o, i) => i === index ? value : o));
  }

  async function handleCreatePoll() {
    if (!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2) return;
    setCreating(true);
    try {
      await api.post(`/ai-insights/groups/${groupId}/polls`, {
        question: newQuestion.trim(),
        options: newOptions.filter(o => o.trim()),
      });
      setShowCreateModal(false);
      setNewQuestion('');
      setNewOptions(['', '']);
      fetchPolls();
    } catch (err: any) {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  function renderPollItem(poll: Poll, index: number) {
    const maxVotes = Math.max(...poll.options.map(o => o.voteCount), 1);
    return (
      <Card key={poll.id} variant="elevated" padding="lg" style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
          <View style={[styles.pollBadge, { backgroundColor: colors.accent.primary + '15' }]}>
            <Text style={[typography.caption2, { color: colors.accent.primary, fontWeight: '700' }]}>
              Poll {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
              {poll.question}
            </Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
              by {poll.createdBy.name} · {poll.totalVotes} votes
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {poll.options.map(option => {
            const isSelected = poll.userVotedOptionId === option.id;
            const barWidth = poll.totalVotes > 0 ? (option.voteCount / poll.totalVotes) * 100 : 0;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionRow, { backgroundColor: colors.bg.tertiary, borderColor: isSelected ? colors.accent.primary : 'transparent' }]}
                onPress={() => {
                  if (!poll.userVoted) handleVote(poll.id, option.id);
                }}
                disabled={poll.userVoted || votingPollId === poll.id}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[typography.callout, { color: colors.text.primary }]}>
                      {option.text}
                    </Text>
                    <Text style={[typography.subheadBold, { color: isSelected ? colors.accent.primary : colors.text.secondary }]}>
                      {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: colors.bg.secondary }]}>
                    <View style={[styles.progressFill, { width: `${Math.max(barWidth, 2)}%`, backgroundColor: isSelected ? colors.accent.primary : colors.border.active }]} />
                  </View>
                  <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 2 }]}>
                    {barWidth.toFixed(0)}%
                  </Text>
                </View>
                {isSelected && (
                  <View style={{ marginLeft: 10 }}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {poll.expiresAt && (
          <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 12 }]}>
            Expires {new Date(poll.expiresAt).toLocaleDateString()}
          </Text>
        )}
      </Card>
    );
  }

  if (loading && !polls.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !polls.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchPolls()}
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
            onRefresh={() => fetchPolls(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Group Polls</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add-circle" size={28} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>

        {polls.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.text.tertiary} />
            <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: spacing.md }]}>
              No polls yet
            </Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>
              Create one to get everyone's opinion
            </Text>
            <TouchableOpacity
              style={[styles.createFirstBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 6 }]}>Create Poll</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pollsList}>
            {polls.map((poll, index) => renderPollItem(poll, index))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={[typography.calloutBold, { color: colors.text.tertiary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[typography.h4, { color: colors.text.primary }]}>Create Poll</Text>
              <TouchableOpacity
                onPress={handleCreatePoll}
                disabled={creating || !newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.accent.primary} />
                ) : (
                  <Text style={[typography.calloutBold, {
                    color: (newQuestion.trim() && newOptions.filter(o => o.trim()).length >= 2) ? colors.accent.primary : colors.text.tertiary,
                  }]}>
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={[typography.subhead, { color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                Question
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={newQuestion}
                onChangeText={setNewQuestion}
                placeholder="What do you want to ask?"
                placeholderTextColor={colors.text.tertiary}
                multiline
              />

              <Text style={[typography.subhead, { color: colors.text.secondary, marginTop: 24, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                Options
              </Text>
              {newOptions.map((option, index) => (
                <View key={index} style={styles.optionInputRow}>
                  <View style={[styles.optionDot, { backgroundColor: colors.accent.primary }]}>
                    <Text style={[typography.caption2, { color: '#FFFFFF', fontWeight: '700' }]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.optionInput, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                    value={option}
                    onChangeText={(text) => updateOption(index, text)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  {newOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removeOptionField(index)} style={{ padding: 8 }}>
                      <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addOptionBtn, { borderColor: colors.accent.primary }]}
                onPress={addOptionField}
              >
                <Ionicons name="add" size={18} color={colors.accent.primary} />
                <Text style={[typography.calloutBold, { color: colors.accent.primary, marginLeft: 6 }]}>
                  Add Option
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
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
  createFirstBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  pollsList: { paddingHorizontal: 20, marginTop: 8 },
  pollBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  input: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, fontWeight: '500' },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  optionDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionInput: { flex: 1 },
  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4,
  },
});
