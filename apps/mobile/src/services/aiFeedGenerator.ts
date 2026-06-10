import { api, setAccessToken } from './api';

interface Transaction {
  id: string;
  amount: number;
  type?: string;
  description?: string;
  category?: string | { name: string };
  date?: string;
  createdAt?: string;
  transactionType?: string;
}

interface Budget {
  id: string;
  name?: string;
  category?: string | { name: string };
  limit?: number;
  amount?: number;
  spent?: number;
  _sum?: { amount: number };
  period?: string;
  startDate?: string;
  endDate?: string;
}

interface Goal {
  id: string;
  name: string;
  type?: string;
  target?: number;
  targetAmount?: number;
  saved?: number;
  currentAmount?: number;
  deadline?: string;
  targetDate?: string;
  monthlyContribution?: number;
  milestoneDates?: Record<string, string | null>;
}

interface SubscriptionResponse {
  monthlyTotal?: number;
  yearlyTotal?: number;
  activeCount?: number;
  upcomingRenewals?: Array<{
    id?: string;
    name: string;
    amount: number;
    frequency: string;
    daysUntilDue: number;
  }>;
}

interface AccountStats {
  totalBalance?: number;
  data?: { totalBalance: number };
}

interface ExpenseGroup {
  id: string;
  name: string;
  totalSpent?: number;
  members?: any[];
  _count?: { members: number };
  status?: string;
}

