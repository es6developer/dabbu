import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { useToast } from '../../store/ToastContext';
import { EXPENSE_CATEGORIES } from '../../config/categoryIcons';
import { Avatar } from '../../components/ui/Avatar';

import { alertService } from "../../components/ui";
const SPLIT_TYPES = [
  { key: 'equal', label: 'Equal', icon: 'team' },
  { key: 'percentage', label: '% Split', icon: 'piechart' },
  { key: 'exact', label: 'Exact', icon: 'wallet' },
  { key: 'shares', label: 'Shares', icon: 'switcher' },
];

function getColor(idx: number, colors: any) {
  const MM_COLORS = [
    colors.accent.secondary,
    '#F97316',
    colors.status.success,
    '#3B82F6',
    colors.status.error,
    '#EC4899',
    '#14B8A6',
    colors.status.warning,
  ];
  return MM_COLORS[idx % MM_COLORS.length];
}

function fmtDate(d: string) {
  if (!d) {
    return '';
  }
  return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SharedExpenseFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { groupId, expenseId, edit } = route.params || {};

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [category, setCategory] = useState('Food & Dining');
  const [splitType, setSplitType] = useState('equal');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [sharesCount, setSharesCount] = useState<Record<string, string>>({});
  const loadExpenseRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadMembers();
  }, [accessToken]);

  useEffect(() => {
    if (edit && expenseId && members.length > 0 && !loadExpenseRef.current) {
      loadExpenseRef.current = true;
      loadExpense();
    }
  }, [edit, expenseId, members.length]);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/members`);
      const data = Array.isArray(res) ? res : [];
      setMembers(data);
      if (data.length > 0) {
        const me = data.find((m: any) => m.userId === currentUser?.id);
        setPaidBy(me?.userId || data[0].userId);
      }
    } catch {
      void 0;
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadExpense() {
    try {
      const e = await api.get<any>(`/shared-finance/expenses/${expenseId}`);
      if (e) {
        setDescription(e.description || '');
        setAmount(String(e.amount || ''));
        setPaidBy(e.paidBy);
        setCategory(e.category || 'Food & Dining');
        setSplitType(e.splitType || 'equal');
        if (e.date) {
          setExpenseDate(e.date.split('T')[0]);
        } else if (e.expenseDate) {
          setExpenseDate(e.expenseDate.split('T')[0]);
        }
        if (e.splits) {
          const vals: Record<string, string> = {};
          const shares: Record<string, string> = {};
          for (const s of e.splits) {
            const member = members.find((m: any) => m.userId === (s.userId || s.memberId));
            const key = member?.id || s.userId || s.memberId;
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
    } catch {
      void 0;
    }
  }

  const isMe = (userId: string) => userId === currentUser?.id;

  const splitPreview = useMemo(() => {
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
        return members.map((m: any) => ({
          name: m.user?.firstName || m.user?.email || 'Member',
          value: 0,
          detail: '0%',
        }));
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
      }));
    }
    if (splitType === 'shares') {
      const totalShares = Object.values(sharesCount).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalShares === 0) {
        return members.map((m: any) => ({
          name: m.user?.firstName || m.user?.email || 'Member',
          value: 0,
        }));
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

  const totalSplit = splitPreview.reduce((s, i) => s + i.value, 0);
  const diff = (Number(amount) || 0) - totalSplit;
  const balanceOk = Math.abs(diff) < 0.01;
  const totalPctEntered = Object.values(splitValues).reduce((s, v) => s + (Number(v) || 0), 0);
  const percentageValid =
    splitType !== 'percentage' || (totalPctEntered > 0 && Math.abs(totalPctEntered - 100) < 0.01);

  function validate(): boolean {
    if (!description.trim()) {
      setError('Add a short description');
      return false;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return false;
    }
    if (!paidBy) {
      setError('Select who paid');
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) {
      return;
    }
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
      const basePayload = {
        description: description.trim(),
        amount: Number(amount),
        category,
        date: expenseDate ? new Date(expenseDate).toISOString() : undefined,
      };
      if (edit && expenseId) {
        await api.patch(`/shared-finance/expenses/${expenseId}`, basePayload);
        showToast('Expense updated');
      } else {
        await api.post(`/shared-finance/groups/${groupId}/expenses`, {
          ...basePayload,
          paidBy,
          splitType,
          splits: splitType !== 'equal' ? splits : undefined,
        });
        showToast('Expense added');
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!expenseId) {
      return;
    }
    alertService.alert('Delete Expense', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/shared-finance/expenses/${expenseId}`);
            showToast('Expense deleted');
            navigation.goBack();
          } catch (e: any) {
            alertService.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.root, { backgroundColor: colors.bg.primary }]}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text.primary }]}>
          {edit ? 'Edit Expense' : 'Add Expense'}
        </Text>
        {edit ? (
          <TouchableOpacity onPress={confirmDelete} style={s.backBtn}>
            <AntDesign name="delete" size={18} color={colors.status.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {error ? (
        <View style={[s.errorBar, { backgroundColor: colors.status.error + '12' }]}>
          <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
          <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Amount Card */}
        <View style={[s.amountCard, { backgroundColor: colors.bg.card, ...shadows.md }]}>
          <View style={s.amountRow}>
            <Text style={[s.currencySign, { color: colors.text.primary }]}>₹</Text>
            <TextInput
              ref={inputRef}
              style={[s.amountInput, { color: colors.text.primary }]}
              value={amount}
              onChangeText={(t) => {
                setAmount(t.replace(/[^0-9.]/g, ''));
                setError('');
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
          </View>
          <View style={[s.divider, { backgroundColor: colors.border.subtle }]} />
          <View style={s.descRow}>
            <AntDesign name="edit" size={16} color={colors.text.tertiary} />
            <TextInput
              style={[s.descInput, { color: colors.text.primary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Category */}
        <Text style={[s.label, { color: colors.text.tertiary }]}>Category</Text>
        <TouchableOpacity
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          style={[
            s.fieldRow,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, marginBottom: showCategoryPicker ? spacing.xs : spacing.sm },
          ]}
        >
          <AntDesign
            name={(EXPENSE_CATEGORIES.find(c => c.name === category)?.icon || 'appstore1') as any}
            size={15}
            color={EXPENSE_CATEGORIES.find(c => c.name === category)?.color || colors.text.tertiary}
          />
          <Text style={[s.fieldValue, { color: colors.text.primary, flex: 1 }]}>
            {category}
          </Text>
          <AntDesign name={showCategoryPicker ? 'up' : 'down'} size={12} color={colors.text.tertiary} />
        </TouchableOpacity>
        {showCategoryPicker && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm }}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = category === cat.name;
              return (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => {
                    setCategory(cat.name);
                    setShowCategoryPicker(false);
                  }}
                  style={[
                    s.chip,
                    {
                      backgroundColor: active ? cat.color + '18' : colors.bg.card,
                      borderColor: active ? cat.color : colors.border.subtle,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <AntDesign
                    name={(cat.icon || 'appstore1') as any}
                    size={13}
                    color={active ? cat.color : colors.text.tertiary}
                  />
                  <Text
                    style={[s.chipText, { color: active ? cat.color : colors.text.secondary }]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Date */}
        <Text style={[s.label, { color: colors.text.tertiary }]}>Date</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[
            s.fieldRow,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, marginBottom: spacing.sm },
          ]}
        >
          <AntDesign name="calendar" size={15} color={colors.accent.primary} />
          <Text style={[s.fieldValue, { color: colors.text.primary }]}>
            {fmtDate(expenseDate)}
          </Text>
          <AntDesign name="down" size={12} color={colors.text.tertiary} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(expenseDate + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_e: any, d?: Date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (d) {
                setExpenseDate(d.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        {/* Split */}
        <Text style={[s.label, { color: colors.text.tertiary }]}>Split</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: spacing.sm }}>
          {SPLIT_TYPES.map((st) => {
            const active = splitType === st.key;
            return (
              <TouchableOpacity
                key={st.key}
                onPress={() => {
                  setSplitType(st.key);
                  setSplitValues({});
                  setSharesCount({});
                }}
                style={[
                  s.chip,
                  {
                    backgroundColor: active ? colors.accent.primary + '18' : colors.bg.card,
                    borderColor: active ? colors.accent.primary : colors.border.subtle,
                    borderWidth: 1,
                  },
                ]}
              >
                <AntDesign
                  name={st.icon as any}
                  size={13}
                  color={active ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  style={[
                    s.chipText,
                    { color: active ? colors.accent.primary : colors.text.secondary },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
            </View>

        {/* Paid By */}
        <Text style={[s.label, { color: colors.text.tertiary }]}>Paid by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {members.map((m: any, idx: number) => {
              const selected = paidBy === m.userId;
              const name = m.user?.firstName || m.user?.email || 'Member';
              const color = getColor(idx, colors);
              return (
                <TouchableOpacity
                  key={m.userId}
                  onPress={() => {
                    setPaidBy(m.userId);
                    setError('');
                  }}
                  style={[
                    s.payerChip,
                    {
                      borderColor: selected ? color : colors.border.subtle,
                      backgroundColor: selected ? color + '15' : colors.bg.card,
                    },
                  ]}
                >
                  <Avatar
                    uri={m.user?.avatarUrl}
                    name={name}
                    size={20}
                  />
                  <Text
                    style={[s.payerName, { color: selected ? color : colors.text.secondary }]}
                    numberOfLines={1}
                  >
                    {isMe(m.userId) ? 'You' : name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Split Inputs (for non-equal) */}
        {(splitType === 'percentage' || splitType === 'exact' || splitType === 'shares') && (
          <View
            style={[
              s.splitSection,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[s.splitSectionTitle, { color: colors.text.secondary }]}>
              {splitType === 'percentage'
                ? 'Percentages'
                : splitType === 'exact'
                  ? 'Amounts'
                  : 'Shares'}
            </Text>
            {members.map((m: any, idx: number) => {
              const val =
                splitType === 'shares' ? sharesCount[m.id] || '' : splitValues[m.id] || '';
              const color = getColor(idx, colors);
              const mName = m.user?.firstName || m.user?.email || 'Member';
              return (
                <View key={m.id} style={[s.splitRow, { borderBottomColor: colors.border.subtle }]}>
                  <Avatar
                    uri={m.user?.avatarUrl}
                    name={mName}
                    size={28}
                  />
                  <Text style={[s.splitName, { color: colors.text.primary }]}>
                    {isMe(m.userId) ? 'You' : mName}
                  </Text>
                  <View
                    style={[
                      s.splitInputWrap,
                      { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                    ]}
                  >
                    {splitType === 'exact' && (
                      <Text style={[s.splitPrefix, { color: colors.text.tertiary }]}>₹</Text>
                    )}
                    <TextInput
                      style={[s.splitInput, { color: colors.text.primary }]}
                      value={val}
                      onChangeText={(v) => {
                        splitType === 'shares'
                          ? setSharesCount((p) => ({ ...p, [m.id]: v }))
                          : setSplitValues((p) => ({ ...p, [m.id]: v }));
                      }}
                      keyboardType="decimal-pad"
                      placeholder={splitType === 'percentage' ? '0%' : '0'}
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Split Preview (compact) */}
        {Number(amount) > 0 && splitPreview.length > 0 && (
          <View
            style={[
              s.previewCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AntDesign
                name="calculator"
                size={14}
                color={balanceOk ? colors.status.success : colors.status.error}
              />
              <Text style={[s.previewTitle, { color: colors.text.primary }]}>Split Preview</Text>
              <View style={{ flex: 1 }} />
              <View
                style={[
                  s.balanceBadge,
                  {                   backgroundColor: balanceOk ? colors.status.success + '15' : colors.status.error + '15' },
                ]}
              >
                <Text
                  style={[s.balanceText, { color: balanceOk ? '#10B981' : colors.status.error }]}
                >
                  {balanceOk ? 'Balanced' : `₹${Math.round(diff)}`}
                </Text>
              </View>
            </View>
            {splitPreview.map((item, i) => (
              <View key={i} style={s.previewRow}>
                <Text style={[s.previewName, { color: colors.text.secondary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={{ flex: 1 }} />
                {(item as any).detail ? (
                  <Text style={[s.previewDetail, { color: colors.text.tertiary }]}>
                    {(item as any).detail}
                  </Text>
                ) : null}
                <Text style={[s.previewValue, { color: colors.text.primary }]}>
                  ₹{Math.round(item.value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !percentageValid}
          activeOpacity={0.85}
          style={[s.saveBtn, { opacity: saving || !percentageValid ? 0.6 : 1 }]}
        >
          <LinearGradient
            colors={[colors.accent.primary, colors.accent.hover || colors.accent.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveGrad}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <AntDesign name="checkcircleo" size={18} color="#FFF" />
                <Text style={s.saveText}>{edit ? 'Update Expense' : 'Save Expense'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    borderRadius: 12,
  },
  errorText: { fontSize: 12, fontWeight: '600', flex: 1 },
  amountCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.md },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySign: { fontSize: 28, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', padding: 0 },
  divider: { height: 1, marginVertical: spacing.sm },
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  descInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  payerName: { fontSize: 11, fontWeight: '600', maxWidth: 50 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldValue: { fontSize: 13, fontWeight: '600', flex: 1 },
  splitSection: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  splitSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitName: { flex: 1, fontSize: 13, fontWeight: '600' },
  splitInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 70,
  },
  splitPrefix: { fontSize: 13, fontWeight: '600' },
  splitInput: { fontSize: 13, fontWeight: '700', padding: 0, minWidth: 40, textAlign: 'right' },
  previewCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewTitle: { fontSize: 13, fontWeight: '700' },
  balanceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  balanceText: { fontSize: 10, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  previewName: { fontSize: 12, fontWeight: '500', maxWidth: 100 },
  previewDetail: { fontSize: 10, fontWeight: '600' },
  previewValue: { fontSize: 13, fontWeight: '700' },
  saveBtn: { borderRadius: borderRadius['2xl'], overflow: 'hidden' },
  saveGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
