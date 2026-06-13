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
  Spacer,
  StyleSheet,
  spacing,
  radii,
} from '@/rn';
import { api, type Group, type Member, type Expense } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
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
    if (!groupId) {
      return;
    }
    loadData();
  }, [groupId]);

  const loadData = async () => {
    const [groupRes, expensesRes] = await Promise.all([
      api.groups.get(groupId),
      api.expenses.list(groupId),
    ]);

    if (groupRes.error) {
      toast.error(groupRes.error);
      router.push('/');
      return;
    }

    const g = groupRes.data!;
    setGroup(g);
    setExpenses(expensesRes.data || []);

    const otherMembers = g.members.filter((m) => m.id !== currentUserId);
    if (otherMembers.length > 0) {
      setFromId(currentUserId || otherMembers[0].id);
      setToId(otherMembers[0].id);
    }

    setLoading(false);
  };

  const memberBalance = (memberId: string): number => {
    return group?.members.find((m) => m.id === memberId)?.balance || 0;
  };

  const getDebtSuggestions = () => {
    if (!group) {
      return [];
    }
    const debtors = group.members
      .filter((m) => m.balance < 0)
      .sort((a, b) => a.balance - b.balance);
    const creditors = group.members
      .filter((m) => m.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const suggestions: { from: Member; to: Member; amount: number }[] = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const debtAmount = Math.abs(debtor.balance);
      const creditAmount = creditor.balance;
      const settleAmount = Math.min(debtAmount, creditAmount);

      if (settleAmount > 0) {
        suggestions.push({
          from: debtor,
          to: creditor,
          amount: settleAmount,
        });
      }

      if (debtAmount <= creditAmount) {
        i++;
      }
      if (creditAmount <= debtAmount) {
        j++;
      }
    }

    return suggestions;
  };

  const handleSubmit = async () => {
    if (!fromId || !toId) {
      toast.error('Please select who pays and who receives');
      return;
    }
    if (fromId === toId) {
      toast.error('Cannot settle with yourself');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    const res = await api.settlements.create(groupId, {
      fromId,
      toId,
      amount: parsedAmount,
      method,
      note: note.trim() || undefined,
    });

    if (res.error) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }

    toast.success('Settlement created!');
    router.push(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loader} />
      </View>
    );
  }

  if (!group) {
    return null;
  }

  const suggestions = getDebtSuggestions();
  const fromBalance = memberBalance(fromId);
  const toBalance = memberBalance(toId);

  const memberOptions = group.members.map((m) => ({
    value: m.id,
    label: m.id === currentUserId ? 'You' : m.name,
  }));
  const payeeOptions = group.members
    .filter((m) => m.id !== fromId)
    .map((m) => ({
      value: m.id,
      label: m.id === currentUserId ? 'You' : m.name,
    }));

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const avatarColor = (id: string) => {
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return `hsl(${(hash * 45) % 360}, 70%, 50%)`;
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Row style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settle Up</Text>
          </Row>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {suggestions.length > 0 && (
          <Card variant="accent" style={styles.suggestionCard}>
            <Row style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>Suggested Settlements</Text>
            </Row>
            {suggestions.slice(0, 3).map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  setFromId(s.from.id);
                  setToId(s.to.id);
                  setAmount(s.amount.toString());
                }}
                style={styles.suggestionItem}
              >
                <Row style={{ gap: spacing.sm }}>
                  <View
                    style={[styles.suggestionAvatar, { backgroundColor: avatarColor(s.from.id) }]}
                  >
                    <Text style={styles.suggestionAvatarText}>{getInitials(s.from.name)}</Text>
                  </View>
                  <Text style={styles.suggestionAction}>pays</Text>
                  <View
                    style={[styles.suggestionAvatar, { backgroundColor: avatarColor(s.to.id) }]}
                  >
                    <Text style={styles.suggestionAvatarText}>{getInitials(s.to.name)}</Text>
                  </View>
                </Row>
                <Text style={styles.suggestionAmount}>{formatCurrency(s.amount)}</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Who pays?</Text>
          <Select value={fromId} onValueChange={setFromId} options={memberOptions} />
          {fromBalance < 0 && (
            <Text style={styles.balanceHint}>Owes {formatCurrency(Math.abs(fromBalance))}</Text>
          )}
        </View>

        <View style={styles.arrowWrap}>
          <View style={styles.arrowCircle}>
            <Text style={styles.arrowIcon}>{'→'}</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Who gets paid?</Text>
          <Select value={toId} onValueChange={setToId} options={payeeOptions} />
          {toBalance > 0 && (
            <Text style={[styles.balanceHint, styles.greenText]}>
              Is owed {formatCurrency(toBalance)}
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <Card style={styles.amountCard}>
            <AmountInput value={amount} onChangeText={setAmount} autoFocus />
          </Card>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payment method</Text>
          <Select value={method} onValueChange={setMethod} options={PAYMENT_METHODS} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Note (optional)</Text>
          <TextInput
            placeholder="What's this for?"
            value={note}
            onChangeText={setNote}
            style={styles.textInput}
            placeholderTextColor="var(--dabbu-text-muted, #64748B)"
          />
        </View>

        <Card style={styles.summaryCard}>
          <Row style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>From</Text>
            <Text style={styles.summaryValue}>
              {group.members.find((m) => m.id === fromId)?.name || 'Select payer'}
            </Text>
          </Row>
          <Row style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>To</Text>
            <Text style={styles.summaryValue}>
              {group.members.find((m) => m.id === toId)?.name || 'Select receiver'}
            </Text>
          </Row>
          <View style={styles.summaryDivider} />
          <Row style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(parseFloat(amount) || 0)}</Text>
          </Row>
        </Card>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Creating...' : 'Create Settlement'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  loader: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
  },
  header: {
    backgroundColor: 'var(--dabbu-surface, #121214)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--dabbu-border, #2A2A2E)',
  },
  headerInner: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    height: 64,
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  backIcon: {
    fontSize: 20,
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 40,
  },
  suggestionCard: {
    marginBottom: spacing.lg,
  },
  suggestionHeader: {
    marginBottom: spacing.md,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: 'var(--dabbu-surface, #121214)',
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  suggestionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suggestionAction: {
    fontSize: 12,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  suggestionAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    marginBottom: spacing.sm + 2,
  },
  balanceHint: {
    fontSize: 12,
    color: 'var(--dabbu-red, #EF4444)',
    marginTop: spacing.xs,
  },
  greenText: {
    color: 'var(--dabbu-green, #10B981)',
  },
  arrowWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: 20,
    color: 'var(--dabbu-accent, #8B5CF6)',
    fontWeight: '700',
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  textInput: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: 'var(--dabbu-surface, #121214)',
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'var(--dabbu-border, #2A2A2E)',
    marginVertical: spacing.sm,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  submitBtn: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
