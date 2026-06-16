'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Card,
  Select,
  AmountInput,
  Row,
  StyleSheet,
  spacing,
  radii,
} from '@/rn';
import { api, type Group } from '@/lib/api';
import { formatCurrency, CATEGORIES, SPLIT_TYPES } from '@/lib/utils';
import { toast } from 'sonner';

export default function NewExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [splitType, setSplitType] = useState('equal');
  const [paidById, setPaidById] = useState('');
  const [shares, setShares] = useState<{ memberId: string; memberName: string; amount: number; percentage: number }[]>([]);

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || '';

  useEffect(() => {
    if (!groupId) return;
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    const res = await api.groups.get(groupId);
    if (res.error) { toast.error(res.error); router.push('/'); return; }
    const g = res.data!;
    setGroup(g);
    setPaidById(currentUserId || g.members[0]?.id || '');
    setShares(g.members.map((m) => ({ memberId: m.id, memberName: m.name, amount: 0, percentage: 0 })));
    setLoading(false);
  };

  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => {
    if (!group || !parsedAmount) return;
    setShares((prev) => prev.map((share) => {
      if (splitType === 'equal') return { ...share, amount: parsedAmount / group.members.length, percentage: 100 / group.members.length };
      if (splitType === 'percentage') return { ...share, amount: (parsedAmount * share.percentage) / 100 };
      return share;
    }));
  }, [parsedAmount, splitType, group]);

  const updateShareAmount = (memberId: string, value: number) => {
    setShares((prev) => prev.map((s) => (s.memberId === memberId ? { ...s, amount: value } : s)));
  };

  const updateSharePercentage = (memberId: string, value: number) => {
    setShares((prev) => prev.map((s) => s.memberId === memberId ? { ...s, percentage: value, amount: (parsedAmount * value) / 100 } : s));
  };

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error('Please enter a description'); return; }
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Please enter a valid amount'); return; }
    const totalShares = shares.reduce((s, share) => s + share.amount, 0);
    if (Math.abs(totalShares - parsedAmount) > 1) { toast.error(`Share total (${formatCurrency(totalShares)}) doesn't match amount (${formatCurrency(parsedAmount)})`); return; }
    setSubmitting(true);
    const res = await api.expenses.create(groupId, {
      description: description.trim(), amount: parsedAmount, category, splitType, paidById,
      shares: shares.map((s) => ({ memberId: s.memberId, amount: parseFloat(s.amount.toFixed(2)), percentage: splitType === 'percentage' ? s.percentage : undefined })),
    });
    if (res.error) { toast.error(res.error); setSubmitting(false); return; }
    toast.success('Expense added!');
    router.push(`/groups/${groupId}`);
  };

  if (loading) return <View style={s.centered}><View style={s.loader} /></View>;
  if (!group) return null;

  const categoryOptions = CATEGORIES.map((c) => ({ value: c.value, label: c.label }));
  const memberOptions = group.members.map((m) => ({ value: m.id, label: m.id === currentUserId ? 'You' : m.name }));
  const splitTypeOptions = SPLIT_TYPES.map((st) => ({ value: st.value, label: st.label }));

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Row style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add Expense</Text>
        </Row>
      </View>
      <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl, marginBottom: spacing.lg }}>
          <AmountInput value={amount} onChangeText={setAmount} autoFocus placeholder="₹0" />
          <Text style={s.amountHint}>Enter the total amount</Text>
        </Card>

        <View style={s.group}>
          <Text style={s.label}>Description</Text>
          <TextInput placeholder="What's this for?" value={description} onChangeText={setDescription} style={s.input} placeholderTextColor="var(--dabbu-text-muted)" />
        </View>

        <View style={s.group}>
          <Text style={s.label}>Category</Text>
          <Select value={category} onValueChange={setCategory} options={categoryOptions} />
        </View>

        <View style={s.group}>
          <Text style={s.label}>Paid by</Text>
          <Select value={paidById} onValueChange={setPaidById} options={memberOptions} />
        </View>

        <View style={s.group}>
          <Text style={s.label}>Split type</Text>
          <Select value={splitType} onValueChange={setSplitType} options={splitTypeOptions} />
        </View>

        <Card>
          <Text style={s.splitTitle}>Split Preview</Text>
          {shares.map((share) => {
            const member = group.members.find((m) => m.id === share.memberId);
            if (!member) return null;
            const isYou = share.memberId === currentUserId;
            const cIndex = share.memberId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            return (
              <View key={share.memberId} style={s.shareRow}>
                <View style={[s.shareAvatar, { backgroundColor: `hsl(${(cIndex * 45) % 360}, 60%, 50%)` }]}>
                  <Text style={s.shareAvatarText}>{share.memberName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.shareName}>{isYou ? 'You' : share.memberName}</Text>
                  {splitType === 'percentage' && (
                    <TextInput value={share.percentage.toFixed(1)} onChangeText={(v) => updateSharePercentage(share.memberId, parseFloat(v) || 0)} style={s.sharePctInput} keyboardType="numeric" />
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {splitType === 'exact' ? (
                    <TextInput value={share.amount ? String(share.amount) : ''} onChangeText={(v) => updateShareAmount(share.memberId, parseFloat(v) || 0)} style={s.shareAmountInput} placeholder="0" keyboardType="numeric" placeholderTextColor="var(--dabbu-text-muted)" />
                  ) : (
                    <Text style={s.shareAmountText}>{formatCurrency(share.amount)}</Text>
                  )}
                  {splitType === 'percentage' && <Text style={{ fontSize: 10, color: 'var(--dabbu-text-muted)', marginTop: 2 }}>{formatCurrency(share.amount)}</Text>}
                </View>
              </View>
            );
          })}
          <View style={s.totalRow}>
            <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>Total</Text>
            <Text style={[s.totalValue, Math.abs(shares.reduce((s, share) => s + share.amount, 0) - parsedAmount) > 1 ? s.red : s.green]}>
              {formatCurrency(shares.reduce((s, share) => s + share.amount, 0))}
            </Text>
          </View>
        </Card>

        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[s.submitBtn, submitting && { opacity: 0.6 }]}>
          <Text style={s.submitBtnText}>{submitting ? 'Adding...' : 'Add Expense'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'var(--dabbu-bg)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--dabbu-bg)' },
  loader: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'var(--dabbu-accent)' },
  header: { borderBottomWidth: 1, borderBottomColor: 'var(--dabbu-border)' },
  headerRow: { height: 60, alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  backBtn: { padding: spacing.sm, borderRadius: radii.md },
  backIcon: { fontSize: 20, color: 'var(--dabbu-text)' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: 'var(--dabbu-text)' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl + 40 },
  amountHint: { fontSize: 13, color: 'var(--dabbu-text-muted)', marginTop: spacing.sm },
  group: { marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: 'var(--dabbu-text-secondary)', marginBottom: spacing.sm },
  input: { height: 48, borderRadius: radii.md, backgroundColor: 'var(--dabbu-surface)', borderWidth: 1, borderColor: 'var(--dabbu-border)', paddingHorizontal: spacing.lg, fontSize: 15, color: 'var(--dabbu-text)' },
  splitTitle: { fontSize: 15, fontWeight: '600', color: 'var(--dabbu-text)', marginBottom: spacing.md },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  shareAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  shareAvatarText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  shareName: { fontSize: 14, fontWeight: '500', color: 'var(--dabbu-text)' },
  sharePctInput: { width: 64, fontSize: 12, color: 'var(--dabbu-accent)', borderBottomWidth: 1, borderBottomColor: 'var(--dabbu-border)', paddingVertical: 2 },
  shareAmountInput: { width: 96, fontSize: 14, fontWeight: '500', color: 'var(--dabbu-text)', textAlign: 'right', borderBottomWidth: 1, borderBottomColor: 'var(--dabbu-border)', paddingVertical: 2 },
  shareAmountText: { fontSize: 14, fontWeight: '500', color: 'var(--dabbu-text)' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'var(--dabbu-border)' },
  totalValue: { fontSize: 14, fontWeight: '600' },
  green: { color: 'var(--dabbu-green)' },
  red: { color: 'var(--dabbu-red)' },
  submitBtn: { height: 52, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
