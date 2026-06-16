import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Platform, Animated, Vibration,
  KeyboardAvoidingView, Keyboard, Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

const PRIMARY = '#6366F1';
const CATEGORIES = [
  { key: 'Housing', emoji: '\u{1F3E0}' },
  { key: 'Groceries', emoji: '\u{1F6D2}' },
  { key: 'Food', emoji: '\u{1F37D}\uFE0F' },
  { key: 'Utilities', emoji: '\u26A1' },
  { key: 'Transport', emoji: '\u{1F697}' },
  { key: 'Healthcare', emoji: '\u{1F3E5}' },
  { key: 'Entertainment', emoji: '\u{1F3AC}' },
  { key: 'Shopping', emoji: '\u{1F6CD}\uFE0F' },
  { key: 'Education', emoji: '\u{1F4DA}' },
  { key: 'Other', emoji: '\u{1F4CC}' },
];

const SPLIT_TYPES = [
  { key: 'equal', label: 'Equal', desc: 'Split evenly' },
  { key: 'percentage', label: 'Percentage', desc: 'Custom % per person' },
  { key: 'exact', label: 'Exact', desc: 'Set exact amounts' },
  { key: 'shares', label: 'Shares', desc: 'Split by shares' },
] as const;

const MM_COLORS = ['#8B5CF6', '#F97316', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B'];

function getMemberColor(idx: number) { return MM_COLORS[idx % MM_COLORS.length]; }

function fmtCurrency(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function PremiumExpenseFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { groupId, expenseId, edit } = route.params || {};

  const [step, setStep] = useState<'details' | 'split'>('details');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [category, setCategory] = useState('Food');
  const [splitType, setSplitType] = useState('equal');
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [sharesCount, setSharesCount] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const amountAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadMembers();
  }, [accessToken]);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/members`);
      const data = Array.isArray(res) ? res : [];
      setMembers(data);
      const me = data.find((m: any) => m.userId === currentUser?.id);
      if (me && !paidBy) setPaidBy(me.userId);
    } catch {}
  }

  const isMe = (userId: string) => userId === currentUser?.id;
  const totalAmount = useMemo(() => Number(amount.replace(/,/g, '')) || 0, [amount]);
  const validDetails = totalAmount > 0 && description.trim().length > 0;

  function handleAmountChange(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setAmount(cleaned);
    setFieldErrors((p) => ({ ...p, amount: '' }));
    Animated.sequence([
      Animated.timing(amountAnim, { toValue: 0.96, duration: 50, useNativeDriver: true }),
      Animated.spring(amountAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }

  function formatAmountDisplay(raw: string) {
    const num = Number(raw.replace(/,/g, '')) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function handleContinue() {
    if (!validDetails) return;
    Keyboard.dismiss();
    Vibration.vibrate(10);
    setStep('split');
  }

  function handleBack() {
    if (step === 'split') setStep('details');
    else navigation.goBack();
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    Keyboard.dismiss();
    try {
      if (accessToken) setAccessToken(accessToken);
      const totalAmt = totalAmount;
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
        amount: totalAmt,
        category,
        date: expenseDate.toISOString(),
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
      Vibration.vibrate(10);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (totalAmount <= 0) errs.amount = 'Amount must be greater than 0';
    if (!description.trim()) errs.description = 'Please enter a description';
    if (!paidBy) errs.paidBy = 'Select who paid';
    if (splitType === 'percentage') {
      const total = members.reduce((s, m) => s + (Number(splitValues[m.id]) || 0), 0);
      if (Math.abs(total - 100) > 0.01) errs.split = 'Percentages must add up to 100%';
    }
    if (splitType === 'exact') {
      const total = members.reduce((s, m) => s + (Number(splitValues[m.id]) || 0), 0);
      if (Math.abs(total - totalAmount) > 0.01) errs.split = 'Split amounts must equal ' + fmtCurrency(totalAmount);
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) { Vibration.vibrate(20); return false; }
    return true;
  }

  function getSplitAmount(member: any): number {
    const count = members.length;
    if (count === 0) return 0;
    if (splitType === 'equal') return totalAmount / count;
    if (splitType === 'percentage') return (totalAmount * (Number(splitValues[member.id]) || 0)) / 100;
    if (splitType === 'exact') return Number(splitValues[member.id]) || 0;
    if (splitType === 'shares') {
      const total = members.reduce((s, m) => s + (Number(sharesCount[m.id]) || 0), 0);
      return total > 0 ? (totalAmount * (Number(sharesCount[member.id]) || 0)) / total : 0;
    }
    return 0;
  }

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={s.headerBtn}>
            <AntDesign  name="arrowleft" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{step === 'details' ? 'New Expense' : 'Split'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {step === 'split' && (
          <View style={s.progressBar}>
            <View style={s.progressTrack}>
              <View style={s.progressFill} />
            </View>
            <Text style={s.progressLabel}>Step 2 of 2</Text>
          </View>
        )}

        {step === 'details' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.amountSection}>
              <Animated.View style={[s.amountRow, { transform: [{ scale: amountAnim }] }]}>
                <Text style={s.currencySign}>₹</Text>
                <TextInput
                  style={s.amountInput}
                  value={amount ? formatAmountDisplay(amount) : ''}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </Animated.View>
              {fieldErrors.amount ? <Text style={s.fieldError}>{fieldErrors.amount}</Text> : null}
            </View>

            <View style={s.formFields}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>What was this for?</Text>
                <TextInput
                  style={s.textInput}
                  value={description}
                  onChangeText={(v) => {
                    if (v.length <= 50) setDescription(v);
                    setFieldErrors((p) => ({ ...p, description: '' }));
                  }}
                  placeholder="Dinner at Italian restaurant..."
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="sentences"
                />
                <Text style={s.charCount}>{description.length}/50</Text>
                {fieldErrors.description ? <Text style={s.fieldError}>{fieldErrors.description}</Text> : null}
              </View>

              <TouchableOpacity style={s.fieldGroup} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <Text style={s.fieldLabel}>Date</Text>
                <View style={s.rowBetween}>
                  <Text style={s.valueText}>{formatDate(expenseDate)}</Text>
                  <AntDesign  name="down" size={16} color="#94A3B8" />
                </View>
              </TouchableOpacity>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Paid by</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.payerRow}>
                  {members.map((m, idx) => {
                    const sel = paidBy === m.userId;
                    const name = m.user?.firstName || m.user?.email || 'Member';
                    const color = getMemberColor(idx);
                    return (
                      <TouchableOpacity
                        key={m.userId}
                        onPress={() => { setPaidBy(m.userId); Vibration.vibrate(5); }}
                        style={[s.payerCard, sel && { borderColor: color, backgroundColor: color + '12' }]}
                      >
                        <View style={[s.payerAvatar, { backgroundColor: color }]}>
                          <Text style={s.payerInitial}>{(name[0] || '?').toUpperCase()}</Text>
                        </View>
                        <Text style={[s.payerName, { color: sel ? color : '#64748B' }]} numberOfLines={1}>
                          {isMe(m.userId) ? 'You' : name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
                  {CATEGORIES.map((c) => {
                    const sel = category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => setCategory(c.key)}
                        style={[s.catCard, sel && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                      >
                        <Text style={s.catEmoji}>{c.emoji}</Text>
                        <Text style={[s.catLabel, { color: sel ? '#FFF' : '#64748B' }]}>{c.key}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.formFields}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Split method</Text>
                <View style={s.splitSelector}>
                  {SPLIT_TYPES.map((st) => {
                    const active = splitType === st.key;
                    return (
                      <TouchableOpacity
                        key={st.key}
                        onPress={() => { setSplitType(st.key); Vibration.vibrate(5); }}
                        style={[s.splitOption, active && { backgroundColor: PRIMARY }]}
                      >
                        <Text style={[s.splitOptionText, active && { color: '#FFF' }]}>{st.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.previewCard}>
                <View style={s.previewTotalRow}>
                  <Text style={s.previewTotalLabel}>Total</Text>
                  <Text style={s.previewTotalAmount}>{fmtCurrency(totalAmount)}</Text>
                </View>

                {(splitType === 'percentage' || splitType === 'exact' || splitType === 'shares') && (
                  <View style={s.splitInputsSection}>
                    {members.map((m, idx) => {
                      const name = m.user?.firstName || m.user?.email || 'Member';
                      const color = getMemberColor(idx);
                      const val = splitType === 'shares' ? sharesCount[m.id] || '' : splitValues[m.id] || '';
                      return (
                        <View key={m.id} style={s.splitMemberRow}>
                          <View style={[s.smAvatar, { backgroundColor: color + '18' }]}>
                            <Text style={[s.smInitial, { color }]}>{(name[0] || '?').toUpperCase()}</Text>
                          </View>
                          <Text style={s.smName}>{isMe(m.userId) ? 'You' : name}</Text>
                          <View style={s.smInputWrap}>
                            <TextInput
                              style={s.smInput}
                              value={val}
                              onChangeText={(v) => {
                                const cleaned = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                if (splitType === 'shares') setSharesCount((p) => ({ ...p, [m.id]: cleaned }));
                                else setSplitValues((p) => ({ ...p, [m.id]: cleaned }));
                              }}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor="#CBD5E1"
                            />
                            <Text style={s.smSuffix}>{splitType === 'percentage' ? '%' : ''}</Text>
                          </View>
                        </View>
                      );
                    })}
                    {splitType === 'percentage' && (() => {
                      const total = members.reduce((s, m) => s + (Number(splitValues[m.id]) || 0), 0);
                      const ok = Math.abs(total - 100) < 0.01;
                      return <Text style={[s.splitTotalText, { color: ok ? '#10B981' : '#EF4444' }]}>Total: {total.toFixed(1)}% {ok ? '\u2713' : '\u2717'}</Text>;
                    })()}
                    {splitType === 'exact' && (() => {
                      const total = members.reduce((s, m) => s + (Number(splitValues[m.id]) || 0), 0);
                      const ok = Math.abs(total - totalAmount) < 0.01;
                      return <Text style={[s.splitTotalText, { color: ok ? '#10B981' : '#EF4444' }]}>Total: {fmtCurrency(total)} {ok ? '\u2713' : '\u2717'}</Text>;
                    })()}
                  </View>
                )}

                {members.length > 0 && (
                  <View style={s.splitSummary}>
                    <Text style={s.splitSummaryTitle}>Split preview</Text>
                    {members.map((m, idx) => {
                      const amt = getSplitAmount(m);
                      const isYou = isMe(m.userId);
                      const name = m.user?.firstName || m.user?.email || 'Member';
                      const color = getMemberColor(idx);
                      return (
                        <View key={m.id} style={s.splitSummaryRow}>
                          <View style={s.splitSummaryLeft}>
                            <View style={[s.ssAvatar, { backgroundColor: color + '18' }]}>
                              <Text style={[s.ssInitial, { color }]}>{(name[0] || '?').toUpperCase()}</Text>
                            </View>
                            <Text style={s.ssName}>{isYou ? 'You' : name}</Text>
                          </View>
                          <Text style={[s.ssAmount, { color: isYou && paidBy !== m.userId ? '#F59E0B' : '#10B981' }]}>
                            {(isYou && paidBy !== m.userId ? '-' : '+') + fmtCurrency(amt)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Add notes (optional)</Text>
                <TextInput
                  style={s.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional details..."
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>

              {fieldErrors.split ? <Text style={s.fieldError}>{fieldErrors.split}</Text> : null}
              {error ? <Text style={s.errorBox}>{error}</Text> : null}
            </View>
          </ScrollView>
        )}

        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step === 'details' ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleContinue}
              disabled={!validDetails}
              style={[s.continueBtn, { backgroundColor: validDetails ? PRIMARY : '#CBD5E1', opacity: validDetails ? 1 : 0.6 }]}
            >
              <Text style={s.continueBtnText}>Continue to Split \u2192</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleSave}
              disabled={saving}
              style={[s.continueBtn, { backgroundColor: PRIMARY }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.continueBtnText}>
                  {edit ? 'Update Expense' : 'Save Expense'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 8,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cancelText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  progressBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 12 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: PRIMARY },
  progressLabel: { fontSize: 11, fontWeight: '500', color: '#94A3B8' },
  amountSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currencySign: { fontSize: 28, fontWeight: '700', color: '#94A3B8', marginTop: 4 },
  amountInput: {
    fontSize: 48, fontWeight: '800', color: '#0F172A', minWidth: 200,
    textAlign: 'center', padding: 0,
  },
  formFields: { paddingHorizontal: 24, gap: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  valueText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  textInput: {
    fontSize: 16, fontWeight: '500', color: '#0F172A',
    borderBottomWidth: 1.5, borderBottomColor: '#E2E8F0', paddingVertical: 8, paddingHorizontal: 0,
  },
  charCount: { fontSize: 11, fontWeight: '500', color: '#94A3B8', textAlign: 'right', marginTop: 4 },
  fieldError: { fontSize: 12, fontWeight: '500', color: '#EF4444', marginTop: 2 },
  payerRow: { gap: 12, paddingVertical: 4 },
  payerCard: {
    alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', minWidth: 72,
  },
  payerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  payerInitial: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  payerName: { fontSize: 12, fontWeight: '600' },
  catRow: { gap: 8, paddingVertical: 4 },
  catCard: {
    alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  catEmoji: { fontSize: 20 },
  catLabel: { fontSize: 11, fontWeight: '600' },
  splitSelector: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, gap: 2,
  },
  splitOption: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  splitOptionText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  previewCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, gap: 16,
  },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTotalLabel: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  previewTotalAmount: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  splitInputsSection: { gap: 8 },
  splitMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  smInitial: { fontSize: 12, fontWeight: '700' },
  smName: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
  smInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smInput: {
    fontSize: 14, fontWeight: '600', color: '#0F172A',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 72, textAlign: 'right',
  },
  smSuffix: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  splitTotalText: { fontSize: 13, fontWeight: '600', textAlign: 'right', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  splitSummary: { gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  splitSummaryTitle: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  splitSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  splitSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ssAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ssInitial: { fontSize: 11, fontWeight: '700' },
  ssName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  ssAmount: { fontSize: 15, fontWeight: '800' },
  notesInput: { fontSize: 16, fontWeight: '500', color: '#0F172A', borderBottomWidth: 1.5, borderBottomColor: '#E2E8F0', paddingVertical: 8, minHeight: 60, textAlignVertical: 'top' },
  bottomBar: { paddingHorizontal: 24, paddingTop: 8 },
  continueBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  errorBox: { fontSize: 13, fontWeight: '500', color: '#EF4444', textAlign: 'center' },
});
