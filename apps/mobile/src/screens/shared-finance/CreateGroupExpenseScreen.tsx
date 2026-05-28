import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  'food', 'transport', 'accommodation', 'utilities', 'entertainment',
  'shopping', 'healthcare', 'rent', 'fuel', 'subscription', 'household', 'other',
];

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

const SPLIT_TYPES = ['Equal', 'Percentage', 'Exact', 'Weighted'] as const;
type SplitType = (typeof SPLIT_TYPES)[number];

interface Member {
  id: string;
  name: string;
  avatar?: string;
}

export function CreateGroupExpenseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params || {};

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [splitType, setSplitType] = useState<SplitType>('Equal');
  const [paidById, setPaidById] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadMembers();
  }, []);

  useEffect(() => {
    if (members.length > 0 && !paidById) {
      setPaidById(members[0].id);
    }
    if (members.length > 0 && selectedMembers.size === 0) {
      setSelectedMembers(new Set(members.map(m => m.id)));
    }
  }, [members]);

  useEffect(() => {
    if (members.length > 0) {
      setSplitValues({});
    }
  }, [splitType]);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}`);
      setMembers(res.members || res.participants || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load group members');
    } finally {
      setLoading(false);
    }
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function updateSplitValue(memberId: string, value: string) {
    setSplitValues(prev => ({ ...prev, [memberId]: value }));
  }

  const activeMembers = members.filter(m => selectedMembers.has(m.id));
  const totalAmount = parseFloat(amount) || 0;

  const shares = activeMembers.map(m => {
    const vals = splitValues;
    let share = 0;
    if (splitType === 'Equal') {
      share = activeMembers.length > 0 ? totalAmount / activeMembers.length : 0;
    } else if (splitType === 'Percentage') {
      const pct = parseFloat(vals[m.id]) || 0;
      share = (totalAmount * pct) / 100;
    } else if (splitType === 'Exact') {
      share = parseFloat(vals[m.id]) || 0;
    } else if (splitType === 'Weighted') {
      const w = parseFloat(vals[m.id]) || 1;
      const totalW = activeMembers.reduce((s, mem) => s + (parseFloat(vals[mem.id]) || 1), 0);
      share = totalW > 0 ? (totalAmount * w) / totalW : 0;
    }
    return { member: m, share };
  });

  const totalSplit = shares.reduce((s, sh) => s + sh.share, 0);
  const percentageSum = activeMembers.reduce((s, m) => s + (parseFloat(splitValues[m.id]) || 0), 0);

  function validate(): string | null {
    if (!amount || parseFloat(amount) <= 0) return 'Please enter a valid amount';
    if (!description.trim()) return 'Please enter a description';
    if (!paidById) return 'Please select who paid';
    if (activeMembers.length < 2) return 'Split must include at least 2 members';
    if (splitType === 'Exact' && Math.abs(totalSplit - totalAmount) > 0.01) {
      return `Split amounts sum to ₹${totalSplit.toFixed(2)} but total is ₹${totalAmount.toFixed(2)}`;
    }
    if (splitType === 'Percentage' && Math.abs(percentageSum - 100) > 0.01) {
      return `Percentages sum to ${percentageSum.toFixed(1)}% but must equal 100%`;
    }
    return null;
  }

  async function handleSubmit() {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }
    setSubmitting(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const payload: any = {
        amount: totalAmount,
        description: description.trim(),
        category,
        splitType: splitType.toLowerCase(),
        paidBy: paidById,
        date,
        notes: notes.trim(),
        participants: activeMembers.map(m => ({ memberId: m.id })),
      };
      if (splitType === 'Percentage') {
        payload.shares = activeMembers.map(m => ({
          memberId: m.id,
          percentage: parseFloat(splitValues[m.id]) || 0,
        }));
      } else if (splitType === 'Exact') {
        payload.shares = activeMembers.map(m => ({
          memberId: m.id,
          amount: parseFloat(splitValues[m.id]) || 0,
        }));
      } else if (splitType === 'Weighted') {
        payload.shares = activeMembers.map(m => ({
          memberId: m.id,
          weight: parseFloat(splitValues[m.id]) || 1,
        }));
      }
      await api.post(`/shared-finance/groups/${groupId}/expenses`, payload);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>New Expense</Text>
          <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>{groupName || 'Group'}</Text>
        </View>
      </View>

      <View style={[styles.amountCard, { backgroundColor: colors.bg.tertiary }]}>
        <Text style={[styles.currencySymbol, { color: colors.text.secondary }]}>₹</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text.primary }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What was this expense for?"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, { backgroundColor: category === cat ? colors.accent.primary + '20' : colors.bg.card, borderColor: category === cat ? colors.accent.primary : colors.border.subtle }]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons name={CATEGORY_ICONS[cat]} size={16} color={category === cat ? colors.accent.primary : colors.text.tertiary} />
              <Text style={[styles.chipText, { color: category === cat ? colors.accent.primary : colors.text.secondary }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Split Type</Text>
        <View style={styles.splitTypeRow}>
          {SPLIT_TYPES.map(st => (
            <TouchableOpacity
              key={st}
              style={[styles.splitTypeChip, { backgroundColor: splitType === st ? colors.accent.primary + '20' : colors.bg.card, borderColor: splitType === st ? colors.accent.primary : colors.border.subtle }]}
              onPress={() => setSplitType(st)}
            >
              <Text style={[styles.splitTypeText, { color: splitType === st ? colors.accent.primary : colors.text.secondary }]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Split with</Text>
          <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>{activeMembers.length} of {members.length}</Text>
        </View>
        {members.map(m => {
          const selected = selectedMembers.has(m.id);
          const share = shares.find(s => s.member.id === m.id);
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberRow, { backgroundColor: colors.bg.card, borderColor: selected ? colors.accent.primary + '40' : colors.border.subtle, opacity: selected ? 1 : 0.5 }]}
              onPress={() => toggleMember(m.id)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.accent.primary + '30' }]}>
                <Text style={[styles.avatarText, { color: colors.accent.primary }]}>{(m.name || '?')[0].toUpperCase()}</Text>
              </View>
              <Text style={[styles.memberName, { color: colors.text.primary }]}>{m.name}</Text>
              {selected && paidById === m.id && (
                <View style={[styles.paidByBadge, { backgroundColor: colors.status.successLight }]}>
                  <Text style={[styles.paidByText, { color: colors.status.success }]}>Paid</Text>
                </View>
              )}
              {selected && (splitType === 'Percentage') && (
                <TextInput
                  style={[styles.splitInput, { color: colors.text.primary, borderColor: colors.border.default }]}
                  value={splitValues[m.id] || ''}
                  onChangeText={v => updateSplitValue(m.id, v)}
                  keyboardType="decimal-pad"
                  placeholder="%"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
              {selected && (splitType === 'Exact') && (
                <TextInput
                  style={[styles.splitInput, { color: colors.text.primary, borderColor: colors.border.default }]}
                  value={splitValues[m.id] || ''}
                  onChangeText={v => updateSplitValue(m.id, v)}
                  keyboardType="decimal-pad"
                  placeholder="₹"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
              {selected && (splitType === 'Weighted') && (
                <TextInput
                  style={[styles.splitInput, { color: colors.text.primary, borderColor: colors.border.default }]}
                  value={splitValues[m.id] || ''}
                  onChangeText={v => updateSplitValue(m.id, v)}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
              {selected && share && splitType === 'Equal' && (
                <Text style={[styles.splitPreviewValue, { color: colors.text.secondary }]}>₹{share.share.toFixed(0)}</Text>
              )}
              {selected && (
                <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={20} color={selected ? colors.accent.primary : colors.text.tertiary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Paid by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paidByRow}>
          {members.filter(m => selectedMembers.has(m.id)).map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.paidByChip, { backgroundColor: paidById === m.id ? colors.accent.primary + '20' : colors.bg.card, borderColor: paidById === m.id ? colors.accent.primary : colors.border.subtle }]}
              onPress={() => setPaidById(m.id)}
            >
              <View style={[styles.avatarSmall, { backgroundColor: colors.accent.primary + '30' }]}>
                <Text style={[styles.avatarTextSmall, { color: colors.accent.primary }]}>{(m.name || '?')[0].toUpperCase()}</Text>
              </View>
              <Text style={[styles.paidByName, { color: paidById === m.id ? colors.accent.primary : colors.text.secondary }]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Date</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={3}
        />
      </View>

      {activeMembers.length > 0 && totalAmount > 0 && (
        <View style={[styles.splitPreview, { backgroundColor: colors.bg.tertiary }]}>
          <Text style={[styles.splitPreviewTitle, { color: colors.text.secondary }]}>Split Preview</Text>
          {shares.map(sh => {
            const isPaidBy = sh.member.id === paidById;
            return (
              <View key={sh.member.id} style={styles.splitPreviewRow}>
                <View style={styles.splitPreviewLeft}>
                  <View style={[styles.avatarSmall, { backgroundColor: colors.accent.primary + '30' }]}>
                    <Text style={[styles.avatarTextSmall, { color: colors.accent.primary }]}>{(sh.member.name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.splitPreviewName, { color: colors.text.primary }]}>{sh.member.name}</Text>
                  {isPaidBy && <Text style={[styles.splitPreviewPaid, { color: colors.status.success }]}>paid</Text>}
                </View>
                <Text style={[styles.splitPreviewAmount, { color: colors.text.primary }]}>₹{sh.share.toFixed(2)}</Text>
              </View>
            );
          })}
          <View style={[styles.splitTotalRow, { borderTopColor: colors.border.subtle }]}>
            <Text style={[styles.splitTotalLabel, { color: colors.text.secondary }]}>Total</Text>
            <Text style={[styles.splitTotalAmount, { color: colors.text.primary }]}>₹{totalSplit.toFixed(2)}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.accent.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Create Expense</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: insets.bottom + 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  amountCard: { marginHorizontal: 20, marginBottom: 16, paddingVertical: 24, paddingHorizontal: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  currencySymbol: { fontSize: 32, fontWeight: '700', marginTop: -4 },
  amountInput: { fontSize: 40, fontWeight: '700', textAlign: 'center', minWidth: 120, letterSpacing: -1 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionCount: { fontSize: 12 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, fontWeight: '500' },
  textArea: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, minHeight: 80, textAlignVertical: 'top' },
  chipsRow: { gap: 8, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, gap: 6 },
  chipText: { fontSize: 13, fontWeight: '500' },
  splitTypeRow: { flexDirection: 'row', gap: 8 },
  splitTypeChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1 },
  splitTypeText: { fontSize: 14, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '500' },
  paidByBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  paidByText: { fontSize: 10, fontWeight: '700' },
  splitInput: { width: 70, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  splitPreviewValue: { fontSize: 14, fontWeight: '600' },
  paidByRow: { gap: 8, flexDirection: 'row' },
  paidByChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { fontSize: 11, fontWeight: '700' },
  paidByName: { fontSize: 13, fontWeight: '500' },
  splitPreview: { marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 16 },
  splitPreviewTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  splitPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  splitPreviewLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  splitPreviewName: { fontSize: 14, fontWeight: '500' },
  splitPreviewPaid: { fontSize: 11, fontWeight: '600' },
  splitPreviewAmount: { fontSize: 14, fontWeight: '700' },
  splitTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  splitTotalLabel: { fontSize: 14, fontWeight: '600' },
  splitTotalAmount: { fontSize: 14, fontWeight: '700' },
  saveBtn: { marginHorizontal: 20, paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
