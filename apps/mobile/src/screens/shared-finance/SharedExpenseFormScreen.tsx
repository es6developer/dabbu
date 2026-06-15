import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useToast } from '../../store/ToastContext';
import { EXPENSE_CATEGORIES } from '../../config/categoryIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const GREEN = '#10B981';

const SPLIT_TYPES = [
  { key: 'equal', label: 'Equal', icon: 'arrow-redo', desc: 'Everyone pays the same' },
  { key: 'percentage', label: 'Percentage', icon: 'percent', desc: 'Custom percentages' },
  { key: 'exact', label: 'Exact', icon: 'cash', desc: 'Custom amounts' },
  { key: 'shares', label: 'Shares', icon: 'layers', desc: 'Split by shares' },
] as const;

const MM_COLORS = [
  '#8B5CF6',
  '#F97316',
  '#10B981',
  '#3B82F6',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#F59E0B',
];

function getMemberColor(idx: number) {
  return MM_COLORS[idx % MM_COLORS.length];
}

export function SharedExpenseFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { showToast } = useToast();
  const { groupId, expenseId, edit } = route.params || {};
  const inputRef = useRef<TextInput>(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [category, setCategory] = useState('Food');
  const [splitType, setSplitType] = useState('equal');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [sharesCount, setSharesCount] = useState<Record<string, string>>({});

  const loadExpenseRef = useRef(false);

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
      /* ignore */
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
        setCategory(e.category || 'Food');
        setSplitType(e.splitType || 'equal');
        if (e.date) {
          setExpenseDate(e.date.split('T')[0]);
        } else if (e.expenseDate) {
          setExpenseDate(e.expenseDate.split('T')[0]);
        }
        setNotes(e.notes || '');
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
      /* ignore */
    }
  }

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

  const totalSplit = splitPreview.reduce((s, i) => s + i.value, 0);
  const diff = (Number(amount) || 0) - totalSplit;
  const maxPreviewValue = Math.max(...splitPreview.map((i) => i.value), 0);

  const totalPctEntered = Object.values(splitValues).reduce((s, v) => s + (Number(v) || 0), 0);
  const percentageValid = splitType !== 'percentage' || (totalPctEntered > 0 && Math.abs(totalPctEntered - 100) < 0.01);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!description.trim()) {
      errs.description = 'Add a short description';
    }
    if (!amount || Number(amount) <= 0) {
      errs.amount = 'Enter a valid amount';
    }
    if (!paidBy) {
      errs.paidBy = 'Select who paid';
    }
    setFieldErrors(errs);
    setError(Object.values(errs).join('\n'));
    return Object.keys(errs).length === 0;
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
        notes: notes.trim() || undefined,
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

  const isMe = (userId: string) => userId === currentUser?.id;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + tabBarHeight + 40) }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={{ paddingTop: insets.top + 4 }} />
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 20 }}>
            {/* ── Error ── */}
            {error ? (
              <View style={[s.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
                <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* ── Amount + Description ── */}
            <View
              style={[
                s.heroCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <View style={s.heroAmountRow}>
                <Text style={[s.heroCurrency, { color: colors.text.primary }]}>₹</Text>
                <TextInput
                  ref={inputRef}
                  style={[s.heroAmount, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const dotCount = cleaned.split('.').length - 1;
                    if (dotCount > 1) {
                      return;
                    }
                    setAmount(cleaned);
                    setError('');
                    setFieldErrors((p) => ({ ...p, amount: '' }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={() => inputRef.current?.blur()}
                />
              </View>
              {fieldErrors.amount ? (
                <Text style={[s.fieldError, { color: colors.status.error }]}>
                  {fieldErrors.amount}
                </Text>
              ) : null}
              <View style={[s.heroUnderline, { backgroundColor: colors.border.subtle }]}>
                <View
                  style={[
                    s.heroUnderlineFill,
                    {
                      width: amount ? `${Math.min((Number(amount) / 10000) * 100, 100)}%` : '0%',
                      backgroundColor: Number(amount) > 0 ? colors.accent.primary : 'transparent',
                    },
                  ]}
                />
              </View>

              <View style={[s.divider, { backgroundColor: colors.border.subtle }]} />

              <View style={s.descRow}>
                <Ionicons name="create-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[s.descInput, { color: colors.text.primary }]}
                  value={description}
                  onChangeText={(v) => {
                    setDescription(v);
                    setFieldErrors((p) => ({ ...p, description: '' }));
                  }}
                  placeholder="What was this for?"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
              {fieldErrors.description ? (
                <Text style={[s.fieldError, { color: colors.status.error }]}>
                  {fieldErrors.description}
                </Text>
              ) : null}
            </View>

            {/* ── Date ── */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowDatePicker(true)}
              style={[
                s.datePicker,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.accent.primary} />
              <Text style={[s.dateText, { color: colors.text.primary }]}>
                {new Date(expenseDate + 'T12:00:00').toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(expenseDate + 'T12:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_event: any, selectedDate?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setExpenseDate(selectedDate.toISOString().split('T')[0]);
                  }
                  if (Platform.OS !== 'ios') {
                    setShowDatePicker(false);
                  }
                }}
              />
            )}

            {/* ── Paid By ── */}
            <View>
              <Text style={[s.sectionLabel, { color: colors.text.primary }]}>Paid by</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.payerRow}
              >
                {members.map((m: any, idx: number) => {
                  const selected = paidBy === m.userId;
                  const name = m.user?.firstName || m.user?.email || 'Member';
                  const initial = (name[0] || '?').toUpperCase();
                  const color = getMemberColor(idx);
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      onPress={() => {
                        setPaidBy(m.userId);
                        setFieldErrors((p) => ({ ...p, paidBy: '' }));
                      }}
                      activeOpacity={0.7}
                      style={[
                        s.payerCard,
                        selected && { borderColor: color, backgroundColor: `${color}12` },
                      ]}
                    >
                      <View style={[s.payerAvatar, { backgroundColor: color }]}>
                        <Text style={s.payerInitial}>{initial}</Text>
                      </View>
                      <Text
                        style={[s.payerName, { color: selected ? color : colors.text.secondary }]}
                        numberOfLines={1}
                      >
                        {isMe(m.userId) ? 'You' : name}
                      </Text>
                      {selected && (
                        <View style={[s.payerCheck, { backgroundColor: color }]}>
                          <Ionicons name="checkmark" size={10} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {fieldErrors.paidBy ? (
                <Text style={[s.fieldError, { color: colors.status.error }]}>
                  {fieldErrors.paidBy}
                </Text>
              ) : null}
            </View>

            {/* ── Category ── */}
            <View>
              <Text style={[s.sectionLabel, { color: colors.text.primary }]}>Category</Text>
              <View style={s.catGrid}>
                {EXPENSE_CATEGORIES.map((cat, i) => {
                  const selected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      onPress={() => setCategory(selected ? '' : cat.name)}
                      style={[
                        s.catCard,
                        {
                          backgroundColor: selected ? `${cat.color}12` : colors.bg.card,
                          borderColor: selected ? cat.color : colors.border.subtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.catIconWrap,
                          {
                            backgroundColor: selected ? cat.color : `${cat.color}12`,
                            shadowColor: selected ? cat.color : 'transparent',
                          },
                        ]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={selected ? 22 : 20}
                          color={selected ? '#FFF' : cat.color}
                        />
                      </View>
                      <Text
                        style={[
                          s.catName,
                          { color: selected ? colors.text.primary : colors.text.secondary },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      {selected && (
                        <View style={[s.catCheck, { backgroundColor: cat.color }]}>
                          <Ionicons name="checkmark" size={8} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Split Method ── */}
            <View>
              <Text style={[s.sectionLabel, { color: colors.text.primary }]}>Split method</Text>
              <View style={s.splitGrid}>
                {SPLIT_TYPES.map((st) => {
                  const active = splitType === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      style={[
                        s.splitCard,
                        {
                          borderColor: active ? colors.accent.primary : colors.border.subtle,
                          backgroundColor: active ? colors.accent.primary + '15' : colors.bg.card,
                        },
                      ]}
                      onPress={() => setSplitType(st.key)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          s.splitIcon,
                          { backgroundColor: active ? colors.accent.primary : colors.bg.tertiary },
                        ]}
                      >
                        <Ionicons
                          name={st.icon as any}
                          size={18}
                          color={active ? colors.text.inverse : colors.text.tertiary}
                        />
                      </View>
                      <View style={s.splitInfo}>
                        <Text
                          style={[
                            s.splitLabel,
                            { color: active ? colors.accent.primary : colors.text.primary },
                          ]}
                        >
                          {st.label}
                        </Text>
                        <Text style={[s.splitDesc, { color: colors.text.tertiary }]}>
                          {st.desc}
                        </Text>
                      </View>
                      {active && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Member Split Inputs ── */}
            {(splitType === 'percentage' || splitType === 'exact' || splitType === 'shares') && (
              <View
                style={[
                  s.splitInputsCard,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
              >
                <Text style={[s.splitInputsTitle, { color: colors.text.primary }]}>
                  {splitType === 'percentage'
                    ? 'Enter percentages'
                    : splitType === 'exact'
                      ? 'Enter amounts'
                      : 'Enter shares'}
                </Text>
                {members.map((m: any, idx: number) => {
                  const mName = m.user?.firstName || m.user?.email || 'Member';
                  const val =
                    splitType === 'shares' ? sharesCount[m.id] || '' : splitValues[m.id] || '';
                  const color = getMemberColor(idx);
                  return (
                    <View
                      key={m.id}
                      style={[s.splitMemberRow, { borderBottomColor: colors.border.subtle }]}
                    >
                      <View style={[s.smAvatar, { backgroundColor: `${color}18` }]}>
                        <Text style={[s.smInitial, { color }]}>
                          {(mName[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={s.smInfo}>
                        <Text style={[s.smName, { color: colors.text.primary }]}>
                          {isMe(m.userId) ? 'You' : mName}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.smInputWrap,
                          {
                            backgroundColor: colors.bg.tertiary,
                            borderColor: colors.border.subtle,
                          },
                        ]}
                      >
                        {splitType === 'exact' && (
                          <Text style={[s.smPrefix, { color: colors.text.tertiary }]}>₹</Text>
                        )}
                        <TextInput
                          style={[s.smInput, { color: colors.text.primary }]}
                          value={val}
                          onChangeText={(v) => {
                            splitType === 'shares'
                              ? setSharesCount((prev) => ({ ...prev, [m.id]: v }))
                              : setSplitValues((prev) => ({ ...prev, [m.id]: v }));
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

            {/* ── Split Preview ── */}
            <View
              style={[
                s.previewCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <View style={s.previewHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calculator-outline" size={16} color={colors.accent.primary} />
                  <Text style={[s.previewTitle, { color: colors.text.primary }]}>
                    Split Preview
                  </Text>
                </View>
                {splitPreview.length > 0 && Number(amount) > 0 && (
                  <View
                    style={[
                      s.previewTotal,
                      {
                        backgroundColor:
                          Math.abs(diff) < 0.01 ? `${GREEN}15` : `${colors.status.error}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.previewTotalText,
                        { color: Math.abs(diff) < 0.01 ? GREEN : colors.status.error },
                      ]}
                    >
                      {Math.abs(diff) < 0.01 ? 'Balanced' : `₹${Math.round(diff)}`}
                    </Text>
                  </View>
                )}
              </View>
              {splitPreview.length > 0 && maxPreviewValue > 0 ? (
                splitPreview.map((item, i) => {
                  const barWidth = maxPreviewValue > 0 ? (item.value / maxPreviewValue) * 100 : 0;
                  return (
                    <View key={i} style={s.previewRow}>
                      <View style={s.previewBarRow}>
                        <View style={[s.previewBarBg, { backgroundColor: colors.bg.tertiary }]}>
                          <View
                            style={[
                              s.previewBarFill,
                              {
                                width: `${Math.max(barWidth, 2)}%`,
                                backgroundColor: getMemberColor(i),
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={s.previewLabelRow}>
                        <Text
                          style={[s.previewName, { color: colors.text.secondary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={[s.previewValue, { color: colors.text.primary }]}>
                          {'detail' in item && item.detail
                            ? `${item.detail}`
                            : `₹${Math.round(item.value)}`}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={s.previewEmpty}>
                  <Ionicons name="calculator-outline" size={28} color={colors.text.tertiary} />
                  <Text style={[s.previewEmptyText, { color: colors.text.tertiary }]}>
                    Enter amount to see split preview
                  </Text>
                </View>
              )}
            </View>

            {/* ── Notes (collapsible) ── */}
            <TouchableOpacity
              style={[
                s.notesToggle,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
              onPress={() => setShowNotes(!showNotes)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text-outline" size={18} color={colors.text.tertiary} />
                <Text style={[s.notesToggleText, { color: colors.text.secondary }]}>
                  {showNotes ? 'Hide notes' : notes ? `Notes (${notes.length})` : 'Add notes'}
                </Text>
              </View>
              <Ionicons
                name={showNotes ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
            {showNotes && (
              <TextInput
                style={[
                  s.notesInput,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.subtle,
                    color: colors.text.primary,
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.text.tertiary}
                multiline
              />
            )}

            {/* ── Save ── */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !percentageValid}
              activeOpacity={0.85}
              style={[s.saveBtn, (saving || !percentageValid) && { opacity: 0.6 }]}
            >
              <LinearGradient
                colors={[colors.accent.primary, colors.accent.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.saveGrad}
              >
                {saving ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.text.inverse} />
                    <Text style={[s.saveText, { color: colors.text.inverse }]}>
                      {edit ? 'Update Expense' : 'Save Expense'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Delete (edit mode only) ── */}
            {edit && expenseId && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Delete Expense',
                    'Are you sure? This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            setDeleting(true);
                            if (accessToken) {
                              setAccessToken(accessToken);
                            }
                            await api.delete(`/shared-finance/expenses/${expenseId}`);
                            showToast('Expense deleted');
                            navigation.goBack();
                          } catch (e: any) {
                            setError(e.message || 'Failed to delete');
                          } finally {
                            setDeleting(false);
                          }
                        },
                      },
                    ],
                  );
                }}
                disabled={deleting}
                activeOpacity={0.7}
                style={[
                  s.deleteBtn,
                  { borderColor: colors.status.error + '30' },
                  deleting && { opacity: 0.4 },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                <Text style={[s.deleteText, { color: colors.status.error }]}>Delete Expense</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── Error ── */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  errorText: { fontSize: 13, flex: 1, lineHeight: 18 },

  /* ── Hero Card (Amount + Description) ── */
  heroCard: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 0 },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  heroCurrency: { fontSize: 32, fontWeight: '700' },
  heroAmount: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.5,
    textAlign: 'center',
    minWidth: 140,
    paddingVertical: 0,
  },
  heroUnderline: { height: 3, borderRadius: 2, width: '50%', alignSelf: 'center', marginTop: 8 },
  heroUnderlineFill: { height: 3, borderRadius: 2 },
  divider: { height: 1, marginVertical: 16 },
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  descInput: { flex: 1, fontSize: 16, paddingVertical: 2, paddingHorizontal: 0 },
  fieldError: { fontSize: 12, fontWeight: '500', marginTop: 4, marginLeft: 2 },

  /* ── Section Label ── */
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: -0.2 },

  /* ── Paid By ── */
  payerRow: { gap: 10, paddingBottom: 4 },
  payerCard: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 72,
  },
  payerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerInitial: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  payerName: { fontSize: 12, fontWeight: '600', maxWidth: 64 },
  payerCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  /* ── Date Picker ── */
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dateText: { flex: 1, fontSize: 15, fontWeight: '600' },

  /* ── Category Grid ── */
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  catCard: {
    width: (SCREEN_W - 60) / 3,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  catName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  catCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  /* ── Split Method ── */
  splitGrid: { gap: 8 },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  splitIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitInfo: { flex: 1 },
  splitLabel: { fontSize: 14, fontWeight: '700' },
  splitDesc: { fontSize: 11, marginTop: 1 },

  /* ── Split Inputs ── */
  splitInputsCard: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 0 },
  splitInputsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  smAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smInitial: { fontSize: 12, fontWeight: '700' },
  smInfo: { flex: 1 },
  smName: { fontSize: 14, fontWeight: '600' },
  smInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    width: 96,
  },
  smPrefix: { fontSize: 13, fontWeight: '600', marginRight: 2 },
  smInput: { flex: 1, fontSize: 13, paddingVertical: 6, textAlign: 'right' },

  /* ── Split Preview ── */
  previewCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 12 },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewTotal: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  previewTotalText: { fontSize: 11, fontWeight: '700' },
  previewRow: { gap: 4 },
  previewBarRow: { marginBottom: 2 },
  previewBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  previewBarFill: { height: 8, borderRadius: 4 },
  previewLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewName: { fontSize: 12, fontWeight: '500', flex: 1 },
  previewValue: { fontSize: 13, fontWeight: '700' },
  previewEmpty: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  previewEmptyText: { fontSize: 13 },

  /* ── Notes ── */
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  notesToggleText: { fontSize: 14, fontWeight: '500' },
  notesInput: {
    fontSize: 15,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: -12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  /* ── Save ── */
  saveBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 4, marginBottom: 8 },
  saveGrad: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  /* ── Delete ── */
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  deleteText: { fontSize: 15, fontWeight: '600' },
});
