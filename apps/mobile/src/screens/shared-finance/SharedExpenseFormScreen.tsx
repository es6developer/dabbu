import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { EXPENSE_CATEGORIES } from '../../config/categoryIcons';

const SPLIT_TYPES = [
  { key: 'equal', label: 'Equal', icon: 'arrow-redo' },
  { key: 'percentage', label: 'Percentage', icon: 'percent' },
  { key: 'exact', label: 'Exact', icon: 'cash' },
  { key: 'shares', label: 'Shares', icon: 'layers' },
] as const;

export function SharedExpenseFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, expenseId, edit } = route.params || {};
  const inputRef = useRef<TextInput>(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
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
    if (accessToken) setAccessToken(accessToken);
    loadMembers();
    if (edit && expenseId) loadExpense();
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
    } catch { /* ignore */ }
    finally { setLoadingMembers(false); }
  }

  async function loadExpense() {
    try {
      const res = await api.get<any>(`/shared-expenses/${expenseId}`);
      const e = res;
      if (e) {
        setDescription(e.description || '');
        setAmount(String(e.amount || ''));
        setPaidBy(e.paidBy);
        setCategory(e.category || 'Food');
        setSplitType(e.splitType || 'equal');
        setNotes(e.notes || '');
        if (e.splits) {
          const vals: Record<string, string> = {};
          const shares: Record<string, string> = {};
          for (const s of e.splits) {
            const member = members.find((m: any) => m.userId === s.userId);
            const key = member?.id || s.userId;
            if (e.splitType === 'shares') shares[key] = String(s.shares || '');
            else if (e.splitType === 'percentage') vals[key] = String(s.percentage || '');
            else vals[key] = String(s.amount || '');
          }
          setSplitValues(vals);
          setSharesCount(shares);
        }
      }
    } catch { /* ignore */ }
  }

  const splitPreview = React.useMemo(() => {
    const amt = Number(amount) || 0;
    if (members.length === 0) return [];
    if (splitType === 'equal') {
      const share = amt / members.length;
      return members.map((m: any) => ({ name: m.user?.firstName || m.user?.email || 'Member', value: share }));
    }
    if (splitType === 'percentage') {
      const totalPct = Object.values(splitValues).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalPct === 0) return [];
      return members.map((m: any) => { const pct = Number(splitValues[m.id]) || 0; return { name: m.user?.firstName || m.user?.email || 'Member', value: (amt * pct) / 100, detail: `${pct}%` }; });
    }
    if (splitType === 'exact') {
      return members.map((m: any) => ({ name: m.user?.firstName || m.user?.email || 'Member', value: Number(splitValues[m.id]) || 0, detail: `₹${Number(splitValues[m.id]) || 0}` }));
    }
    if (splitType === 'shares') {
      const totalShares = Object.values(sharesCount).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalShares === 0) return [];
      return members.map((m: any) => { const s = Number(sharesCount[m.id]) || 0; return { name: m.user?.firstName || m.user?.email || 'Member', value: (amt * s) / totalShares, detail: `${s} share${s !== 1 ? 's' : ''}` }; });
    }
    return [];
  }, [amount, splitType, members, splitValues, sharesCount]);

  async function handleSave() {
    if (!description.trim()) { setError('Description is required'); return; }
    if (!amount || Number(amount) <= 0) { setError('Valid amount is required'); return; }
    if (!paidBy) { setError('Select who paid'); return; }
    setError(''); setSaving(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const totalAmt = Number(amount) || 0;
      const totalShares = Object.values(sharesCount).reduce((s, v) => s + (Number(v) || 0), 0);
      const splits = members.map((m: any) => {
        const splitBase: any = { userId: m.userId };
        if (splitType === 'percentage') { const pct = Number(splitValues[m.id]) || 0; splitBase.amount = (totalAmt * pct) / 100; splitBase.percentage = pct; }
        else if (splitType === 'exact') splitBase.amount = Number(splitValues[m.id]) || 0;
        else if (splitType === 'shares') { const s = Number(sharesCount[m.id]) || 0; splitBase.shares = s; splitBase.amount = totalShares > 0 ? (totalAmt * s) / totalShares : 0; }
        return splitBase;
      });
      const payload = { description: description.trim(), amount: Number(amount), paidBy, category, splitType, splits: splitType !== 'equal' ? splits : undefined, notes: notes.trim() || undefined };
      if (edit && expenseId) await api.patch(`/shared-finance/expenses/${expenseId}`, payload);
      else await api.post(`/shared-finance/groups/${groupId}/expenses`, payload);
      navigation.goBack();
    } catch (e: any) { setError(e.message || 'Failed to save expense'); }
    finally { setSaving(false); }
  }

  const maxPreviewValue = Math.max(...splitPreview.map(i => i.value), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <View
            
             
            style={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => {
                Keyboard.dismiss();
                navigation.goBack();
              }} style={styles.backBtn}>
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{edit ? 'Edit Expense' : 'Add Expense'}</Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={styles.headerBadge}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.headerSub}>Split with {members.length} member{members.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          <View style={{ padding: 20, gap: 20 }}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}15` }]}>
                <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Amount Card */}
            <View style={[styles.glassCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                <View style={styles.amountSection}>
                  <View style={styles.amountRow}>
                    <Text style={[styles.amountCurrency, { color: colors.text.primary }]}>₹</Text>
                    <TextInput
                      ref={inputRef}
                      style={[styles.amountInput, { color: colors.text.primary }]}
                      value={amount}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9.]/g, '');
                        const dotCount = cleaned.split('.').length - 1;
                        if (dotCount > 1) return;
                        setAmount(cleaned);
                        setError('');
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.text.tertiary}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <View style={[styles.amountUnderline, { backgroundColor: colors.border.subtle }]}>
                    <View style={[styles.amountUnderlineActive, { width: amount ? `${Math.min(Number(amount) / 100 * 100, 100)}%` : '0%', backgroundColor: colors.accent.primary }]} />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>

            {/* Description Card */}
            <View style={[styles.glassCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.cardLabel, { color: colors.text.tertiary }]}>Description</Text>
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={description} onChangeText={setDescription} placeholder="What was this for?" placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* Paid By Card */}
            <View style={[styles.glassCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.cardLabel, { color: colors.text.tertiary }]}>Paid By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {members.map((m: any) => {
                  const selected = paidBy === m.userId;
                  const initial = (m.user?.firstName?.[0] || '?').toUpperCase();
                  const name = m.user?.firstName || m.user?.email || 'Member';
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      style={[styles.payerChip, { borderColor: selected ? colors.accent.primary : colors.border.subtle, backgroundColor: selected ? `${colors.accent.primary}15` : colors.bg.card }]}
                      onPress={() => setPaidBy(m.userId)}
                    >
                      <View  style={styles.payerDot}>
                        <Text style={styles.payerInit}>{initial}</Text>
                      </View>
                      <Text style={[styles.payerName, { color: selected ? colors.accent.primary : colors.text.secondary }]}>{name}</Text>
                      {selected && <Ionicons name="checkmark-circle" size={14} color={colors.accent.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Category Grid */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>Category</Text>
              <View style={styles.categoryGrid}>
                {EXPENSE_CATEGORIES.map((cat, i) => {
                  const selected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: selected ? `${cat.color}15` : colors.bg.card,
                          borderColor: selected ? cat.color : colors.border.subtle,
                        },
                      ]}
                      onPress={() => setCategory(selected ? '' : cat.name)}
                    >
                      <View style={[styles.catIcon, { backgroundColor: selected ? cat.color : `${cat.color}12` }]}>
                        <Ionicons name={cat.icon as any} size={20} color={selected ? '#FFF' : cat.color} />
                      </View>
                      <Text
                        style={[styles.catName, { color: selected ? colors.text.primary : colors.text.secondary }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Split Method */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>Split Method</Text>
              <View style={styles.splitTypeRow}>
                {SPLIT_TYPES.map((st) => {
                  const active = splitType === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      style={[styles.splitTypeCard, { borderColor: active ? colors.accent.primary : colors.border.subtle, backgroundColor: active ? `${colors.accent.primary}15` : colors.bg.card }]}
                      onPress={() => setSplitType(st.key)}
                    >
                      <Ionicons name={st.icon as any} size={18} color={active ? colors.accent.primary : colors.text.tertiary} />
                      <Text style={[styles.splitTypeText, { color: active ? colors.accent.primary : colors.text.secondary }]}>{st.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Member Split Inputs */}
            {(splitType === 'percentage' || splitType === 'exact' || splitType === 'shares') && (
              <View style={[styles.glassCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                <Text style={[styles.cardLabel, { color: colors.text.tertiary }]}>
                  {splitType === 'percentage' ? 'Percentages' : splitType === 'exact' ? 'Exact Amounts' : 'Shares'}
                </Text>
                {members.map((m: any) => {
                  const mName = m.user?.firstName || m.user?.email || 'Member';
                  const val = splitType === 'shares' ? sharesCount[m.id] || '' : splitValues[m.id] || '';
                  return (
                    <View key={m.id} style={[styles.splitMemberRow, { borderBottomColor: colors.border.subtle }]}>
                      <View  style={styles.splitMemberDot}>
                        <Text style={styles.splitMemberInit}>{(mName[0] || '?').toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.splitMemberName, { color: colors.text.secondary }]}>{mName}</Text>
                      <View style={[styles.splitInputWrap, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
                        {splitType === 'exact' && <Text style={[styles.splitPrefix, { color: colors.text.tertiary }]}>₹</Text>}
                        <TextInput
                          style={[styles.splitInput, { color: colors.text.primary }]}
                          value={val}
                          onChangeText={(v) => { splitType === 'shares' ? setSharesCount((prev) => ({ ...prev, [m.id]: v })) : setSplitValues((prev) => ({ ...prev, [m.id]: v })); }}
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

            {/* Split Preview */}
            <View style={[styles.glassCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.cardLabel, { color: colors.text.tertiary }]}>Split Preview</Text>
              {splitPreview.length > 0 && maxPreviewValue > 0 ? (
                splitPreview.map((item, i) => {
                  const barWidth = (item.value / maxPreviewValue) * 100;
                  return (
                    <View key={i} style={styles.previewItem}>
                      <View style={styles.previewInfo}>
                        <Text style={[styles.previewName, { color: colors.text.primary }]}>{item.name}</Text>
                      <Text style={[styles.previewAmount, { color: colors.text.primary }]}>
                          {'detail' in item && item.detail ? `${item.detail} · ₹${Math.round(item.value)}` : `₹${Math.round(item.value)}`}
                        </Text>
                      </View>
                      <View style={[styles.previewBarBg, { backgroundColor: colors.bg.tertiary }]}>
                        <View style={[styles.previewBarFill, { width: `${barWidth}%` }]} />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.previewEmptyWrap}>
                  <Ionicons name="calculator-outline" size={24} color={colors.text.tertiary} />
                  <Text style={[styles.previewEmpty, { color: colors.text.tertiary }]}>Enter amount to see split preview</Text>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={[styles.glassCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.cardLabel, { color: colors.text.tertiary }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.notesInput, { color: colors.text.primary }]}
                value={notes} onChangeText={setNotes} placeholder="Any additional notes..." placeholderTextColor={colors.text.tertiary} multiline
              />
            </View>

            {/* Save Button */}
            <View
              
               
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={styles.saveBtnInner}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>{edit ? 'Update Expense' : 'Save Expense'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, gap: 8 },
  errorText: { fontSize: 13, flex: 1 },

  glassCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 0 },

  amountSection: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  amountCurrency: { fontSize: 36, fontWeight: '800' },
  amountInput: { fontSize: 40, fontWeight: '800', letterSpacing: -1, textAlign: 'center', minWidth: 120, paddingVertical: 0 },
  amountUnderline: { height: 3, borderRadius: 2, width: '60%', marginTop: 4 },
  amountUnderlineActive: { height: 3, borderRadius: 2 },

  cardLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingVertical: 4, paddingHorizontal: 0 },

  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: {
    width: '23%', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  chipRow: { gap: 8, paddingBottom: 4 },
  payerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  payerDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  payerInit: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  payerName: { fontSize: 13, fontWeight: '600' },

  splitTypeRow: { flexDirection: 'row', gap: 8 },
  splitTypeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  splitTypeText: { fontSize: 12, fontWeight: '600' },

  splitMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  splitMemberDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  splitMemberInit: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  splitMemberName: { fontSize: 14, fontWeight: '500', flex: 1 },
  splitInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, width: 100 },
  splitPrefix: { fontSize: 13, fontWeight: '600', marginRight: 2 },
  splitInput: { flex: 1, fontSize: 13, paddingVertical: 8, textAlign: 'right' },

  previewItem: { marginBottom: 12 },
  previewInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  previewName: { fontSize: 14, fontWeight: '500' },
  previewAmount: { fontSize: 14, fontWeight: '700' },
  previewBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  previewBarFill: { height: 6, borderRadius: 3, backgroundColor: '#F97316' },
  previewEmptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  previewEmpty: { fontSize: 13, textAlign: 'center' },

  notesInput: { fontSize: 15, paddingVertical: 4, paddingHorizontal: 0, minHeight: 60, textAlignVertical: 'top' },

  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  saveBtnInner: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