export interface FeedCard {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  impactValue: number | null;
  confidenceScore: number | null;
  category: string;
  actionType: string | null;
  actionPayload: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export interface FeedSummary {
  totalInsightsToday: number;
  savingsPotential: number;
  riskAlerts: number;
  goalUpdates: number;
  topPriority: string | null;
}

const NOW = new Date();
const TODAY = NOW.toISOString();

let cardSeq = 0;
function uid(): string {
  cardSeq += 1;
  return `feed_local_${Date.now()}_${cardSeq}`;
}

function catName(cat: string | { name: string } | undefined): string {
  if (!cat) {
    return 'Other';
  }
  if (typeof cat === 'string') {
    return cat;
  }
  return cat.name || 'Other';
}

function safeAmt(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function priorityWeight(p: string): number {
  return p === 'critical' ? 4 : p === 'high' ? 3 : p === 'medium' ? 2 : 1;
}

// ─── Analyzers ────────────────────────────────────

function analyzeSpendingInsights(transactions: Transaction[]): FeedCard[] {
  if (transactions.length === 0) {
    return [];
  }

  const totalSpent = transactions
    .filter((t) => t.amount > 0 && (t.type === 'expense' || t.transactionType !== 'income'))
    .reduce((s, t) => s + safeAmt(t.amount), 0);

  const catMap = new Map<string, number>();
  for (const t of transactions) {
    if (t.amount > 0) {
      const name = catName(t.category);
      catMap.set(name, (catMap.get(name) || 0) + safeAmt(t.amount));
    }
  }

  const sortedCats = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
  const top = sortedCats.slice(0, 3);
  const count = transactions.length;

  const cards: FeedCard[] = [];

  if (totalSpent > 0) {
    cards.push({
      id: uid(),
      type: 'spending_insight',
      priority: 'medium',
      title: `₹${totalSpent.toLocaleString('en-IN')} spent this month`,
      message: `Across ${count} transactions. ${top.length > 0 ? 'Top category: ' + top[0][0] + ' (₹' + top[0][1].toLocaleString('en-IN') + ')' : ''}`,
      impactValue: totalSpent,
      confidenceScore: 90,
      category: 'spending',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    });
  }

  if (top.length >= 2) {
    const secondPct = Math.round((top[1][1] / totalSpent) * 100);
    if (secondPct > 20) {
      cards.push({
        id: uid(),
        type: 'spending_insight',
        priority: 'low',
        title: `${top[1][0]} is ${secondPct}% of spending`,
        message: `₹${top[1][1].toLocaleString('en-IN')} in ${top[1][0]}. Consider reviewing if this aligns with your budget.`,
        impactValue: top[1][1],
        confidenceScore: 85,
        category: 'spending',
        actionType: null,
        actionPayload: null,
        isRead: false,
        createdAt: TODAY,
      });
    }
  }

  return cards;
}

function analyzeBudgetRisks(budgets: Budget[]): FeedCard[] {
  const cards: FeedCard[] = [];
  for (const b of budgets) {
    const limit = safeAmt(b.limit || b.amount);
    if (limit <= 0) {
      continue;
    }
    const spent = safeAmt(b.spent ?? b._sum?.amount);
    if (spent <= 0) {
      continue;
    }
    const pct = (spent / limit) * 100;

    if (pct >= 100) {
      cards.push({
        id: uid(),
        type: 'budget_risk',
        priority: 'critical',
        title: `Overspent ${catName(b.category || b.name)}`,
        message: `Spent ₹${spent.toLocaleString('en-IN')} of ₹${limit.toLocaleString('en-IN')} budget (${Math.round(pct)}%). Time to adjust!`,
        impactValue: spent - limit,
        confidenceScore: 95,
        category: 'budget',
        actionType: null,
        actionPayload: null,
        isRead: false,
        createdAt: TODAY,
      });
    } else if (pct >= 80) {
      cards.push({
        id: uid(),
        type: 'budget_risk',
        priority: 'high',
        title: `${catName(b.category || b.name)} at ${Math.round(pct)}%`,
        message: `₹${spent.toLocaleString('en-IN')} used of ₹${limit.toLocaleString('en-IN')}. Only ₹${(limit - spent).toLocaleString('en-IN')} left.`,
        impactValue: limit - spent,
        confidenceScore: 90,
        category: 'budget',
        actionType: null,
        actionPayload: null,
        isRead: false,
        createdAt: TODAY,
      });
    }
  }
  return cards;
}

function analyzeGoals(goals: Goal[]): FeedCard[] {
  const cards: FeedCard[] = [];
  for (const g of goals) {
    const target = safeAmt(g.target ?? g.targetAmount);
    const saved = safeAmt(g.saved ?? g.currentAmount);
    if (target <= 0) {
      continue;
    }
    const pct = Math.min(100, Math.round((saved / target) * 100));

    if (pct >= 90) {
      cards.push({
        id: uid(),
        type: 'goal_update',
        priority: 'high',
        title: `Almost there! ${g.name} at ${pct}%`,
        message: `₹${saved.toLocaleString('en-IN')} saved of ₹${target.toLocaleString('en-IN')}. Just ₹${(target - saved).toLocaleString('en-IN')} to go!`,
        impactValue: target - saved,
        confidenceScore: 80,
        category: 'goals',
        actionType: null,
        actionPayload: null,
        isRead: false,
        createdAt: TODAY,
      });
    } else if (pct >= 50) {
      cards.push({
        id: uid(),
        type: 'goal_update',
        priority: 'medium',
        title: `Good progress on ${g.name}`,
        message: `${pct}% complete — ₹${saved.toLocaleString('en-IN')} of ₹${target.toLocaleString('en-IN')}. Keep it up!`,
        impactValue: saved,
        confidenceScore: 85,
        category: 'goals',
        actionType: null,
        actionPayload: null,
        isRead: false,
        createdAt: TODAY,
      });
    }

    if (g.deadline || g.targetDate) {
      const deadline = new Date(g.deadline || g.targetDate || '');
      if (deadline > NOW) {
        const daysLeft = Math.ceil((deadline.getTime() - NOW.getTime()) / 86400000);
        if (daysLeft <= 30 && pct < 50) {
          cards.push({
            id: uid(),
            type: 'goal_update',
            priority: 'critical',
            title: `${g.name} deadline approaching`,
            message: `${daysLeft} days left but only ${pct}% saved. Consider increasing contributions.`,
            impactValue: target - saved,
            confidenceScore: 90,
            category: 'goals',
            actionType: null,
            actionPayload: null,
            isRead: false,
            createdAt: TODAY,
          });
        }
      }
    }
  }
  return cards;
}

function analyzeSubscriptions(subs: SubscriptionResponse | null): {
  cards: FeedCard[];
  savings: number;
} {
  const cards: FeedCard[] = [];
  let savings = 0;

  if (!subs) {
    return { cards, savings };
  }

  const monthly = safeAmt(subs.monthlyTotal);

  if (monthly > 0) {
    cards.push({
      id: uid(),
      type: 'subscription_warning',
      priority: 'medium',
      title: `₹${monthly.toLocaleString('en-IN')}/mo in subscriptions`,
      message: `${subs.activeCount ?? 0} active subscriptions. Annual cost: ₹${(subs.yearlyTotal || monthly * 12).toLocaleString('en-IN')}.`,
      impactValue: monthly,
      confidenceScore: 95,
      category: 'subscriptions',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    });
  }

  if (subs.upcomingRenewals?.length) {
    for (const r of subs.upcomingRenewals) {
      if (r.daysUntilDue <= 3) {
        cards.push({
          id: uid(),
          type: 'subscription_warning',
          priority: 'high',
          title: `${r.name} renews ${r.daysUntilDue === 0 ? 'today' : `in ${r.daysUntilDue}d`}`,
          message: `₹${r.amount} ${r.frequency} payment upcoming.`,
          impactValue: r.amount,
          confidenceScore: 95,
          category: 'subscriptions',
          actionType: null,
          actionPayload: null,
          isRead: false,
          createdAt: TODAY,
        });
      } else if (r.daysUntilDue <= 7) {
        cards.push({
          id: uid(),
          type: 'subscription_warning',
          priority: 'low',
          title: `${r.name} renews in ${r.daysUntilDue}d`,
          message: `₹${r.amount} ${r.frequency} — due ${r.daysUntilDue === 0 ? 'today' : `in ${r.daysUntilDue} days`}.`,
          impactValue: r.amount,
          confidenceScore: 90,
          category: 'subscriptions',
          actionType: null,
          actionPayload: null,
          isRead: false,
          createdAt: TODAY,
        });
      }
    }
  }

  // savings suggestion: if spending > 1000/mo, suggest reviewing
  if (monthly > 1000 && (subs.activeCount ?? 0) >= 3) {
    savings = Math.round(monthly * 0.15);
    cards.push({
      id: uid(),
      type: 'savings_opportunity',
      priority: 'low',
      title: `Potential ₹${savings.toLocaleString('en-IN')}/mo savings`,
      message: `Reviewing ${subs.activeCount} subscriptions could save ~15%. Check for unused services.`,
      impactValue: savings,
      confidenceScore: 70,
      category: 'subscriptions',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    });
  }

  return { cards, savings };
}

function analyzeAnomalies(transactions: Transaction[]): FeedCard[] {
  if (transactions.length < 5) {
    return [];
  }

  const amounts = transactions.map((t) => safeAmt(t.amount)).filter((a) => a > 0);
  if (amounts.length === 0) {
    return [];
  }

  const sum = amounts.reduce((a, b) => a + b, 0);
  const mean = sum / amounts.length;
  const variance = amounts.reduce((v, a) => v + (a - mean) ** 2, 0) / amounts.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) {
    return [];
  }
  const threshold = mean + 2.5 * stddev;

  const cards: FeedCard[] = [];
  for (const t of transactions) {
    const amt = safeAmt(t.amount);
    if (amt > threshold && amt > 1000) {
      cards.push({
        id: uid(),
        type: 'anomaly_alert',
        priority: amt > mean + 4 * stddev ? 'critical' : 'high',
        title: `Large transaction: ₹${amt.toLocaleString('en-IN')}`,
        message: `${t.description || catName(t.category)} — ${Math.round((amt / mean - 1) * 100)}% above your average transaction of ₹${Math.round(mean).toLocaleString('en-IN')}.`,
        impactValue: amt,
        confidenceScore: Math.min(95, Math.round(80 + (amt / mean - 1) * 5)),
        category: 'spending',
        actionType: null,
        actionPayload: null,
        isRead: false,
        createdAt: TODAY,
      });
    }
  }

  return cards;
}

function analyzeSharedGroups(groups: ExpenseGroup[]): FeedCard[] {
  if (groups.length === 0) {
    return [];
  }

  const cards: FeedCard[] = [];

  for (const g of groups) {
    const spent = safeAmt(g.totalSpent);
    const memberCount = g._count?.members ?? g.members?.length ?? 0;

    if (spent > 0) {
      cards.push({
        id: uid(),
        type: 'settlement_optimization',
        priority: 'low',
        title: `${g.name}: ₹${spent.toLocaleString('en-IN')} total`,
        message: `${memberCount} members. ${memberCount > 1 ? 'Check if there are pending settlements.' : ''}`,
        impactValue: Math.round(spent / Math.max(1, memberCount)),
        confidenceScore: 80,
        category: 'shared',
        actionType: null,
        actionPayload: { groupId: g.id } as any,
        isRead: false,
        createdAt: TODAY,
      });
    }
  }

  return cards;
}

function analyzeAccountHealth(accountStats: AccountStats | null): FeedCard[] {
  if (!accountStats) {
    return [];
  }

  const balance = accountStats?.totalBalance ?? accountStats?.data?.totalBalance ?? 0;
  if (balance <= 0) {
    return [];
  }

  return [
    {
      id: uid(),
      type: 'spending_insight',
      priority: 'low',
      title: `Balance: ₹${balance.toLocaleString('en-IN')}`,
      message: `Your total account balance across all accounts.`,
      impactValue: balance,
      confidenceScore: 95,
      category: 'accounts',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    },
  ];
}

function analyzeAchievements(
  transactions: Transaction[],
  goals: Goal[],
  budgets: Budget[],
): FeedCard[] {
  const cards: FeedCard[] = [];

  if (transactions.length > 0) {
    cards.push({
      id: uid(),
      type: 'achievement',
      priority: 'low',
      title: `${transactions.length} transactions tracked`,
      message: `You've recorded ${transactions.length} transactions this period. Consistent tracking leads to better financial health!`,
      impactValue: null,
      confidenceScore: 100,
      category: 'achievement',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    });
  }

  if (goals.length >= 2) {
    cards.push({
      id: uid(),
      type: 'achievement',
      priority: 'low',
      title: `${goals.length} active goals`,
      message: `You're juggling ${goals.length} financial goals. That's great forward planning!`,
      impactValue: null,
      confidenceScore: 100,
      category: 'achievement',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    });
  }

  if (budgets.length >= 3) {
    cards.push({
      id: uid(),
      type: 'achievement',
      priority: 'low',
      title: `${budgets.length} budgets set`,
      message: `You've set ${budgets.length} budget categories. Budgeting is the #1 habit for financial success.`,
      impactValue: null,
      confidenceScore: 100,
      category: 'achievement',
      actionType: null,
      actionPayload: null,
      isRead: false,
      createdAt: TODAY,
    });
  }

  return cards;
}

function extractArray(res: PromiseSettledResult<any>): any[] {
  if (res.status !== 'fulfilled' || !res.value) {
    return [];
  }
  const v = res.value;
  if (Array.isArray(v)) {
    return v;
  }
  if (v.data && Array.isArray(v.data)) {
    return v.data;
  }
  return [];
}

function extractObject<T>(res: PromiseSettledResult<any>): T | null {
  if (res.status !== 'fulfilled' || !res.value) {
    return null;
  }
  const v = res.value;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as T;
  }
  return null;
}

