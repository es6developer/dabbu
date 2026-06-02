'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type Group, type Member, type Expense } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-dabbu-accent animate-pulse mx-auto" />
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const suggestions = getDebtSuggestions();
  const fromBalance = memberBalance(fromId);
  const toBalance = memberBalance(toId);

  return (
    <div className="min-h-screen bg-dabbu-bg pb-20">
      <header className="glass-effect sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-dabbu-surface2 transition-colors"
            >
              <svg
                className="w-5 h-5 text-dabbu-text"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Settle Up</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        {suggestions.length > 0 && (
          <Card className="mb-6 border-dabbu-accent/20 bg-dabbu-accent-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-dabbu-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Suggested Settlements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setFromId(s.from.id);
                      setToId(s.to.id);
                      setAmount(s.amount.toString());
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-dabbu-surface hover:bg-dabbu-surface2 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{
                          backgroundColor: `hsl(${
                            (s.from.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 45) %
                            360
                          }, 70%, 50%)`,
                        }}
                      >
                        {s.from.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="text-xs text-dabbu-text-secondary">pays</span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{
                          backgroundColor: `hsl(${
                            (s.to.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 45) %
                            360
                          }, 70%, 50%)`,
                        }}
                      >
                        {s.to.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-dabbu-accent">
                      {formatCurrency(s.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
              Who pays?
            </label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {group.members.map((member) => {
                  const bal = memberBalance(member.id);
                  return (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{member.id === currentUserId ? 'You' : member.name}</span>
                        <span
                          className={cn(
                            'text-xs',
                            bal < 0 ? 'text-dabbu-red' : 'text-dabbu-text-muted',
                          )}
                        >
                          {formatCurrency(bal)}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {fromBalance < 0 && (
              <p className="text-xs text-dabbu-red mt-1">
                Owes {formatCurrency(Math.abs(fromBalance))}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-dabbu-accent-muted flex items-center justify-center">
              <svg
                className="w-5 h-5 text-dabbu-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
              Who gets paid?
            </label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {group.members
                  .filter((m) => m.id !== fromId)
                  .map((member) => {
                    const bal = memberBalance(member.id);
                    return (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{member.id === currentUserId ? 'You' : member.name}</span>
                          <span
                            className={cn(
                              'text-xs',
                              bal > 0 ? 'text-dabbu-green' : 'text-dabbu-text-muted',
                            )}
                          >
                            {formatCurrency(bal)}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
            {toBalance > 0 && (
              <p className="text-xs text-dabbu-green mt-1">Is owed {formatCurrency(toBalance)}</p>
            )}
          </div>

          <div className="pt-4">
            <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-dabbu-text-muted font-semibold">
                ₹
              </span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-16 pl-10 pr-4 bg-dabbu-surface border border-dabbu-border rounded-xl text-2xl font-bold text-dabbu-text outline-none focus:ring-2 focus:ring-dabbu-accent focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
              Payment method
            </label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Note (optional)"
            placeholder="What's this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dabbu-text-secondary">From</span>
              <span className="text-sm font-medium text-dabbu-text">
                {group.members.find((m) => m.id === fromId)?.name || 'Select payer'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dabbu-text-secondary">To</span>
              <span className="text-sm font-medium text-dabbu-text">
                {group.members.find((m) => m.id === toId)?.name || 'Select receiver'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-dabbu-border">
              <span className="text-sm font-medium text-dabbu-text">Amount</span>
              <span className="text-xl font-bold text-dabbu-accent">
                {formatCurrency(parseFloat(amount) || 0)}
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full h-14 text-base" size="lg" loading={submitting}>
            Create Settlement
          </Button>
        </form>
      </main>
    </div>
  );
}
