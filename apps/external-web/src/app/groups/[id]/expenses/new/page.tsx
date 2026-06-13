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
import { api, type Group, type Member } from '@/lib/api';
import { formatCurrency, CATEGORIES, SPLIT_TYPES } from '@/lib/utils';
import { AuthGuard } from '@/components/auth-guard';
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

  const [shares, setShares] = useState<
    { memberId: string; memberName: string; amount: number; percentage: number }[]
  >([]);

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || '';

  useEffect(() => {
    if (!groupId) {
      return;
    }
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    const res = await api.groups.get(groupId);
    if (res.error) {
      toast.error(res.error);
      router.push('/');
      return;
    }
    const g = res.data!;
    setGroup(g);
    setPaidById(currentUserId || g.members[0]?.id || '');
    setShares(
      g.members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        amount: 0,
        percentage: 0,
      })),
    );
    setLoading(false);
  };

  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => {
    if (!group || !parsedAmount) {
      return;
    }

    setShares((prev) => {
      return prev.map((share) => {
        if (splitType === 'equal') {
          return {
            ...share,
            amount: parsedAmount / group.members.length,
            percentage: 100 / group.members.length,
          };
        }
        if (splitType === 'percentage') {
          return {
            ...share,
            amount: (parsedAmount * share.percentage) / 100,
          };
        }
        return share;
      });
    });
  }, [parsedAmount, splitType, group]);

  const updateShareAmount = (memberId: string, value: number) => {
    setShares((prev) => prev.map((s) => (s.memberId === memberId ? { ...s, amount: value } : s)));
  };

  const updateSharePercentage = (memberId: string, value: number) => {
    setShares((prev) =>
      prev.map((s) =>
        s.memberId === memberId
          ? { ...s, percentage: value, amount: (parsedAmount * value) / 100 }
          : s,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const totalShares = shares.reduce((s, share) => s + share.amount, 0);
    if (Math.abs(totalShares - parsedAmount) > 1) {
      toast.error(
        `Share total (${formatCurrency(totalShares)}) doesn't match amount (${formatCurrency(parsedAmount)})`,
      );
      return;
    }

    setSubmitting(true);
    const res = await api.expenses.create(groupId, {
      description: description.trim(),
      amount: parsedAmount,
      category,
      splitType,
      paidById,
      shares: shares.map((s) => ({
        memberId: s.memberId,
        amount: parseFloat(s.amount.toFixed(2)),
        percentage: splitType === 'percentage' ? s.percentage : undefined,
      })),
    });

    if (res.error) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }

    toast.success('Expense added!');
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

  const categoryOptions = CATEGORIES.map((c) => ({ value: c.value, label: c.label }));
  const memberOptions = group.members.map((m) => ({
    value: m.id,
    label: m.id === currentUserId ? 'You' : m.name,
  }));
  const splitTypeOptions = SPLIT_TYPES.map((st) => ({ value: st.value, label: st.label }));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Row style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Expense</Text>
          </Row>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.amountCard}>
          <AmountInput value={amount} onChangeText={setAmount} autoFocus />
          <Text style={styles.amountHint}>Enter the total amount</Text>
        </Card>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            placeholder="What's this for?"
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
            placeholderTextColor="var(--dabbu-text-muted, #64748B)"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <Select value={category} onValueChange={setCategory} options={categoryOptions} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Paid by</Text>
          <Select value={paidById} onValueChange={setPaidById} options={memberOptions} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Split type</Text>
          <Select value={splitType} onValueChange={setSplitType} options={splitTypeOptions} />
        </View>

        <Card>
          <Text style={styles.splitTitle}>Split Preview</Text>
          {shares.map((share) => {
            const member = group.members.find((m) => m.id === share.memberId);
            if (!member) {
              return null;
            }
            const isYou = share.memberId === currentUserId;
            const colorIndex = share.memberId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

            return (
              <View key={share.memberId} style={styles.shareRow}>
                <View
                  style={[
                    styles.shareAvatar,
                    {
                      backgroundColor: `hsl(${(colorIndex * 45) % 360}, 70%, 50%)`,
                    },
                  ]}
                >
                  <Text style={styles.shareAvatarText}>
                    {share.memberName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareName}>{isYou ? 'You' : share.memberName}</Text>
                  {splitType === 'percentage' && (
                    <TextInput
                      value={share.percentage.toFixed(1)}
                      onChangeText={(v) =>
                        updateSharePercentage(share.memberId, parseFloat(v) || 0)
                      }
                      style={styles.sharePctInput}
                      keyboardType="numeric"
                    />
                  )}
                </View>
                <View style={styles.shareAmount}>
                  {splitType === 'exact' ? (
                    <TextInput
                      value={share.amount ? String(share.amount) : ''}
                      onChangeText={(v) => updateShareAmount(share.memberId, parseFloat(v) || 0)}
                      style={styles.shareAmountInput}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="var(--dabbu-text-muted, #64748B)"
                    />
                  ) : (
                    <Text style={styles.shareAmountText}>{formatCurrency(share.amount)}</Text>
                  )}
                  {splitType === 'percentage' && (
                    <Text style={styles.shareAmountSub}>{formatCurrency(share.amount)}</Text>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text
              style={[
                styles.totalValue,
                Math.abs(shares.reduce((s, share) => s + share.amount, 0) - parsedAmount) > 1
                  ? styles.red
                  : styles.green,
              ]}
            >
              {formatCurrency(shares.reduce((s, share) => s + share.amount, 0))}
            </Text>
          </View>
        </Card>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        >
          <Text style={styles.submitBtnText}>{submitting ? 'Adding...' : 'Add Expense'}</Text>
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
  amountCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.lg,
  },
  amountHint: {
    fontSize: 14,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: spacing.sm,
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
  splitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    marginBottom: spacing.md,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  shareAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareInfo: {
    flex: 1,
  },
  shareName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  sharePctInput: {
    width: 64,
    fontSize: 12,
    color: 'var(--dabbu-accent, #8B5CF6)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--dabbu-border, #2A2A2E)',
    paddingVertical: 2,
  },
  shareAmount: {
    alignItems: 'flex-end',
  },
  shareAmountInput: {
    width: 96,
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--dabbu-border, #2A2A2E)',
    paddingVertical: 2,
  },
  shareAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  shareAmountSub: {
    fontSize: 10,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'var(--dabbu-border, #2A2A2E)',
  },
  totalLabel: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  green: {
    color: 'var(--dabbu-green, #10B981)',
  },
  red: {
    color: 'var(--dabbu-red, #EF4444)',
  },
  submitBtn: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
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