export async function generateFeedFromRealData(
  accessToken: string,
): Promise<{ feed: FeedCard[]; summary: FeedSummary }> {
  setAccessToken(accessToken);

  const [txRes, bdRes, glRes, sbRes, acRes, grRes] = await Promise.allSettled([
    api.get<any>('/transactions?days=30&limit=100'),
    api.get<any>('/accounts/budgets'),
    api.get<any>('/goals'),
    api.get<any>('/accounts/subscriptions'),
    api.get<any>('/accounts/stats'),
    api.get<any>('/expense-groups'),
  ]);

  const transactions = extractArray(txRes);
  const budgets = extractArray(bdRes);
  const goals = extractArray(glRes);
  const subscriptions = extractObject<SubscriptionResponse>(sbRes);
  const accountStats = extractObject<AccountStats>(acRes);
  const groups = extractArray(grRes);

  const allCards: FeedCard[] = [
    ...analyzeSpendingInsights(transactions),
    ...analyzeBudgetRisks(budgets),
    ...analyzeSubscriptions(subscriptions).cards,
    ...analyzeAnomalies(transactions),
    ...analyzeSharedGroups(groups),
    ...analyzeAccountHealth(accountStats),
    ...analyzeAchievements(transactions, goals, budgets),
    ...analyzeGoals(goals),
  ];

  const cards = allCards
    .filter((c) => c.title && c.message)
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

  const savingsPotential = cards
    .filter((c) => c.type === 'savings_opportunity')
    .reduce((s, c) => s + (c.impactValue || 0), 0);

  const riskAlerts = cards.filter((c) => c.priority === 'critical' || c.priority === 'high').length;
  const goalUpdates = cards.filter((c) => c.type === 'goal_update').length;

  return {
    feed: cards,
    summary: {
      totalInsightsToday: cards.length,
      savingsPotential,
      riskAlerts,
      goalUpdates,
      topPriority: cards[0]?.priority ?? null,
    },
  };
}

export function isGeneratedCard(id: string): boolean {
  return id.startsWith('feed_local_');
}
