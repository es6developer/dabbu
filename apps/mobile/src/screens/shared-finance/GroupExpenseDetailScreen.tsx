import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'fast-food-outline',
  transport: 'car-outline',
  accommodation: 'home-outline',
  utilities: 'flash-outline',
  entertainment: 'tv-outline',
  shopping: 'cart-outline',
  healthcare: 'medkit-outline',
  rent: 'key-outline',
  fuel: 'flame-outline',
  subscription: 'card-outline',
  household: 'layers-outline',
  other: 'ellipsis-horizontal-outline',
};

const SPLIT_COLORS = [
  '#f7892c',
  '#7c3aed',
  '#06b6d4',
  '#10b981',
  '#f43f5e',
  '#eab308',
  '#6366f1',
  '#ec4899',
];

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar?: string };
}

interface Share {
  memberId: string;
  memberName: string;
  amount: number;
  percentage?: number;
  settled: boolean;
}

interface Attachment {
  id: string;
  url: string;
  filename: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  splitType: string;
  date: string;
  notes?: string;
  paidBy: { id: string; name: string; avatar?: string };
  shares: Share[];
  comments: Comment[];
  attachments: Attachment[];
}

export function GroupExpenseDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId, expenseId } = route.params || {};

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadExpense();
  }, []);

  useEffect(() => {
    if (expense) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.headerBtn, { backgroundColor: colors.bg.glass }]}
            >
              <Ionicons name="create-outline" size={18} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.headerBtn, { backgroundColor: colors.status.errorLight }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [expense]);

  async function loadExpense() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/expenses/${expenseId}`);
      setExpense(res.data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load expense');
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    navigation.navigate('CreateGroupExpense', { groupId, expense });
  }

  async function handleDelete() {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/shared-finance/groups/${groupId}/expenses/${expenseId}`);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  async function handleAddComment() {
    if (!commentText.trim()) {
      return;
    }
    setCommenting(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>(
        `/shared-finance/groups/${groupId}/expenses/${expenseId}/comments`,
        { content: commentText.trim() },
      );
      setExpense((prev) => (prev ? { ...prev, comments: [...prev.comments, res.data] } : prev));
      setCommentText('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) {
      return `${diffHrs}h ago`;
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={{ color: colors.status.error, fontSize: 16 }}>Expense not found</Text>
      </View>
    );
  }

  const iconName = CATEGORY_ICONS[expense.category] || 'ellipsis-horizontal-outline';
  const settledShares = expense.shares?.filter((s) => s.settled).length || 0;
  const totalShares = expense.shares?.length || 1;
  const settledPercent = (settledShares / totalShares) * 100;
  const currentUserId = expense.paidBy?.id;
  const sharesSum = expense.shares?.reduce((sum, s) => sum + Number(s.amount ?? 0), 0) || 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.amountCard, { backgroundColor: colors.bg.tertiary }]}>
        <View style={[styles.glowRing, { backgroundColor: colors.accent.primary + '12' }]}>
          <View
            style={[styles.categoryIconWrap, { backgroundColor: colors.accent.primary + '25' }]}
          >
            <Ionicons name={iconName} size={32} color={colors.accent.primary} />
          </View>
        </View>
        <Text style={[styles.amount, { color: colors.text.primary }]}>
          ₹{Number(expense.amount ?? 0).toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.amountDesc, { color: colors.text.secondary }]}>
          {expense.description}
        </Text>
        <View style={styles.badgeRow}>
          <View style={[styles.splitBadge, { backgroundColor: colors.bg.card }]}>
            <Ionicons name="git-branch-outline" size={12} color={colors.accent.primary} />
            <Text style={[styles.splitBadgeText, { color: colors.accent.primary }]}>
              {expense.splitType}
            </Text>
          </View>
          <View style={[styles.dateBadge, { backgroundColor: colors.bg.card }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.text.tertiary} />
            <Text style={[styles.splitBadgeText, { color: colors.text.tertiary }]}>
              {new Date(expense.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Paid by</Text>
        <View style={[styles.paidByCard, { backgroundColor: colors.bg.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent.primary + '25' }]}>
            <Text style={[styles.avatarText, { color: colors.accent.primary }]}>
              {(expense.paidBy?.name || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.paidByInfo}>
            <Text style={[styles.paidByName, { color: colors.text.primary }]}>
              {expense.paidBy?.name || 'Unknown'}
            </Text>
            <Text style={[styles.paidByRole, { color: colors.text.tertiary }]}>Payer</Text>
          </View>
          <View style={[styles.paidMarker, { backgroundColor: colors.status.success + '18' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            Split Breakdown
          </Text>
          <View style={[styles.settledCounter, { backgroundColor: colors.status.success + '15' }]}>
            <Text style={[styles.settledCounterText, { color: colors.status.success }]}>
              {settledShares}/{totalShares} settled
            </Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${settledPercent}%`, backgroundColor: colors.status.success },
            ]}
          />
        </View>
        {(expense.shares || []).map((share, i) => {
          const shareAmt = Number(share.amount ?? 0);
          const sharePercent = sharesSum > 0 ? (shareAmt / sharesSum) * 100 : 0;
          return (
            <View
              key={share.memberId || i}
              style={[
                styles.shareRow,
                {
                  backgroundColor: share.settled ? colors.status.success + '08' : colors.bg.card,
                  borderColor: share.settled ? colors.status.success + '25' : colors.border.subtle,
                },
              ]}
            >
              <View
                style={[
                  styles.shareColorDot,
                  { backgroundColor: SPLIT_COLORS[i % SPLIT_COLORS.length] },
                ]}
              />
              <View
                style={[
                  styles.avatarSmall,
                  { backgroundColor: SPLIT_COLORS[i % SPLIT_COLORS.length] + '25' },
                ]}
              >
                <Text
                  style={[styles.avatarTextSmall, { color: SPLIT_COLORS[i % SPLIT_COLORS.length] }]}
                >
                  {(share.memberName || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.shareInfo}>
                <Text style={[styles.shareName, { color: colors.text.primary }]}>
                  {share.memberName}
                </Text>
                <Text style={[styles.sharePercent, { color: colors.text.tertiary }]}>
                  {sharePercent.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.shareRight}>
                <Text style={[styles.shareAmount, { color: colors.text.primary }]}>
                  ₹{shareAmt.toFixed(2)}
                </Text>
                <Ionicons
                  name={share.settled ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={share.settled ? colors.status.success : colors.text.tertiary}
                />
              </View>
            </View>
          );
        })}
      </View>

      {expense.notes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Notes</Text>
          <View
            style={[
              styles.notesCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.text.tertiary} />
            <Text style={[styles.notesText, { color: colors.text.secondary }]}>
              {expense.notes}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
          Comments ({expense.comments?.length || 0})
        </Text>
        {(expense.comments || []).map((comment) => (
          <View
            key={comment.id}
            style={[
              styles.commentCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <View style={styles.commentHeader}>
              <View style={[styles.avatarSmall, { backgroundColor: colors.accent.primary + '20' }]}>
                <Text style={[styles.avatarTextSmall, { color: colors.accent.primary }]}>
                  {(comment.user?.name || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.commentMeta}>
                <Text style={[styles.commentUser, { color: colors.text.primary }]}>
                  {comment.user?.name}
                </Text>
                <Text style={[styles.commentTime, { color: colors.text.tertiary }]}>
                  {formatTime(comment.createdAt)}
                </Text>
              </View>
            </View>
            <Text style={[styles.commentContent, { color: colors.text.secondary }]}>
              {comment.content}
            </Text>
          </View>
        ))}
        {(expense.comments || []).length === 0 && (
          <View style={styles.emptyComments}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={28}
              color={colors.text.tertiary + '50'}
            />
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No comments yet</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.commentInputRow,
          { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle },
        ]}
      >
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.bg.card,
              color: colors.text.primary,
              borderColor: colors.border.subtle,
            },
          ]}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.text.tertiary}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.commentSend,
            { backgroundColor: commentText.trim() ? colors.accent.primary : colors.bg.tertiary },
          ]}
          onPress={handleAddComment}
          disabled={!commentText.trim() || commenting}
        >
          {commenting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCard: { margin: 16, padding: 32, borderRadius: 24, alignItems: 'center' },
  glowRing: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5, marginBottom: 8 },
  amountDesc: { fontSize: 16, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  splitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
  },
  splitBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
  },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settledCounter: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  settledCounterText: { fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  paidByCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  paidByInfo: { flex: 1 },
  paidByName: { fontSize: 16, fontWeight: '600' },
  paidByRole: { fontSize: 12, marginTop: 2 },
  paidMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: { fontSize: 13, fontWeight: '700' },
  shareColorDot: { width: 4, height: 36, borderRadius: 2 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  shareInfo: { flex: 1 },
  shareName: { fontSize: 14, fontWeight: '600' },
  sharePercent: { fontSize: 11, marginTop: 1 },
  shareRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareAmount: { fontSize: 15, fontWeight: '700' },
  notesCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  notesText: { fontSize: 14, lineHeight: 20, flex: 1 },
  commentCard: { padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentMeta: { flex: 1 },
  commentUser: { fontSize: 14, fontWeight: '600' },
  commentTime: { fontSize: 11, marginTop: 1 },
  commentContent: { fontSize: 14, lineHeight: 20, marginLeft: 42 },
  emptyComments: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    fontSize: 14,
    borderWidth: 1,
    maxHeight: 80,
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
