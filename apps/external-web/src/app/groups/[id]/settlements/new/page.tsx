'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Card, Select, AmountInput,
  Row, StyleSheet, spacing, radii,
} from '@/rn';
import { api, type Group, type Member, type Expense } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' }, { value: 'paypal', label: 'PayPal' }, { value: 'other', label: 'Other' },
];

export default function NewSettlementPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [note, setNote] = useState('');

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || '';

  useEffect(() => {
    if (!groupId) return;
    loadData();
  }, [groupId]);

  const loadData = async () => {
    const [groupRes, expensesRes] = await Promise.all([api.groups.get(groupId), api.expenses.list(groupId)]);
    if (groupRes.error) { toast.error(groupRes.error); router.push('/'); return; }
    const g = groupRes.data!;
    setGroup(g);
    setExpenses(expensesRes.data || []);
    const others = g.members.filter((m) => m.id !== currentUserId);
    if (others.length > 0) { setFromId(currentUserId || others[0].id); setToId(others[0].id); }
    setLoading(false);
  };

  const memberBalance = (memberId: string): number => group?.members.find((m) => m.id === memberId)?.balance || 0;

  const getDebtSuggestions = () => {
    if (!group) return [];
    const debtors = group.members.filter((m) => m.balance < 0).sort((a, b) => a.balance - b.balance);
    const creditors = group.members.filter((m) => m.balance > 0).sort((a, b) => b.balance - a.balance);
    const suggestions: { from: Member; to: Member; amount: number }[] = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i], creditor = creditors[j];
      const settle = Math.min(Math.abs(debtor.balance), creditor.balance);
      if (settle > 0) suggestions.push({ from: debtor, to: creditor, amount: settle });
      if (Math.abs(debtor.balance) <= creditor.balance) i++;
      if (creditor.balance <= Math.abs(debtor.balance)) j++;
    }
    return suggestions;
  };

  const handleSubmit = async () => {
    if (!fromId || !toId) { toast.error('Please select who pays and who receives'); return; }
    if (fromId === toId) { toast.error('Cannot settle with yourself'); return; }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Please enter a valid amount'); return; }
    setSubmitting(true);
    const res = await api.settlements.create(groupId, { fromId, toId, amount: parsedAmount, method, note: note.trim() || undefined });
    if (res.error) { toast.error(res.error); setSubmitting(false); return; }
    toast.success('Settlement created!');
    router.push(`/groups/${groupId}`);
  };

  if (loading) return <View style={s.centered}><View style={s.loader} /></View>;
  if (!group) return null;

  const suggestions = getDebtSuggestions();
  const fromBalance = memberBalance(fromId);
  const toBalance = memberBalance(toId);
  const memberOptions = group.members.map((m) => ({ value: m.id, label: m.id === currentUserId ? 'You' : m.name }));
  const payeeOptions = group.members.filter((m) => m.id !== fromId).map((m) => ({ value: m.id, label: m.id === currentUserId ? 'You' : m.name }));
  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const avColor = (id: string) => `hsl(${(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 45) % 360}, 60%, 50%)`;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Row style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Settle Up</Text>
        </Row>
      </View>
      <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
        {suggestions.length > 0 && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={s.sectionTitle}>Suggested Settlements</Text>
            {suggestions.slice(0, 3).map((sg, i) => (
              <TouchableOpacity key={i} onPress={() => { setFromId(sg.from.id); setToId(sg.to.id); setAmount(sg.amount.toString()); }} style={s.suggestionItem}>
                <Row style={{ gap: spacing.sm }}>
                  <View style={[s.suggAvatar, { backgroundColor: avColor(sg.from.id) }]}><Text style={s.suggAvatarText}>{initials(sg.from.name)}</Text></View>
                  <Text style={{ fontSize: 12, color: 'var(--dabbu-text-secondary)' }}>pays</Text>
                  <View style={[s.suggAvatar, { backgroundColor: avColor(sg.to.id) }]}><Text style={s.suggAvatarText}>{initials(sg.to.name)}</Text></View>
                </Row>
                <Text style={{ fontSize: 14, fontWeight: '600', color: 'var(--dabbu-accent)' }}>{formatCurrency(sg.amount)}</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <View style={s.group}>
          <Text style={s.label}>Who pays?</Text>
          <Select value={fromId} onValueChange={setFromId} options={memberOptions} />
          {fromBalance < 0 && <Text style={{ fontSize: 12, color: 'var(--dabbu-red)', marginTop: 4 }}>Owes {formatCurrency(Math.abs(fromBalance))}</Text>}
        </View>

        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <View style={s.arrow}><Text style={s.arrowIcon}>→</Text></View>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Who gets paid?</Text>
          <Select value={toId} onValueChange={setToId} options={payeeOptions} />
          {toBalance > 0 && <Text style={{ fontSize: 12, color: 'var(--dabbu-green)', marginTop: 4 }}>Is owed {formatCurrency(toBalance)}</Text>}
        </View>

        <View style={s.group}>
          <Text style={s.label}>Amount</Text>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <AmountInput value={amount} onChangeText={setAmount} autoFocus />
          </Card>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Payment method</Text>
          <Select value={method} onValueChange={setMethod} options={PAYMENT_METHODS} />
        </View>

        <View style={s.group}>
          <Text style={s.label}>Note (optional)</Text>
          <TextInput placeholder="What's this for?" value={note} onChangeText={setNote} style={s.input} placeholderTextColor="var(--dabbu-text-muted)" />
        </View>

        <Card style={{ marginBottom: spacing.lg }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>From</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: 'var(--dabbu-text)' }}>{group.members.find((m) => m.id === fromId)?.name || 'Select payer'}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>To</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: 'var(--dabbu-text)' }}>{group.members.find((m) => m.id === toId)?.name || 'Select receiver'}</Text>
          </Row>
          <View style={{ height: 1, backgroundColor: 'var(--dabbu-border)', marginVertical: spacing.sm }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>Amount</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: 'var(--dabbu-accent)' }}>{formatCurrency(parseFloat(amount) || 0)}</Text>
          </Row>
        </Card>

        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[s.submitBtn, submitting && { opacity: 0.6 }]}>
          <Text style={s.submitBtnText}>{submitting ? 'Creating...' : 'Create Settlement'}</Text>
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
  sectionTitle: { fontSize: 14, fontWeight: '600', color: 'var(--dabbu-text)', marginBottom: spacing.md },
  suggestionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: 'var(--dabbu-surface2)', borderRadius: radii.md, marginBottom: 4 },
  suggAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  suggAvatarText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'var(--dabbu-surface2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'var(--dabbu-border)' },
  arrowIcon: { fontSize: 18, color: 'var(--dabbu-accent)', fontWeight: '600' },
  group: { marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: 'var(--dabbu-text-secondary)', marginBottom: spacing.sm },
  input: { height: 48, borderRadius: radii.md, backgroundColor: 'var(--dabbu-surface)', borderWidth: 1, borderColor: 'var(--dabbu-border)', paddingHorizontal: spacing.lg, fontSize: 15, color: 'var(--dabbu-text)' },
  submitBtn: { height: 52, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
