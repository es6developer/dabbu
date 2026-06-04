import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'Groceries',
  'Transport',
  'Healthcare',
  'Education',
  'Rent',
  'Utilities',
  'Other',
];

const SPLIT_TYPES = [
  { key: 'equal', label: 'Equal' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'exact', label: 'Exact' },
  { key: 'shares', label: 'Shares' },
] as const;

export function SharedExpenseFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId, expenseId, edit } = route.params || {};

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Food');
  const [splitType, setSplitType] = useState('equal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [sharesCount, setSharesCount] = useState<Record<string, string>>({});

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadMembers();
    if (edit && expenseId) {
      loadExpense();
    }
  }, [accessToken]);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/members`);
      const data = Array.isArray(res) ? res : [];
      setMembers(data);
      if (!paidBy && data.length > 0) {
        const me = data.find((m: any) => m.userId === currentUser?.id);
        setPaidBy(me?.userId || data[0].userId);
      }
    } catch (e: any) {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadExpense() {
    try {
      const res = await api.get<any>(`/shared-expenses/${expenseId}`);
      const e = res;
      if (e) {
        setDescription(e.description || '');
        setAmount(String(e.amount || ''));
        setPaidBy(e.paidBy);
        setDate(e.date || '');
        setCategory(e.category || 'Food');
        setSplitType(e.splitType || 'equal');
        setNotes(e.notes || '');
        if (e.splits) {
          const vals: Record<string, string> = {};
          const shares: Record<string, string> = {};
          for (const s of e.splits) {
            const member = members.find((m: any) => m.userId === s.userId);
            const key = member?.id || s.userId;
            if (e.splitType === 'shares') {
              shares[key] = String(s.shares || '');
            } else if (e.splitType === 'percentage') {
              vals[key] = String(s.percentage || '');
            } else {
              vals[key] = String(s.amount || '');
            }
          }
          setSplitValues(vals);
          setSharesCount(shares);
        }
      }
    } catch (e: any) {
      // ignore
    }
  }

  const payerName = useCallback(
    (userId: string) => {
      const m = members.find((mm: any) => mm.userId === userId);
      return m?.user?.firstName || m?.user?.email || 'Someone';
    },
    [members],
  );

  const splitPreview = React.useMemo(() => {
    const amt = Number(amount) || 0;
    if (members.length === 0) {
      return [];
    }
    if (splitType === 'equal') {
      const share = amt / members.length;
      return members.map((m: any) => ({
        name: m.user?.firstName || m.user?.email || 'Member',
        value: share,
      }));
    }
    if (splitType === 'percentage') {
      const totalPct = Object.values(splitValues).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalPct === 0) {
        return [];
      }
      return members.map((m: any) => {
        const pct = Number(splitValues[m.id]) || 0;
        return {
          name: m.user?.firstName || m.user?.email || 'Member',
          value: (amt * pct) / 100,
          detail: `${pct}%`,
        };
      });
    }
    if (splitType === 'exact') {
      return members.map((m: any) => ({
        name: m.user?.firstName || m.user?.email || 'Member',
        value: Number(splitValues[m.id]) || 0,
        detail: `₹${Number(splitValues[m.id]) || 0}`,
      }));
    }
    if (splitType === 'shares') {
      const totalShares = Object.values(sharesCount).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalShares === 0) {
        return [];
      }
      return members.map((m: any) => {
        const s = Number(sharesCount[m.id]) || 0;
        return {
          name: m.user?.firstName || m.user?.email || 'Member',
          value: (amt * s) / totalShares,
          detail: `${s} share${s !== 1 ? 's' : ''}`,
        };
      });
    }
    return [];
  }, [amount, splitType, members, splitValues, sharesCount]);

  async function handleSave() {
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Valid amount is required');
      return;
    }
    if (!paidBy) {
      setError('Select who paid');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const totalAmt = Number(amount) || 0;
      const totalShares = Object.values(sharesCount).reduce((s, v) => s + (Number(v) || 0), 0);
      const splits = members.map((m: any) => {
        const splitBase: any = { userId: m.userId };
        if (splitType === 'percentage') {
          const pct = Number(splitValues[m.id]) || 0;
          splitBase.amount = (totalAmt * pct) / 100;
          splitBase.percentage = pct;
        } else if (splitType === 'exact') {
          splitBase.amount = Number(splitValues[m.id]) || 0;
        } else if (splitType === 'shares') {
          const s = Number(sharesCount[m.id]) || 0;
          splitBase.shares = s;
          splitBase.amount = totalShares > 0 ? (totalAmt * s) / totalShares : 0;
        }
        return splitBase;
      });
      const payload = {
        description: description.trim(),
        amount: Number(amount),
        paidBy,
        date: date || new Date().toISOString().split('T')[0],
        category,
        splitType,
        splits: splitType !== 'equal' ? splits : undefined,
        notes: notes.trim() || undefined,
      };
      if (edit && expenseId) {
        await api.patch(`/shared-finance/expenses/${expenseId}`, payload);
      } else {
        await api.post(`/shared-finance/groups/${groupId}/expenses`, payload);
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  const maxPreviewValue = Math.max(...splitPreview.map(i => i.value), 0);

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                s.backBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.text.primary }]}>
              {edit ? 'Edit Expense' : 'Add Expense'}
            </Text>
            <View style={s.headerSpacer} />
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={s.amountHero}>
            <Text style={[s.amountPrefix, { color: colors.text.tertiary }]}>₹</Text>
            <TextInput
              style={[s.amountInput, { color: colors.text.primary }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={[s.label, { color: colors.text.tertiary }]}>Description</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Dinner at Kaema"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[s.label, { color: colors.text.tertiary }]}>Paid By</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            {members.map((m: any) => {
              const selected = paidBy === m.userId;
              return (
                <TouchableOpacity
                  key={m.userId}
                  style={[
                    s.payerChip,
                    { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                    selected && {
                      backgroundColor: `${colors.accent.primary}20`,
                      borderColor: colors.accent.primary,
                    },
                  ]}
                  onPress={() => setPaidBy(m.userId)}
                >
                  <LinearGradient colors={[...colors.accent.gradient]} style={s.payerDot}>
                    <Text style={s.payerInit}>{(m.user?.firstName?.[0] || '?').toUpperCase()}</Text>
                  </LinearGradient>
                  <Text
                    style={[
                      s.payerName,
                      {
                        color: selected ? colors.accent.primary : colors.text.secondary,
                      },
                    ]}
                  >
                    {m.user?.firstName || m.user?.email || 'Member'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[s.label, { color: colors.text.tertiary }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  s.catChip,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  category === cat && {
                    backgroundColor: `${colors.accent.primary}20`,
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    s.catChipText,
                    {
                      color: category === cat ? colors.accent.primary : colors.text.secondary,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, { color: colors.text.tertiary }]}>Split Type</Text>
          <View style={s.splitTypeRow}>
            {SPLIT_TYPES.map((st) => (
              <TouchableOpacity
                key={st.key}
                style={[
                  s.splitTypeChip,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  splitType === st.key && {
                    backgroundColor: `${colors.accent.primary}20`,
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setSplitType(st.key)}
              >
                <Text
                  style={[
                    s.splitTypeText,
                    {
                      color: splitType === st.key ? colors.accent.primary : colors.text.secondary,
                    },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(splitType === 'percentage' || splitType === 'exact' || splitType === 'shares') && (
            <>
              <Text style={[s.label, { color: colors.text.tertiary }]}>
                {splitType === 'percentage'
                  ? 'Percentages per member'
                  : splitType === 'exact'
                    ? 'Exact amounts per member'
                    : 'Shares per member'}
              </Text>
              {members.map((m: any) => {
                const mName = m.user?.firstName || m.user?.email || 'Member';
                const val =
                  splitType === 'shares' ? sharesCount[m.id] || '' : splitValues[m.id] || '';
                return (
                  <View key={m.id} style={s.splitMemberRow}>
                    <Text style={[s.splitMemberName, { color: colors.text.secondary }]}>
                      {mName}
                    </Text>
                    <View
                      style={[
                        s.splitInputWrap,
                        {
                          backgroundColor: colors.bg.tertiary,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                    >
                      {splitType === 'exact' && (
                        <Text style={[s.splitPrefix, { color: colors.text.tertiary }]}>₹</Text>
                      )}
                      <TextInput
                        style={[s.splitInput, { color: colors.text.primary }]}
                        value={val}
                        onChangeText={(v) => {
                          if (splitType === 'shares') {
                            setSharesCount((prev) => ({ ...prev, [m.id]: v }));
                          } else {
                            setSplitValues((prev) => ({ ...prev, [m.id]: v }));
                          }
                        }}
                        keyboardType="decimal-pad"
                        placeholder={splitType === 'percentage' ? '0%' : '0'}
                        placeholderTextColor={colors.text.tertiary}
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <Text style={[s.label, { color: colors.text.tertiary }]}>Split Preview</Text>
          <View style={[s.previewCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
            {splitPreview.length > 0 && maxPreviewValue > 0 ? (
              splitPreview.map((item, i) => {
                const barWidth = (item.value / maxPreviewValue) * 100;
                return (
                  <View key={i} style={s.previewItem}>
                    <View style={s.previewInfo}>
                      <Text style={[s.previewName, { color: colors.text.primary }]}>{item.name}</Text>
                      <Text style={[s.previewAmount, { color: colors.text.primary }]}>
                        {'detail' in item && item.detail
                          ? `${item.detail} · ₹${Math.round(item.value)}`
                          : `₹${Math.round(item.value)}`}
                      </Text>
                    </View>
                    <View style={[s.previewBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <View
                        style={[
                          s.previewBarFill,
                          { width: `${barWidth}%`, backgroundColor: colors.accent.primary },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={[s.previewEmpty, { color: colors.text.tertiary }]}>
                Enter amount and split details to see preview
              </Text>
            )}
          </View>

          <Text style={[s.label, { color: colors.text.tertiary }]}>Notes (optional)</Text>
          <TextInput
            style={[
              s.input,
              s.notesInput,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor={colors.text.tertiary}
            multiline
          />

          <TouchableOpacity
            style={[
              s.saveBtn,
              { backgroundColor: colors.accent.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.saveBtnText}>{edit ? 'Update Expense' : 'Save Expense'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  amountHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
  },
  amountPrefix: {
    fontSize: 36,
    fontWeight: '800',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 140,
    paddingVertical: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  payerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerInit: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  payerName: { fontSize: 13, fontWeight: '500' },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: { fontSize: 13, fontWeight: '500' },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  splitTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  splitTypeText: { fontSize: 13, fontWeight: '600' },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  splitMemberName: { fontSize: 14, fontWeight: '500', flex: 1 },
  splitInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    width: 130,
  },
  splitPrefix: { fontSize: 14, fontWeight: '600', marginRight: 4 },
  splitInput: { flex: 1, fontSize: 14, paddingVertical: 10, textAlign: 'right' },
  previewCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  previewItem: {
    marginBottom: 12,
  },
  previewInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewName: { fontSize: 14, fontWeight: '500' },
  previewAmount: { fontSize: 14, fontWeight: '700' },
  previewBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewBarFill: {
    height: 6,
    borderRadius: 3,
  },
  previewEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 28,
    marginHorizontal: 20,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
