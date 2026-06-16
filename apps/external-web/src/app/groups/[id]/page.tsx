'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  View, Text, ScrollView, TouchableOpacity, Card, H3, Body,
  PrimaryButton, Row, Spacer, Avatar, StyleSheet, spacing, radii,
} from '@/rn';
import { ExpenseCard } from '@/components/expense-card';
import { SettlementCard } from '@/components/settlement-card';
import { PremiumBanner } from '@/components/premium-banner';
import ExpenseFormModal from '@/components/expense-form-modal';
import { Icon } from '@/components/icon';
import { OverlayLoader, useLoader } from '@/components/loaders';
import { api, type Group, type Expense, type Settlement } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  connectToGroup, disconnectSocket, onSocketEvent, offSocketEvent, isConnected,
} from '@/lib/socket';
import { toast } from 'sonner';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'overview' as any },
  { key: 'expenses', label: 'Expenses', icon: 'expenses' as any },
  { key: 'members', label: 'Members', icon: 'members' as any },
  { key: 'settlements', label: 'Settlements', icon: 'settlements' as any },
];

export default function GroupDashboard() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const loader = useLoader({ screenType: 'dashboard', minDuration: 1200, steps: ['Loading group...', 'Fetching expenses...', 'Calculating balances...'], premium: false });
  const [activeTab, setActiveTab] = useState('expenses');
  const [sharing, setSharing] = useState(false);
  const [settlementPlan, setSettlementPlan] = useState<{ from: string; to: string; amount: number }[]>([]);
  const [settlingAll, setSettlingAll] = useState(false);

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || '';
  const myBalance = group?.members.find((m) => m.id === currentUserId)?.balance || 0;

  const loadGroup = useCallback(async () => {
    const res = await api.groups.get(groupId);
    if (res.error) { toast.error(res.error); return; }
    setGroup(res.data!);
  }, [groupId]);

  const loadExpenses = useCallback(async () => {
    const res = await api.expenses.list(groupId);
    if (res.data) setExpenses(res.data);
  }, [groupId]);

  const loadSettlements = useCallback(async () => {
    const res = await api.settlements.list(groupId);
    if (res.data) setSettlements(res.data);
  }, [groupId]);

  const loadSettlementPlan = useCallback(async () => {
    const res = await api.settlements.plan(groupId);
    if (res.data) setSettlementPlan(res.data as any);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const init = async () => {
      loader.start();
      await Promise.all([loadGroup(), loadExpenses(), loadSettlements(), loadSettlementPlan()]);
      loader.complete();
      connectToGroup(groupId);
    };
    init();
    return () => { disconnectSocket(); };
  }, [groupId]);

  useEffect(() => {
    const onExpenseNew = (data: unknown) => {
      const exp = data as Expense; setExpenses((p) => [exp, ...p]); loadGroup(); toast.success(`New expense: ${exp.description}`);
    };
    const onExpenseUpdated = () => { loadExpenses(); loadGroup(); };
    const onSettlementNew = (data: unknown) => {
      const s = data as Settlement; setSettlements((p) => [s, ...p]); loadGroup(); toast.success('New settlement');
    };
    const onSettlementUpdated = () => { loadSettlements(); loadGroup(); };
    const onMemberUpdated = () => { loadGroup(); };
    onSocketEvent('expense:new', onExpenseNew);
    onSocketEvent('expense:updated', onExpenseUpdated);
    onSocketEvent('settlement:new', onSettlementNew);
    onSocketEvent('settlement:updated', onSettlementUpdated);
    onSocketEvent('member:updated', onMemberUpdated);
    return () => {
      offSocketEvent('expense:new', onExpenseNew); offSocketEvent('expense:updated', onExpenseUpdated);
      offSocketEvent('settlement:new', onSettlementNew); offSocketEvent('settlement:updated', onSettlementUpdated);
      offSocketEvent('member:updated', onMemberUpdated);
    };
  }, [loadGroup, loadExpenses, loadSettlements]);

  const handleSettleAll = async () => {
    setSettlingAll(true);
    try {
      for (const plan of settlementPlan) {
        if (plan.from === currentUserId) {
          const res = await api.settlements.create(groupId, { fromId: plan.from, toId: plan.to, amount: plan.amount, method: 'cash' });
          if (res.error) { toast.error(`Failed: ${res.error}`); setSettlingAll(false); return; }
        }
      }
      toast.success('All settled!');
      loadSettlements(); loadGroup(); loadSettlementPlan();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    setSettlingAll(false);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await api.groups.generateInvite(groupId);
      if (res.error) { toast.error(res.error); setSharing(false); return; }
      const token = res.data?.inviteToken;
      if (!token) { toast.error('Failed to generate link'); setSharing(false); return; }
      const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://external-web.vercel.app'}/i/${token}`;
      const text = `Join "${group?.name}" on Dabbu Split! Track expenses, split bills, and settle up.\n\n${url}`;
      if (navigator.share) { await navigator.share({ title: `Join ${group?.name}`, text, url }); }
      else {
        if (confirm('Share via WhatsApp? Cancel to copy link.')) { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }
        else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
      }
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    setSharing(false);
  };

  if (!group) {
    if (loader.isLoading || loader.progress > 0) {
      return <OverlayLoader screenType="dashboard" progress={loader.progress} error={loader.error} onRetry={() => { loader.reset(); loader.start(); }} onErrorDismiss={loader.reset}><View style={s.centered} /></OverlayLoader>;
    }
    return (
      <View style={s.centered}>
        <Card style={{ width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xxl }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'var(--dabbu-errorBg)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: 'var(--dabbu-red)' }}>!</Text>
          </View>
          <H3 style={{ textAlign: 'center' }}>Group Not Found</H3>
          <Spacer size="sm" />
          <Body style={{ textAlign: 'center' }}>This group doesn&apos;t exist or you don&apos;t have access.</Body>
          <Spacer size="lg" />
          <PrimaryButton onPress={() => router.push('/')}>Go Home</PrimaryButton>
        </Card>
      </View>
    );
  }

  const paidExpenses = expenses.filter((e) => e.settled);
  const pendingExpenses = expenses.filter((e) => !e.settled);
  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const completedSettlements = settlements.filter((s) => s.status === 'completed');

  return (
    <OverlayLoader screenType="dashboard" progress={loader.progress} error={loader.error} premium={false}
      onRetry={() => { loader.reset(); loader.start(); }}
      onErrorDismiss={loader.reset}
    >
      <View style={[s.root, { backgroundColor: 'var(--dabbu-bg)' }]}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: 'var(--dabbu-nav-bg)', borderBottomColor: 'var(--dabbu-border)' }]}>
          <Row style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={{ fontSize: 22, color: 'var(--dabbu-text)' }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
              <Text style={[s.groupName, { color: 'var(--dabbu-text)' }]} numberOfLines={1}>{group.name}</Text>
              <Row style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)', textTransform: 'capitalize' }}>{group.type}</Text>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>·</Text>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>{group.memberCount} members</Text>
              </Row>
            </View>
            <TouchableOpacity onPress={handleShare} disabled={sharing} style={{ padding: spacing.sm }}>
              <Text style={{ fontSize: 18 }}>{sharing ? '...' : '🔗'}</Text>
            </TouchableOpacity>
            <View style={{ paddingLeft: spacing.sm }}>
              <Row style={{ gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isConnected() ? 'var(--dabbu-green)' : 'var(--dabbu-text-muted)' }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: isConnected() ? 'var(--dabbu-green)' : 'var(--dabbu-text-muted)' }}>
                  {isConnected() ? 'Live' : 'Offline'}
                </Text>
              </Row>
            </View>
          </Row>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          {/* Balance Card */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <View>
                <Text style={[s.label, { color: 'var(--dabbu-text-muted)' }]}>Your Balance</Text>
                <Text style={[s.balanceAmount, { color: myBalance > 0 ? 'var(--dabbu-green)' : myBalance < 0 ? 'var(--dabbu-red)' : 'var(--dabbu-text)' }]}>
                  {formatCurrency(Math.abs(myBalance))}
                </Text>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)', marginTop: 4 }}>
                  {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'All settled up'}
                </Text>
              </View>
              <Row style={{ marginLeft: spacing.lg }}>
                {group.members.slice(0, 4).map((member) => (
                  <View key={member.id} style={{ marginLeft: -8 }}><Avatar initials={member.name.slice(0, 2).toUpperCase()} size={36} online={member.isOnline} /></View>
                ))}
                {group.members.length > 4 && (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'var(--dabbu-surface2)', justifyContent: 'center', alignItems: 'center', marginLeft: -8, borderWidth: 2, borderColor: 'var(--dabbu-bg)' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: 'var(--dabbu-text-muted)' }}>+{group.members.length - 4}</Text>
                  </View>
                )}
              </Row>
            </Row>
            <Row style={{ borderTopWidth: 1, borderTopColor: 'var(--dabbu-border)', paddingTop: spacing.md }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[s.statValue, { color: 'var(--dabbu-green)' }]}>{formatCurrency(expenses.filter((e) => e.paidBy.id === currentUserId).reduce((s, e) => s + e.amount, 0))}</Text>
                <Text style={s.statLabel}>Paid</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'var(--dabbu-border)', marginVertical: 4 }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[s.statValue, { color: 'var(--dabbu-red)' }]}>{formatCurrency(expenses.filter((e) => e.paidBy.id !== currentUserId).reduce((s, e) => s + e.amount, 0))}</Text>
                <Text style={s.statLabel}>Owed</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'var(--dabbu-border)', marginVertical: 4 }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[s.statValue, { color: 'var(--dabbu-text)' }]}>{formatCurrency(group.totalBalance)}</Text>
                <Text style={s.statLabel}>Total</Text>
              </View>
            </Row>
          </Card>

          {/* Tabs */}
          <View style={[s.tabBar, { backgroundColor: 'var(--dabbu-surface2)', borderColor: 'var(--dabbu-border)' }]}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tab.key === 'expenses' ? expenses.length : tab.key === 'members' ? group.members.length : tab.key === 'settlements' ? settlements.length : undefined;
              return (
                <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[s.tab, isActive && { backgroundColor: 'var(--dabbu-accent)' }]}>
                  <Icon name={tab.icon} size={14} color={isActive ? '#FFF' : 'var(--dabbu-text-muted)'} />
                  <Text style={[s.tabText, { color: isActive ? '#FFF' : 'var(--dabbu-text-muted)' }]}>{tab.label}</Text>
                  {count !== undefined && (
                    <View style={[s.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--dabbu-surface)' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#FFF' : 'var(--dabbu-text-muted)' }}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab group={group} expenses={expenses} settlements={settlements} currentUserId={currentUserId} />}
          {activeTab === 'expenses' && (
            <View>
              {pendingExpenses.length > 0 && <View style={{ marginBottom: spacing.lg }}><Text style={s.sectionSub}>Pending ({pendingExpenses.length})</Text>{pendingExpenses.map((e) => <ExpenseCard key={e.id} expense={e} currentUserId={currentUserId} />)}</View>}
              {paidExpenses.length > 0 && <View><Text style={s.sectionSub}>Settled ({paidExpenses.length})</Text>{paidExpenses.map((e) => <ExpenseCard key={e.id} expense={e} currentUserId={currentUserId} />)}</View>}
              {expenses.length === 0 && <View style={s.empty}><Text style={{ fontSize: 28 }}>💰</Text><Text style={[s.emptyTitle, { color: 'var(--dabbu-text)' }]}>No expenses yet</Text><Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>Add your first expense to get started</Text></View>}
              <PremiumBanner variant="inline" trigger="split-type" />
            </View>
          )}
          {activeTab === 'members' && (
            <View>
              {(() => {
                const totalExpenseAmount = expenses.reduce((s, e) => s + e.amount, 0);
                return group.members.map((member) => {
                  const memberExpenses = expenses.filter((e) => e.paidBy.id === member.id);
                  const totalPaid = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const pct = totalExpenseAmount > 0 ? (totalPaid / totalExpenseAmount) * 100 : 0;
                  return (
                    <Card key={member.id} style={{ marginBottom: 8, padding: spacing.md }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Row style={{ flex: 1, gap: spacing.md }}>
                          <Avatar initials={member.name.slice(0, 2).toUpperCase()} size={40} online={member.isOnline} />
                          <View style={{ flex: 1 }}>
                            <Row style={{ gap: spacing.sm }}>
                              <Text style={[s.memberName, { color: 'var(--dabbu-text)' }]}>{member.id === currentUserId ? 'You' : member.name}</Text>
                              {member.role === 'admin' && <View style={s.roleBadge}><Text style={{ fontSize: 10, fontWeight: '700', color: 'var(--dabbu-accent)' }}>Admin</Text></View>}
                              {member.role === 'guest' && <View style={[s.roleBadge, { backgroundColor: 'var(--dabbu-surface2)' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: 'var(--dabbu-text-muted)' }}>Guest</Text></View>}
                            </Row>
                            <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Paid {formatCurrency(totalPaid)}{member.email ? ` · ${member.email}` : ''}</Text>
                          </View>
                        </Row>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: member.balance > 0 ? 'var(--dabbu-green)' : member.balance < 0 ? 'var(--dabbu-red)' : 'var(--dabbu-text-muted)' }}>
                          {member.balance === 0 ? 'Settled' : formatCurrency(member.balance)}
                        </Text>
                      </Row>
                      {totalExpenseAmount > 0 && (
                        <Row style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'var(--dabbu-surface2)', overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${pct}%`, borderRadius: 2, backgroundColor: 'var(--dabbu-accent)' }} />
                          </View>
                          <Text style={{ fontSize: 11, color: 'var(--dabbu-text-muted)', width: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</Text>
                        </Row>
                      )}
                    </Card>
                  );
                });
              })()}
            </View>
          )}
          {activeTab === 'settlements' && (
            <View>
              {settlementPlan.length > 0 && (
                <Card style={{ marginBottom: spacing.lg }}>
                  <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <Text style={[s.sectionTitle, { color: 'var(--dabbu-text)' }]}>Suggested</Text>
                    {settlementPlan.some((p) => p.from === currentUserId) && (
                      <TouchableOpacity onPress={handleSettleAll} disabled={settlingAll} style={{ paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.md, borderWidth: 1, borderColor: 'var(--dabbu-border)' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: 'var(--dabbu-accent)' }}>{settlingAll ? '...' : 'Settle All'}</Text>
                      </TouchableOpacity>
                    )}
                  </Row>
                  {settlementPlan.map((plan, i) => {
                    const fromMember = group.members.find((m) => m.id === plan.from);
                    const toMember = group.members.find((m) => m.id === plan.to);
                    const isMyPayment = plan.from === currentUserId;
                    return (
                      <Row key={i} style={{ justifyContent: 'space-between', padding: spacing.md, backgroundColor: 'var(--dabbu-surface2)', borderRadius: radii.md, marginBottom: 4 }}>
                        <Row style={{ gap: spacing.sm }}>
                          <Text style={{ fontSize: 13, color: 'var(--dabbu-text-secondary)' }}>{fromMember?.name || plan.from}</Text>
                          <Text style={{ fontSize: 14, color: 'var(--dabbu-accent)' }}>→</Text>
                          <Text style={{ fontSize: 13, color: 'var(--dabbu-text-secondary)' }}>{toMember?.name || plan.to}</Text>
                        </Row>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isMyPayment ? 'var(--dabbu-red)' : 'var(--dabbu-green)' }}>{formatCurrency(plan.amount)}</Text>
                      </Row>
                    );
                  })}
                </Card>
              )}
              {pendingSettlements.length > 0 && <View style={{ marginBottom: spacing.lg }}><Text style={s.sectionSub}>Pending ({pendingSettlements.length})</Text>{pendingSettlements.map((s) => <SettlementCard key={s.id} settlement={s} groupId={groupId} currentUserId={currentUserId} onUpdated={() => { loadSettlements(); loadGroup(); }} />)}</View>}
              {completedSettlements.length > 0 && <View><Text style={s.sectionSub}>Completed ({completedSettlements.length})</Text>{completedSettlements.map((s) => <SettlementCard key={s.id} settlement={s} groupId={groupId} currentUserId={currentUserId} />)}</View>}
              {settlements.length === 0 && <View style={s.empty}><Text style={{ fontSize: 28 }}>✅</Text><Text style={[s.emptyTitle, { color: 'var(--dabbu-text)' }]}>All settled up</Text><Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>No pending settlements</Text></View>}
            </View>
          )}
        </ScrollView>

        {/* Bottom Bar */}
        <View style={s.bottomBar}>
          <View style={[s.bottomBarInner, { backgroundColor: 'var(--dabbu-nav-bg)', borderColor: 'var(--dabbu-border)' }]}>
            <TouchableOpacity style={[s.bottomBtn, { backgroundColor: 'var(--dabbu-accent)' }]} onPress={() => setShowExpenseForm(true)}>
              <Text style={{ fontSize: 18, color: '#FFF' }}>➕</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.bottomBtn, s.bottomBtnSec]} onPress={() => router.push(`/groups/${groupId}/settlements/new`)}>
              <Text style={{ fontSize: 18, color: 'var(--dabbu-text)' }}>→</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: 'var(--dabbu-text)' }}>Settle Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ExpenseFormModal visible={showExpenseForm} groupId={groupId} onClose={() => setShowExpenseForm(false)} onSuccess={() => { loadExpenses(); loadGroup(); loadSettlementPlan(); }} />
        <PremiumBanner variant="slide-in" />
      </View>
    </OverlayLoader>
  );
}

function OverviewTab({ group, expenses, settlements, currentUserId }: { group: Group; expenses: Expense[]; settlements: Settlement[]; currentUserId: string }) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const memberCount = group.members.length;
  const perPersonAvg = memberCount > 0 ? totalSpent / memberCount : 0;
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const pendingCount = settlements.filter((s) => s.status === 'pending').length;
  const youOweAmount = group.members.find((m) => m.id === currentUserId)?.balance || 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
        {[{ label: 'Total Spent', value: formatCurrency(totalSpent), meta: `${expenses.length} expenses`, color: 'var(--dabbu-text)' },
          { label: 'Your Balance', value: formatCurrency(Math.abs(youOweAmount)), meta: youOweAmount > 0 ? 'You are owed' : youOweAmount < 0 ? 'You owe' : 'Settled up', color: youOweAmount > 0 ? 'var(--dabbu-green)' : youOweAmount < 0 ? 'var(--dabbu-red)' : 'var(--dabbu-text)' },
          { label: 'Per Person', value: formatCurrency(perPersonAvg), meta: `Avg across ${memberCount} members`, color: 'var(--dabbu-text)' },
          { label: 'Settlements', value: String(pendingCount), meta: `Pending`, color: 'var(--dabbu-text)' },
        ].map((stat, i) => (
          <Card key={i} style={{ width: 'calc(50% - 8px)' as any, marginBottom: 0 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: 'var(--dabbu-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>{stat.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: stat.color, letterSpacing: -0.3 }}>{stat.value}</Text>
            <Text style={{ fontSize: 11, color: 'var(--dabbu-text-muted)', marginTop: 4 }}>{stat.meta}</Text>
          </Card>
        ))}
      </View>

      {Object.keys(categoryTotals).length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={[s.sectionTitle, { color: 'var(--dabbu-text)' }]}>Category Breakdown</Text>
          {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, amt]) => {
            const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
            return (
              <View key={cat} style={{ marginBottom: spacing.md }}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: 'var(--dabbu-text-secondary)', textTransform: 'capitalize' }}>{cat}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'var(--dabbu-text)' }}>{formatCurrency(amt)} <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>({pct.toFixed(0)}%)</Text></Text>
                </Row>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--dabbu-surface2)', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, borderRadius: 2, backgroundColor: 'var(--dabbu-accent)' }} />
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {topCategory && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Row style={{ gap: spacing.md }}>
            <View style={{ width: 40, height: 40, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-brandLight)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>📈</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>Top Category</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'var(--dabbu-text)', textTransform: 'capitalize' }}>{topCategory[0]} <Text style={{ color: 'var(--dabbu-accent)', fontWeight: '700' }}>{formatCurrency(topCategory[1])}</Text></Text>
            </View>
          </Row>
        </Card>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[s.sectionTitle, { color: 'var(--dabbu-text)' }]}>Balances</Text>
        {group.members.filter((m) => m.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 5).map((member) => {
          const isPositive = member.balance > 0;
          const pct = totalSpent > 0 ? (Math.abs(member.balance) / totalSpent) * 100 : 0;
          return (
            <View key={member.id} style={{ marginBottom: spacing.md }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-secondary)' }}>{member.id === currentUserId ? 'You' : member.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isPositive ? 'var(--dabbu-green)' : 'var(--dabbu-red)' }}>
                  {isPositive ? '+ ' : '- '}{formatCurrency(Math.abs(member.balance))}
                </Text>
              </Row>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--dabbu-surface2)', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 2, backgroundColor: isPositive ? 'var(--dabbu-green)' : 'var(--dabbu-red)' }} />
              </View>
            </View>
          );
        })}
        {group.members.filter((m) => m.balance !== 0).length === 0 && (
          <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)', textAlign: 'center', paddingVertical: spacing.sm }}>All settled up!</Text>
        )}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  header: { borderBottomWidth: 1, backdropFilter: 'saturate(180%) blur(20px)' as any },
  headerRow: { height: 60, alignItems: 'center', paddingHorizontal: spacing.lg },
  backBtn: { padding: spacing.sm, marginLeft: -spacing.sm, borderRadius: radii.md },
  groupName: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, color: 'var(--dabbu-text-muted)', marginTop: 2 },
  tabBar: { flexDirection: 'row', borderRadius: radii.lg, padding: 4, marginBottom: spacing.lg, borderWidth: 1, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabText: { fontSize: 11, fontWeight: '600' },
  tabCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  sectionSub: { fontSize: 14, fontWeight: '600', color: 'var(--dabbu-text-muted)', marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  memberName: { fontSize: 15, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'var(--dabbu-brandLight)' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, padding: spacing.lg, backgroundColor: 'transparent' },
  bottomBarInner: { flexDirection: 'row', gap: spacing.md, borderRadius: radii.xxl, padding: spacing.md, borderWidth: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  bottomBtn: { flex: 1, height: 48, borderRadius: radii.lg, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  bottomBtnSec: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'var(--dabbu-border)' },
});
