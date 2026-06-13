'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Card,
  H3,
  Body,
  PrimaryButton,
  Row,
  Spacer,
  Avatar,
  StyleSheet,
  spacing,
  radii,
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
  connectToGroup,
  disconnectSocket,
  onSocketEvent,
  offSocketEvent,
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
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const loader = useLoader({
    screenType: 'dashboard',
    minDuration: 1500,
    steps: ['Loading group...', 'Fetching expenses...', 'Calculating balances...'],
    premium: false,
  });
  const [activeTab, setActiveTab] = useState('expenses');
  const [sharing, setSharing] = useState(false);
  const [settlementPlan, setSettlementPlan] = useState<
    { from: string; to: string; amount: number }[]
  >([]);
  const [settlingAll, setSettlingAll] = useState(false);

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || '';

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
      await Promise.all([loadGroup(), loadExpenses(), loadSettlements(), loadSettlementPlan()]);
      loader.complete();

      connectToGroup(groupId);
    };
    init();

    return () => {
      disconnectSocket();
    };
  }, [groupId, loadGroup, loadExpenses, loadSettlements]);

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
    const handleMemberUpdated = () => {
      loadGroup();
    };

    onSocketEvent('expense:new', handleExpenseNew);
    onSocketEvent('expense:updated', handleExpenseUpdated);
    onSocketEvent('settlement:new', handleSettlementNew);
    onSocketEvent('settlement:updated', handleSettlementUpdated);
    onSocketEvent('member:updated', handleMemberUpdated);

    return () => {
      offSocketEvent('expense:new', handleExpenseNew);
      offSocketEvent('expense:updated', handleExpenseUpdated);
      offSocketEvent('settlement:new', handleSettlementNew);
      offSocketEvent('settlement:updated', handleSettlementUpdated);
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

      if (navigator.share) {
        await navigator.share({
          title: `Join ${group?.name || 'my group'} on Dabbu`,
          text: shareText,
          url: inviteUrl,
        });
      } else {
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
          <View style={styles.centered} />
        </OverlayLoader>
      );
    }
    return (
      <View style={styles.centered}>
        <Card style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
          <Spacer size="lg" />
          <H3 style={styles.textCenter}>Group Not Found</H3>
          <Spacer size="sm" />
          <Body style={styles.textCenter}>
            This group doesn&apos;t exist or you don&apos;t have access.
          </Body>
          <Spacer size="lg" />
          <PrimaryButton onPress={() => router.push('/')}>
            <Text>Go Home</Text>
          </PrimaryButton>
        </Card>
      </View>
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
      <View style={styles.root}>
        {loader.isLoading && (
          <View style={styles.loadingBar}>
            <View style={styles.loadingDot} />
            <View>
              <Text style={styles.loadingTitle}>Almost ready!</Text>
              <Text style={styles.loadingSub}>Preparing your dashboard</Text>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.headerInner}>
            <Row style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backIcon}>{'←'}</Text>
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {group.name}
                </Text>
                <Row style={styles.groupMeta}>
                  <Text style={styles.metaText}>{group.type}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{group.memberCount} members</Text>
                </Row>
              </View>
              <TouchableOpacity onPress={handleShare} disabled={sharing} style={styles.shareBtn}>
                <Text style={styles.shareIcon}>{sharing ? '...' : '🔗'}</Text>
              </TouchableOpacity>
              <View style={styles.liveBadge}>
                {isConnected() ? (
                  <Row>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </Row>
                ) : (
                  <Row>
                    <View style={[styles.liveDot, styles.offlineDot]} />
                    <Text style={styles.offlineText}>Offline</Text>
                  </Row>
                )}
              </View>
            </Row>
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.balanceCard}>
            <Row style={styles.balanceRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    myBalance > 0 ? styles.green : myBalance < 0 ? styles.red : styles.whiteText,
                  ]}
                >
                  {formatCurrency(Math.abs(myBalance))}
                </Text>
                <Text style={styles.balanceStatus}>
                  {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'All settled up'}
                </Text>
              </View>
              <Row style={styles.avatarStack}>
                {group.members.slice(0, 4).map((member) => (
                  <View key={member.id} style={styles.avatarItem}>
                    <Avatar
                      initials={member.name.slice(0, 2).toUpperCase()}
                      size={36}
                      online={member.isOnline}
                    />
                  </View>
                ))}
                {group.members.length > 4 && (
                  <View style={styles.avatarMore}>
                    <Text style={styles.avatarMoreText}>+{group.members.length - 4}</Text>
                  </View>
                )}
              </Row>
            </Row>
            <View style={styles.balanceStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.green]}>
                  {formatCurrency(
                    expenses
                      .filter((e) => e.paidBy.id === currentUserId)
                      .reduce((sum, e) => sum + e.amount, 0),
                  )}
                </Text>
                <Text style={styles.statLabel}>Total Paid</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.red]}>
                  {formatCurrency(
                    expenses
                      .filter((e) => e.paidBy.id !== currentUserId)
                      .reduce((sum, e) => sum + e.amount, 0),
                  )}
                </Text>
                <Text style={styles.statLabel}>Total Owed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.whiteText]}>
                  {formatCurrency(group.totalBalance)}
                </Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </Card>

          <View style={styles.tabBar}>
            {[
              { key: 'overview', label: 'Overview', icon: 'overview' },
              { key: 'expenses', label: 'Expenses', icon: 'expenses', count: expenses.length },
              { key: 'members', label: 'Members', icon: 'members', count: group.members.length },
              {
                key: 'settlements',
                label: 'Settlements',
                icon: 'settlements',
                count: settlements.length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Icon
                    name={tab.icon as any}
                    size={16}
                    color={isActive ? '#FFFFFF' : 'var(--dabbu-text-muted, #64748B)'}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.count !== undefined && (
                    <View style={[styles.tabCountWrap, isActive && styles.tabCountWrapActive]}>
                      <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === 'overview' &&
            (() => {
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
              const youOweAmount = group.members.find((m) => m.id === currentUserId)?.balance || 0;

              return (
                <View>
                  <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                      <Text style={styles.statCardLabel}>Total Spent</Text>
                      <Text style={styles.statCardValue}>{formatCurrency(totalSpent)}</Text>
                      <Text style={styles.statCardMeta}>{expenses.length} expenses</Text>
                    </Card>
                    <Card style={styles.statCard}>
                      <Text style={styles.statCardLabel}>Your Balance</Text>
                      <Text
                        style={[
                          styles.statCardValue,
                          youOweAmount > 0
                            ? styles.green
                            : youOweAmount < 0
                              ? styles.red
                              : styles.whiteText,
                        ]}
                      >
                        {formatCurrency(Math.abs(youOweAmount))}
                      </Text>
                      <Text style={styles.statCardMeta}>
                        {youOweAmount > 0
                          ? 'You are owed'
                          : youOweAmount < 0
                            ? 'You owe'
                            : 'Settled up'}
                      </Text>
                    </Card>
                    <Card style={styles.statCard}>
                      <Text style={styles.statCardLabel}>Per Person</Text>
                      <Text style={styles.statCardValue}>{formatCurrency(perPersonAvg)}</Text>
                      <Text style={styles.statCardMeta}>Avg across {memberCount} members</Text>
                    </Card>
                    <Card style={styles.statCard}>
                      <Text style={styles.statCardLabel}>Settlements</Text>
                      <Text style={styles.statCardValue}>{pendingSettlementsCount}</Text>
                      <Text style={styles.statCardMeta}>Pending · {userOwed} members owed</Text>
                    </Card>
                  </View>

                  {Object.keys(categoryTotals).length > 0 && (
                    <Card style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>Category Breakdown</Text>
                      {Object.entries(categoryTotals)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([cat, amt]) => {
                          const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                          return (
                            <View key={cat} style={styles.categoryRow}>
                              <Row style={styles.categoryHeader}>
                                <Text style={styles.categoryName}>{cat}</Text>
                                <Text style={styles.categoryAmount}>
                                  {formatCurrency(amt)}{' '}
                                  <Text style={styles.categoryPct}>({pct.toFixed(0)}%)</Text>
                                </Text>
                              </Row>
                              <View style={styles.progressTrack}>
                                <View style={[styles.progressBar, { width: `${pct}%` }]} />
                              </View>
                            </View>
                          );
                        })}
                    </Card>
                  )}

                  {topCategory && (
                    <Card variant="accent" style={styles.insightCard}>
                      <Row>
                        <View style={styles.insightIcon}>
                          <Text style={styles.insightIconText}>📈</Text>
                        </View>
                        <View>
                          <Text style={styles.insightLabel}>Top Category</Text>
                          <Text style={styles.insightValue}>
                            {topCategory[0]}{' '}
                            <Text style={styles.insightAccent}>
                              {formatCurrency(topCategory[1])}
                            </Text>
                          </Text>
                        </View>
                      </Row>
                    </Card>
                  )}

                  <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Balances</Text>
                    {group.members
                      .filter((m) => m.balance !== 0)
                      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                      .slice(0, 5)
                      .map((member) => {
                        const isPositive = member.balance > 0;
                        const pct =
                          totalSpent > 0 ? (Math.abs(member.balance) / totalSpent) * 100 : 0;
                        return (
                          <View key={member.id} style={styles.balanceRow}>
                            <Row style={styles.balanceMemberRow}>
                              <Text style={styles.balanceMemberName}>
                                {member.id === currentUserId ? 'You' : member.name}
                              </Text>
                              <Text
                                style={[
                                  styles.balanceMemberAmount,
                                  isPositive ? styles.green : styles.red,
                                ]}
                              >
                                {isPositive ? '+ ' : '- '}
                                {formatCurrency(Math.abs(member.balance))}
                              </Text>
                            </Row>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.balanceBar,
                                  {
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: isPositive
                                      ? 'var(--dabbu-green, #10B981)'
                                      : 'var(--dabbu-red, #EF4444)',
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    {group.members.filter((m) => m.balance !== 0).length === 0 && (
                      <Text style={styles.settledText}>All settled up!</Text>
                    )}
                  </Card>
                </View>
              );
            })()}

          {activeTab === 'expenses' && (
            <View>
              {pendingExpenses.length > 0 && (
                <View style={styles.expenseSection}>
                  <Text style={styles.sectionSubtitle}>Pending ({pendingExpenses.length})</Text>
                  {pendingExpenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} currentUserId={currentUserId} />
                  ))}
                </View>
              )}
              {paidExpenses.length > 0 && (
                <View>
                  <Text style={styles.sectionSubtitle}>Settled ({paidExpenses.length})</Text>
                  {paidExpenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} currentUserId={currentUserId} />
                  ))}
                </View>
              )}
              {expenses.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💰</Text>
                  <Text style={styles.emptyTitle}>No expenses yet</Text>
                  <Text style={styles.emptyDesc}>Add your first expense to get started</Text>
                </View>
              )}
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
                  const contributionPct =
                    totalExpenseAmount > 0 ? (totalPaid / totalExpenseAmount) * 100 : 0;

                  return (
                    <TouchableOpacity key={member.id} style={styles.memberCard}>
                      <Row style={styles.memberRow}>
                        <Row style={styles.memberInfo}>
                          <Avatar
                            initials={member.name.slice(0, 2).toUpperCase()}
                            size={40}
                            online={member.isOnline}
                          />
                          <View style={styles.memberDetails}>
                            <Row>
                              <Text style={styles.memberName}>
                                {member.id === currentUserId ? 'You' : member.name}
                              </Text>
                              {member.role === 'admin' && (
                                <View style={styles.roleBadge}>
                                  <Text style={styles.roleBadgeText}>Admin</Text>
                                </View>
                              )}
                              {member.role === 'guest' && (
                                <View style={styles.guestBadge}>
                                  <Text style={styles.guestBadgeText}>Guest</Text>
                                </View>
                              )}
                            </Row>
                            <Row style={styles.memberMeta}>
                              <Text style={styles.memberMetaText}>
                                Paid {formatCurrency(totalPaid)}
                              </Text>
                              {member.email && (
                                <>
                                  <Text style={styles.memberMetaDot}>·</Text>
                                  <Text style={styles.memberMetaText}>{member.email}</Text>
                                </>
                              )}
                            </Row>
                          </View>
                        </Row>
                        <Text
                          style={[
                            styles.memberBalance,
                            member.balance > 0
                              ? styles.green
                              : member.balance < 0
                                ? styles.red
                                : styles.mutedText,
                          ]}
                        >
                          {member.balance === 0 ? 'Settled' : formatCurrency(member.balance)}
                        </Text>
                      </Row>
                      {totalExpenseAmount > 0 && (
                        <Row style={styles.contributionRow}>
                          <View style={styles.progressTrack}>
                            <View
                              style={[styles.contributionBar, { width: `${contributionPct}%` }]}
                            />
                          </View>
                          <Text style={styles.contributionPct}>{contributionPct.toFixed(0)}%</Text>
                        </Row>
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          )}

          {activeTab === 'settlements' && (
            <View>
              {settlementPlan.length > 0 && (
                <Card variant="accent" style={styles.settlementPlanCard}>
                  <Row style={styles.settlementPlanHeader}>
                    <Text style={styles.sectionTitle}>Suggested Settlements</Text>
                    {settlementPlan.some((p) => p.from === currentUserId) && (
                      <TouchableOpacity
                        onPress={handleSettleAll}
                        disabled={settlingAll}
                        style={styles.settleAllBtn}
                      >
                        <Text style={styles.settleAllText}>
                          {settlingAll ? '...' : 'Settle All'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Row>
                  {settlementPlan.map((plan, i) => {
                    const fromMember = group.members.find((m) => m.id === plan.from);
                    const toMember = group.members.find((m) => m.id === plan.to);
                    const isMyPayment = plan.from === currentUserId;
                    return (
                      <Row key={i} style={styles.settlementRow}>
                        <Row>
                          <Text style={styles.settlementName}>{fromMember?.name || plan.from}</Text>
                          <Text style={styles.settlementArrow}>{'→'}</Text>
                          <Text style={styles.settlementName}>{toMember?.name || plan.to}</Text>
                        </Row>
                        <Text
                          style={[styles.settlementAmount, isMyPayment ? styles.red : styles.green]}
                        >
                          {formatCurrency(plan.amount)}
                        </Text>
                      </Row>
                    );
                  })}
                </Card>
              )}

              {pendingSettlements.length > 0 && (
                <View style={styles.settleSection}>
                  <Text style={styles.sectionSubtitle}>Pending ({pendingSettlements.length})</Text>
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
                </View>
              )}
              {completedSettlements.length > 0 && (
                <View>
                  <Text style={styles.sectionSubtitle}>
                    Completed ({completedSettlements.length})
                  </Text>
                  {completedSettlements.map((settlement) => (
                    <SettlementCard
                      key={settlement.id}
                      settlement={settlement}
                      groupId={groupId}
                      currentUserId={currentUserId}
                    />
                  ))}
                </View>
              )}
              {settlements.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyTitle}>All settled up</Text>
                  <Text style={styles.emptyDesc}>No pending settlements</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInner}>
            <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowExpenseForm(true)}>
              <Text style={styles.bottomBtnIcon}>➕</Text>
              <Text style={styles.bottomBtnText}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomBtn, styles.bottomBtnSecondary]}
              onPress={() => router.push(`/groups/${groupId}/settlements/new`)}
            >
              <Text style={styles.bottomBtnIconSecondary}>→</Text>
              <Text style={styles.bottomBtnTextSecondary}>Settle Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ExpenseFormModal
          visible={showExpenseForm}
          groupId={groupId}
          onClose={() => setShowExpenseForm(false)}
          onSuccess={() => {
            loadExpenses();
            loadGroup();
            loadSettlementPlan();
          }}
        />

        <PremiumBanner variant="slide-in" />
      </View>
    </OverlayLoader>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'var(--dabbu-bg, #000000)',
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 28,
    color: 'var(--dabbu-red, #EF4444)',
    fontWeight: '800',
  },
  textCenter: {
    textAlign: 'center',
  },
  loadingBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'var(--dabbu-accent)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  loadingTitle: {
    color: 'var(--dabbu-text, #FFFFFF)',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingSub: {
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    fontSize: 12,
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
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
    borderRadius: radii.md,
  },
  backIcon: {
    fontSize: 20,
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  groupMeta: {
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    textTransform: 'capitalize',
  },
  metaDot: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  shareBtn: {
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  shareIcon: {
    fontSize: 18,
  },
  liveBadge: {
    paddingLeft: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'var(--dabbu-green, #10B981)',
    marginRight: 4,
  },
  offlineDot: {
    backgroundColor: 'var(--dabbu-text-muted, #64748B)',
  },
  liveText: {
    fontSize: 12,
    color: 'var(--dabbu-green, #10B981)',
    fontWeight: '600',
  },
  offlineText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 80,
  },
  balanceCard: {
    marginBottom: spacing.lg,
  },
  balanceRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  balanceInfo: {},
  balanceLabel: {
    fontSize: 13,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  balanceStatus: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: 4,
  },
  avatarStack: {
    marginLeft: spacing.lg,
  },
  avatarItem: {
    marginLeft: -8,
  },
  avatarMore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: 'var(--dabbu-bg, #000000)',
  },
  avatarMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  balanceStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'var(--dabbu-border, #2A2A2E)',
    paddingTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'var(--dabbu-border, #2A2A2E)',
    marginVertical: 4,
  },
  green: {
    color: 'var(--dabbu-green, #10B981)',
  },
  red: {
    color: 'var(--dabbu-red, #EF4444)',
  },
  whiteText: {
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  mutedText: {
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'var(--dabbu-surface, #121214)',
    borderRadius: radii.xl + 4,
    padding: 6,
    marginBottom: spacing.lg,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabActive: {
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabCountWrap: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
  },
  tabCountWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabCount: {
    fontSize: 10,
    fontWeight: '700',
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  tabCountActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    marginBottom: 0,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'var(--dabbu-text-muted, #64748B)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: 'var(--dabbu-text, #FFFFFF)',
    letterSpacing: -0.3,
  },
  statCardMeta: {
    fontSize: 10,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: spacing.xs,
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    marginBottom: spacing.md,
  },
  categoryRow: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textTransform: 'capitalize',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  categoryPct: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
  },
  insightCard: {
    marginBottom: spacing.lg,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  insightIconText: {
    fontSize: 20,
  },
  insightLabel: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
    textTransform: 'capitalize',
  },
  insightAccent: {
    color: 'var(--dabbu-accent, #8B5CF6)',
    fontWeight: '700',
  },
  balanceMemberRow: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  balanceMemberName: {
    fontSize: 13,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  balanceMemberAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  balanceBar: {
    height: '100%',
    borderRadius: 3,
  },
  settledText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  expenseSection: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl + spacing.lg,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: 14,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  memberCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    marginBottom: spacing.xs,
  },
  memberRow: {
    justifyContent: 'space-between',
  },
  memberInfo: {
    flex: 1,
    gap: spacing.md,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    marginLeft: spacing.sm,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  guestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    marginLeft: spacing.sm,
  },
  guestBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  memberMeta: {
    gap: spacing.xs,
    marginTop: 2,
  },
  memberMetaText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  memberMetaDot: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  memberBalance: {
    fontSize: 14,
    fontWeight: '700',
  },
  contributionRow: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  contributionBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
  },
  contributionPct: {
    fontSize: 10,
    color: 'var(--dabbu-text-muted, #64748B)',
    width: 32,
    textAlign: 'right',
  },
  settlementPlanCard: {
    marginBottom: spacing.lg,
  },
  settlementPlanHeader: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  settleAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
  },
  settleAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  settlementRow: {
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  settlementName: {
    fontSize: 13,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  settlementArrow: {
    fontSize: 14,
    color: 'var(--dabbu-accent, #8B5CF6)',
    marginHorizontal: spacing.sm,
  },
  settlementAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  settleSection: {
    marginBottom: spacing.lg,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    padding: spacing.lg,
    backgroundColor: 'transparent',
  },
  bottomBarInner: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    borderRadius: radii.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
  },
  bottomBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
  },
  bottomBtnIcon: {
    fontSize: 18,
  },
  bottomBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomBtnIconSecondary: {
    fontSize: 18,
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  bottomBtnTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
});
