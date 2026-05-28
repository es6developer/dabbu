import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
    if (accessToken) setAccessToken(accessToken);
    loadExpense();
  }, []);

  useEffect(() => {
    if (expense) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={handleEdit} style={[styles.headerBtn, { backgroundColor: colors.bg.glass }]}>
              <Ionicons name="create-outline" size={18} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.headerBtn, { backgroundColor: colors.status.errorLight }]}>
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
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (accessToken) setAccessToken(accessToken);
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
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.post<any>(`/shared-finance/groups/${groupId}/expenses/${expenseId}/comments`, { content: commentText.trim() });
      setExpense(prev => prev ? { ...prev, comments: [...prev.comments, res.data] } : prev);
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
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  if (!expense) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <Text style={{ color: colors.status.error, fontSize: 16 }}>Expense not found</Text>
    </View>
  );

  const iconName = CATEGORY_ICONS[expense.category] || 'ellipsis-horizontal-outline';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.amountCard, { backgroundColor: colors.bg.tertiary }]}>
        <View style={[styles.categoryIconWrap, { backgroundColor: colors.accent.primary + '20' }]}>
          <Ionicons name={iconName} size={28} color={colors.accent.primary} />
        </View>
        <Text style={[styles.amount, { color: colors.text.primary }]}>₹{Number(expense.amount).toLocaleString('en-IN')}</Text>
        <Text style={[styles.amountDesc, { color: colors.text.secondary }]}>{expense.description}</Text>
        <View style={[styles.splitBadge, { backgroundColor: colors.bg.card }]}>
          <Ionicons name="git-branch-outline" size={14} color={colors.text.tertiary} />
          <Text style={[styles.splitBadgeText, { color: colors.text.tertiary }]}>{expense.splitType}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <DetailRow colors={colors} icon="calendar-outline" label="Date" value={new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
        <DetailRow colors={colors} icon="apps-outline" label="Category" value={expense.category} />
        {expense.notes && <DetailRow colors={colors} icon="document-text-outline" label="Notes" value={expense.notes} />}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Paid by</Text>
        <View style={[styles.paidByCard, { backgroundColor: colors.bg.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent.primary + '30' }]}>
            <Text style={[styles.avatarText, { color: colors.accent.primary }]}>{(expense.paidBy.name || '?')[0].toUpperCase()}</Text>
          </View>
          <Text style={[styles.paidByName, { color: colors.text.primary }]}>{expense.paidBy.name}</Text>
          <View style={[styles.paidMarker, { backgroundColor: colors.status.successLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Split Breakdown</Text>
        {(expense.shares || []).map((share, i) => (
          <View key={share.memberId || i} style={[styles.shareRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <View style={[styles.avatarSmall, { backgroundColor: colors.accent.primary + '30' }]}>
              <Text style={[styles.avatarTextSmall, { color: colors.accent.primary }]}>{(share.memberName || '?')[0].toUpperCase()}</Text>
            </View>
            <Text style={[styles.shareName, { color: colors.text.primary }]}>{share.memberName}</Text>
            <Text style={[styles.shareAmount, { color: colors.text.primary }]}>₹{Number(share.amount).toFixed(2)}</Text>
            <Ionicons
              name={share.settled ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={share.settled ? colors.status.success : colors.status.error}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Comments ({expense.comments?.length || 0})</Text>
        {(expense.comments || []).map((comment) => (
          <View key={comment.id} style={[styles.commentCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <View style={styles.commentHeader}>
              <View style={[styles.avatarSmall, { backgroundColor: colors.accent.primary + '30' }]}>
                <Text style={[styles.avatarTextSmall, { color: colors.accent.primary }]}>{(comment.user.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.commentMeta}>
                <Text style={[styles.commentUser, { color: colors.text.primary }]}>{comment.user.name}</Text>
                <Text style={[styles.commentTime, { color: colors.text.tertiary }]}>{formatTime(comment.createdAt)}</Text>
              </View>
            </View>
            <Text style={[styles.commentContent, { color: colors.text.secondary }]}>{comment.content}</Text>
          </View>
        ))}
        {(expense.comments || []).length === 0 && (
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No comments yet</Text>
        )}
      </View>

      <View style={[styles.commentInputRow, { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
        <TextInput
          style={[styles.commentInput, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.text.tertiary}
        />
        <TouchableOpacity
          style={[styles.commentSend, { backgroundColor: commentText.trim() ? colors.accent.primary : colors.bg.tertiary }]}
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

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function DetailRow({ colors, icon, label, value }: { colors: any; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={16} color={colors.text.tertiary} />
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  amountCard: { margin: 16, padding: 32, borderRadius: 20, alignItems: 'center' },
  categoryIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  amount: { fontSize: 40, fontWeight: '700', letterSpacing: -1, marginBottom: 8 },
  amountDesc: { fontSize: 16, fontWeight: '500', marginBottom: 12, textAlign: 'center' },
  splitBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
  splitBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 14, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '500', maxWidth: '50%', textAlign: 'right' },
  paidByCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  paidByName: { flex: 1, fontSize: 16, fontWeight: '600' },
  paidMarker: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { fontSize: 12, fontWeight: '700' },
  shareRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, gap: 10 },
  shareName: { flex: 1, fontSize: 14, fontWeight: '500' },
  shareAmount: { fontSize: 14, fontWeight: '700', marginRight: 8 },
  commentCard: { padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentMeta: { flex: 1 },
  commentUser: { fontSize: 14, fontWeight: '600' },
  commentTime: { fontSize: 11, marginTop: 1 },
  commentContent: { fontSize: 14, lineHeight: 20, marginLeft: 40 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderTopWidth: 1 },
  commentInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, fontSize: 14, borderWidth: 1, maxHeight: 44 },
  commentSend: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
