'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ExpenseCard } from '@/components/expense-card';
import { SettlementCard } from '@/components/settlement-card';
import { ChatBubble } from '@/components/chat-bubble';
import { MemberAvatar } from '@/components/member-avatar';
import { AuthGuard } from '@/components/auth-guard';
import { PremiumBanner } from '@/components/premium-banner';
import { InstallPrompt } from '@/components/install-prompt';
import { OverlayLoader, useLoader } from '@/components/loaders';
import {
  api,
  type Group,
  type Expense,
  type Settlement,
  type ChatMessage,
  type Member,
} from '@/lib/api';
import { formatCurrency, getInitials, cn } from '@/lib/utils';
import {
  connectToGroup,
  disconnectSocket,
  onSocketEvent,
  offSocketEvent,
  emitEvent,
  isConnected,
} from '@/lib/socket';
import { toast } from 'sonner';

export default function GroupDashboard() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const loader = useLoader({
    screenType: 'dashboard',
    minDuration: 1500,
    steps: ['Loading group...', 'Fetching expenses...', 'Calculating balances...'],
    premium: false,
  });
  const [activeTab, setActiveTab] = useState('expenses');
  const [chatInput, setChatInput] = useState('');
  const [sharing, setSharing] = useState(false);
  const [settlementPlan, setSettlementPlan] = useState<
    { from: string; to: string; amount: number }[]
  >([]);
  const [settlingAll, setSettlingAll] = useState(false);

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || '';
  const currentUserName = (session?.name as string) || 'Guest';

  const myBalance = group?.members.find((m) => m.id === currentUserId)?.balance || 0;

  const loadGroup = useCallback(async () => {
    const res = await api.groups.get(groupId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setGroup(res.data!);
  }, [groupId]);

  const loadExpenses = useCallback(async () => {
    const res = await api.expenses.list(groupId);
    if (res.data) {
      setExpenses(res.data);
    }
  }, [groupId]);

  const loadSettlements = useCallback(async () => {
    const res = await api.settlements.list(groupId);
    if (res.data) {
      setSettlements(res.data);
    }
  }, [groupId]);

  const loadChat = useCallback(async () => {
    const res = await api.chat.list(groupId);
    if (res.data) {
      setChatMessages(res.data);
    }
  }, [groupId]);

  const loadSettlementPlan = useCallback(async () => {
    const res = await api.settlements.plan(groupId);
    if (res.data) {
      setSettlementPlan(res.data as any);
    }
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      return;
    }
    const init = async () => {
      loader.start();
      await Promise.all([
        loadGroup(),
        loadExpenses(),
        loadSettlements(),
        loadChat(),
        loadSettlementPlan(),
      ]);
      loader.complete();

      connectToGroup(groupId);
    };
    init();

    return () => {
      disconnectSocket();
    };
  }, [groupId, loadGroup, loadExpenses, loadSettlements, loadChat]);

  useEffect(() => {
    const handleExpenseNew = (data: unknown) => {
      const exp = data as Expense;
      setExpenses((prev) => [exp, ...prev]);
      loadGroup();
      toast.success(`New expense: ${exp.description}`);
    };
    const handleExpenseUpdated = () => {
      loadExpenses();
      loadGroup();
    };
    const handleSettlementNew = (data: unknown) => {
      const sett = data as Settlement;
      setSettlements((prev) => [sett, ...prev]);
      loadGroup();
      toast.success('New settlement created');
    };
    const handleSettlementUpdated = () => {
      loadSettlements();
      loadGroup();
    };
    const handleChatMessage = (data: unknown) => {
      const msg = data as ChatMessage;
      setChatMessages((prev) => [...prev, msg]);
    };
    const handleMemberUpdated = () => {
      loadGroup();
    };

    onSocketEvent('expense:new', handleExpenseNew);
    onSocketEvent('expense:updated', handleExpenseUpdated);
    onSocketEvent('settlement:new', handleSettlementNew);
    onSocketEvent('settlement:updated', handleSettlementUpdated);
    onSocketEvent('chat:message', handleChatMessage);
    onSocketEvent('member:updated', handleMemberUpdated);

    return () => {
      offSocketEvent('expense:new', handleExpenseNew);
      offSocketEvent('expense:updated', handleExpenseUpdated);
      offSocketEvent('settlement:new', handleSettlementNew);
      offSocketEvent('settlement:updated', handleSettlementUpdated);
      offSocketEvent('chat:message', handleChatMessage);
      offSocketEvent('member:updated', handleMemberUpdated);
    };
  }, [loadGroup, loadExpenses, loadSettlements]);

  const handleSettleAll = async () => {
    setSettlingAll(true);
    try {
      for (const plan of settlementPlan) {
        if (plan.from === currentUserId) {
          const res = await api.settlements.create(groupId, {
            fromId: plan.from,
            toId: plan.to,
            amount: plan.amount,
            method: 'cash',
          });
          if (res.error) {
            toast.error(`Failed to settle with ${plan.to}: ${res.error}`);
            setSettlingAll(false);
            return;
          }
        }
      }
      toast.success('All settlements completed!');
      loadSettlements();
      loadGroup();
      loadSettlementPlan();
    } catch (e: any) {
      toast.error(e.message || 'Failed to settle');
    }
    setSettlingAll(false);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) {
      return;
    }
    const res = await api.chat.send(groupId, chatInput.trim());
    if (res.error) {
      toast.error(res.error);
      return;
    }
    emitEvent('chat:message', { groupId, message: res.data });
    setChatInput('');
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await api.groups.generateInvite(groupId);
      if (res.error) {
        toast.error(res.error);
        setSharing(false);
        return;
      }
      const token = res.data?.inviteToken;
      if (!token) {
        toast.error('Failed to generate invite link');
        setSharing(false);
        return;
      }
      const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://external-web.vercel.app'}/i/${token}`;
      const shareText = `Join "${group?.name || 'my group'}" on Dabbu Split! Track shared expenses, split bills, and settle up easily.\n\n${inviteUrl}`;

      // Try native share first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `Join ${group?.name || 'my group'} on Dabbu`,
          text: shareText,
          url: inviteUrl,
        });
      } else {
        // Show custom share options (desktop)
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        if (confirm(`Share invite link via WhatsApp?\n\nCancel to copy link instead.`)) {
          window.open(whatsappUrl, '_blank');
        } else {
          await navigator.clipboard.writeText(inviteUrl);
          toast.success('Invite link copied!');
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to share');
    } finally {
      setSharing(false);
    }
  };

  if (!group) {
    if (loader.isLoading || loader.progress > 0) {
      return (
        <OverlayLoader
          screenType="dashboard"
          progress={loader.progress}
          error={loader.error}
          onRetry={() => {
            loader.reset();
            loader.start();
          }}
          onErrorDismiss={loader.reset}
        >
          <div className="min-h-screen flex items-center justify-center" />
        </OverlayLoader>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="w-16 h-16 rounded-full bg-dabbu-red-bg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-dabbu-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
          <p className="text-dabbu-text-secondary mb-6">
            This group doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const paidExpenses = expenses.filter((e) => e.settled);
  const pendingExpenses = expenses.filter((e) => !e.settled);
  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const completedSettlements = settlements.filter((s) => s.status === 'completed');

  return (
    <OverlayLoader
      screenType="dashboard"
      progress={loader.progress}
      error={loader.error}
      premium={false}
      onRetry={() => {
        loader.reset();
        loader.start();
      }}
      onErrorDismiss={loader.reset}
    >
      <div className="min-h-screen bg-dabbu-bg pb-32">
        {loader.isLoading && (
          <div className="sticky top-0 z-40 bg-gradient-to-r from-violet-600/90 via-dabbu-accent/90 to-violet-600/90 backdrop-blur-md border-b border-violet-400/20">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <div>
                <p className="text-white text-sm font-semibold">Almost ready!</p>
                <p className="text-violet-200 text-xs">Preparing your dashboard</p>
              </div>
            </div>
          </div>
        )}
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
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold truncate">{group.name}</h1>
                <div className="flex items-center gap-2 text-xs text-dabbu-text-muted">
                  <span className="capitalize">{group.type}</span>
                  <span>·</span>
                  <span>{group.memberCount} members</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="p-2 rounded-lg hover:bg-dabbu-surface2 transition-colors disabled:opacity-50"
                  title="Share invite link"
                >
                  <svg
                    className={`w-5 h-5 text-dabbu-text ${sharing ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {isConnected() ? (
                  <span className="flex items-center gap-1 text-dabbu-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-dabbu-green" />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-dabbu-text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-dabbu-text-muted" />
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 pt-6">
          <div className="mb-6 animate-in">
            <Card gradient className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-dabbu-accent/10 via-transparent to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-dabbu-text-secondary mb-1">Your Balance</p>
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      myBalance > 0
                        ? 'text-dabbu-green'
                        : myBalance < 0
                          ? 'text-dabbu-red'
                          : 'text-dabbu-text',
                    )}
                  >
                    {formatCurrency(Math.abs(myBalance))}
                  </p>
                  <p className="text-xs text-dabbu-text-muted mt-1">
                    {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'All settled up'}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {group.members.slice(0, 4).map((member) => (
                    <MemberAvatar
                      key={member.id}
                      name={member.name}
                      size="lg"
                      isOnline={member.isOnline}
                      className="border-2 border-dabbu-bg"
                    />
                  ))}
                  {group.members.length > 4 && (
                    <div className="w-12 h-12 rounded-full bg-dabbu-surface2 border-2 border-dabbu-bg flex items-center justify-center text-xs font-medium text-dabbu-text-muted">
                      +{group.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dabbu-border/50">
                <div className="flex-1 text-center">
                  <p className="text-lg font-semibold text-dabbu-green">
                    {formatCurrency(
                      expenses
                        .filter((e) => e.paidBy.id === currentUserId)
                        .reduce((sum, e) => sum + e.amount, 0),
                    )}
                  </p>
                  <p className="text-[10px] text-dabbu-text-muted">Total Paid</p>
                </div>
                <div className="w-px h-8 bg-dabbu-border" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-semibold text-dabbu-red">
                    {formatCurrency(
                      expenses
                        .filter((e) => e.paidBy.id !== currentUserId)
                        .reduce((sum, e) => sum + e.amount, 0),
                    )}
                  </p>
                  <p className="text-[10px] text-dabbu-text-muted">Total Owed</p>
                </div>
                <div className="w-px h-8 bg-dabbu-border" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-semibold text-dabbu-text">
                    {formatCurrency(group.totalBalance)}
                  </p>
                  <p className="text-[10px] text-dabbu-text-muted">Total</p>
                </div>
              </div>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1">
                Expenses ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-1">
                Members ({group.members.length})
              </TabsTrigger>
              <TabsTrigger value="settlements" className="flex-1">
                Settlements ({settlements.length})
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1">
                Chat ({chatMessages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {(() => {
                const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
                const memberCount = group.members.length;
                const perPersonAvg = memberCount > 0 ? totalSpent / memberCount : 0;
                const perTxAvg = expenses.length > 0 ? totalSpent / expenses.length : 0;
                const categoryTotals: Record<string, number> = {};
                expenses.forEach((e) => {
                  categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
                });
                const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
                const pendingSettlementsCount = settlements.filter(
                  (s) => s.status === 'pending',
                ).length;
                const userOwed = group.members.filter((m) => m.balance > 0).length;
                const youOweAmount =
                  group.members.find((m) => m.id === currentUserId)?.balance || 0;

                return (
                  <div className="space-y-4 animate-fade-in">
                    {/* Stats cards row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent">
                        <p className="text-[10px] uppercase tracking-wider text-dabbu-text-muted mb-1">
                          Total Spent
                        </p>
                        <p className="text-xl font-bold text-dabbu-text">
                          {formatCurrency(totalSpent)}
                        </p>
                        <p className="text-[10px] text-dabbu-text-muted mt-1">
                          {expenses.length} expenses
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent">
                        <p className="text-[10px] uppercase tracking-wider text-dabbu-text-muted mb-1">
                          Your Balance
                        </p>
                        <p
                          className={cn(
                            'text-xl font-bold',
                            youOweAmount > 0
                              ? 'text-dabbu-green'
                              : youOweAmount < 0
                                ? 'text-dabbu-red'
                                : 'text-dabbu-text',
                          )}
                        >
                          {formatCurrency(Math.abs(youOweAmount))}
                        </p>
                        <p className="text-[10px] text-dabbu-text-muted mt-1">
                          {youOweAmount > 0
                            ? 'You are owed'
                            : youOweAmount < 0
                              ? 'You owe'
                              : 'Settled up'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent">
                        <p className="text-[10px] uppercase tracking-wider text-dabbu-text-muted mb-1">
                          Per Person
                        </p>
                        <p className="text-xl font-bold text-dabbu-text">
                          {formatCurrency(perPersonAvg)}
                        </p>
                        <p className="text-[10px] text-dabbu-text-muted mt-1">
                          Average across {memberCount} members
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent">
                        <p className="text-[10px] uppercase tracking-wider text-dabbu-text-muted mb-1">
                          Settlements
                        </p>
                        <p className="text-xl font-bold text-dabbu-text">
                          {pendingSettlementsCount}
                        </p>
                        <p className="text-[10px] text-dabbu-text-muted mt-1">
                          Pending · {userOwed} members owed
                        </p>
                      </div>
                    </div>

                    {/* Category breakdown */}
                    {Object.keys(categoryTotals).length > 0 && (
                      <div className="p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent">
                        <h3 className="text-sm font-medium text-dabbu-text mb-3">
                          Category Breakdown
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 6)
                            .map(([cat, amt]) => {
                              const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                              return (
                                <div key={cat}>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-dabbu-text-secondary capitalize">
                                      {cat}
                                    </span>
                                    <span className="text-dabbu-text font-medium">
                                      {formatCurrency(amt)}{' '}
                                      <span className="text-dabbu-text-muted">
                                        ({pct.toFixed(0)}%)
                                      </span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-dabbu-surface2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-dabbu-accent/60 transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Top category insight */}
                    {topCategory && (
                      <div className="p-4 rounded-xl border border-dabbu-accent/20 bg-gradient-to-b from-dabbu-accent/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-dabbu-accent/10 flex items-center justify-center">
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
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-dabbu-text-muted">Top Category</p>
                            <p className="text-sm font-medium text-dabbu-text capitalize">
                              {topCategory[0]}{' '}
                              <span className="text-dabbu-accent">
                                {formatCurrency(topCategory[1])}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Balance bars */}
                    <div className="p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent">
                      <h3 className="text-sm font-medium text-dabbu-text mb-3">Balances</h3>
                      <div className="space-y-3">
                        {group.members
                          .filter((m) => m.balance !== 0)
                          .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                          .slice(0, 5)
                          .map((member) => {
                            const isPositive = member.balance > 0;
                            const pct =
                              totalSpent > 0 ? (Math.abs(member.balance) / totalSpent) * 100 : 0;
                            return (
                              <div key={member.id}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-dabbu-text-secondary">
                                    {member.id === currentUserId ? 'You' : member.name}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-medium',
                                      isPositive ? 'text-dabbu-green' : 'text-dabbu-red',
                                    )}
                                  >
                                    {isPositive ? '+ ' : '- '}
                                    {formatCurrency(Math.abs(member.balance))}
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-dabbu-surface2 overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all duration-500',
                                      isPositive ? 'bg-dabbu-green' : 'bg-dabbu-red',
                                    )}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        {group.members.filter((m) => m.balance !== 0).length === 0 && (
                          <p className="text-xs text-dabbu-text-muted text-center py-2">
                            All settled up!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="expenses">
              {pendingExpenses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-dabbu-text-secondary mb-3">
                    Pending ({pendingExpenses.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingExpenses.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                </div>
              )}
              {paidExpenses.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-dabbu-text-secondary mb-3">
                    Settled ({paidExpenses.length})
                  </h3>
                  <div className="space-y-2">
                    {paidExpenses.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                </div>
              )}
              {expenses.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-dabbu-surface2 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-dabbu-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-dabbu-text mb-1">No expenses yet</h3>
                  <p className="text-sm text-dabbu-text-muted">
                    Add your first expense to get started
                  </p>
                </div>
              )}
              <PremiumBanner variant="inline" trigger="split-type" />
            </TabsContent>

            <TabsContent value="members">
              <div className="space-y-1">
                {(() => {
                  const totalExpenseAmount = expenses.reduce((s, e) => s + e.amount, 0);
                  return group.members.map((member) => {
                    const memberExpenses = expenses.filter((e) => e.paidBy.id === member.id);
                    const totalPaid = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const contributionPct =
                      totalExpenseAmount > 0 ? (totalPaid / totalExpenseAmount) * 100 : 0;

                    return (
                      <div
                        key={member.id}
                        className="p-3 rounded-xl hover:bg-dabbu-surface2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <MemberAvatar
                              name={member.name}
                              size="lg"
                              isOnline={member.isOnline}
                              balance={member.balance}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-dabbu-text">
                                  {member.id === currentUserId ? 'You' : member.name}
                                </p>
                                {member.role === 'admin' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-dabbu-accent-muted text-dabbu-accent">
                                    Admin
                                  </span>
                                )}
                                {member.role === 'guest' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-dabbu-surface2 text-dabbu-text-muted">
                                    Guest
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-dabbu-text-muted">
                                <span>Paid {formatCurrency(totalPaid)}</span>
                                {member.email && (
                                  <>
                                    <span>·</span>
                                    <span>{member.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              member.balance > 0
                                ? 'text-dabbu-green'
                                : member.balance < 0
                                  ? 'text-dabbu-red'
                                  : 'text-dabbu-text-muted',
                            )}
                          >
                            {member.balance === 0 ? 'Settled' : formatCurrency(member.balance)}
                          </p>
                        </div>
                        {totalExpenseAmount > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-dabbu-surface2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-dabbu-accent/60 transition-all duration-500"
                                style={{ width: `${contributionPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-dabbu-text-muted w-8 text-right">
                              {contributionPct.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </TabsContent>

            <TabsContent value="settlements">
              {/* Settlement plan / Suggested settlements */}
              {settlementPlan.length > 0 && (
                <div className="mb-4 p-4 rounded-xl border border-dabbu-accent/20 bg-gradient-to-b from-dabbu-accent/5 to-transparent">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-dabbu-text">Suggested Settlements</h3>
                    {settlementPlan.some((p) => p.from === currentUserId) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSettleAll}
                        loading={settlingAll}
                        className="h-8 text-xs"
                      >
                        Settle All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {settlementPlan.map((plan, i) => {
                      const fromMember = group.members.find((m) => m.id === plan.from);
                      const toMember = group.members.find((m) => m.id === plan.to);
                      const isMyPayment = plan.from === currentUserId;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-dabbu-surface2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-dabbu-text-secondary">
                              {fromMember?.name || plan.from}
                            </span>
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
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>
                            <span className="text-dabbu-text-secondary">
                              {toMember?.name || plan.to}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'font-medium',
                              isMyPayment ? 'text-dabbu-red' : 'text-dabbu-green',
                            )}
                          >
                            {formatCurrency(plan.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingSettlements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-dabbu-text-secondary mb-3">
                    Pending ({pendingSettlements.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingSettlements.map((settlement) => (
                      <SettlementCard
                        key={settlement.id}
                        settlement={settlement}
                        groupId={groupId}
                        currentUserId={currentUserId}
                        onUpdated={() => {
                          loadSettlements();
                          loadGroup();
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {completedSettlements.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-dabbu-text-secondary mb-3">
                    Completed ({completedSettlements.length})
                  </h3>
                  <div className="space-y-3">
                    {completedSettlements.map((settlement) => (
                      <SettlementCard
                        key={settlement.id}
                        settlement={settlement}
                        groupId={groupId}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                </div>
              )}
              {settlements.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-dabbu-surface2 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-dabbu-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-dabbu-text mb-1">All settled up</h3>
                  <p className="text-sm text-dabbu-text-muted">No pending settlements</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat">
              <div className="flex flex-col h-[500px]">
                <div className="flex-1 overflow-y-auto space-y-1 px-1 no-scrollbar">
                  {chatMessages.map((msg, i) => {
                    const prevMsg = i > 0 ? chatMessages[i - 1] : null;
                    const showSender =
                      !prevMsg || prevMsg.sender.id !== msg.sender.id || msg.type === 'system';
                    return (
                      <ChatBubble
                        key={msg.id}
                        message={msg}
                        isOwn={msg.sender.id === currentUserId}
                        showSender={showSender || msg.type !== 'text'}
                      />
                    );
                  })}
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-dabbu-surface2 flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-dabbu-text-muted"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-dabbu-text mb-1">No messages yet</h3>
                      <p className="text-sm text-dabbu-text-muted">Start the conversation</p>
                    </div>
                  )}
                </div>
                <form
                  onSubmit={handleSendChat}
                  className="flex items-center gap-2 pt-3 border-t border-dabbu-border mt-3"
                >
                  <Input
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="h-10 text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!chatInput.trim()}
                    className="shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="glass-effect rounded-2xl p-3 flex items-center gap-3">
              <Button
                className="flex-1 h-12 gap-2"
                size="lg"
                onClick={() => router.push(`/groups/${groupId}/expenses/new`)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Expense
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 gap-2"
                size="lg"
                onClick={() => router.push(`/groups/${groupId}/settlements/new`)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                Settle Up
              </Button>
            </div>
          </div>
        </div>

        <InstallPrompt />
        <PremiumBanner variant="slide-in" />
      </div>
    </OverlayLoader>
  );
}
