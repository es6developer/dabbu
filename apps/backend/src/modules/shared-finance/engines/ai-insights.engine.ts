import { Injectable, Logger } from '@nestjs/common';

export interface Insight {
  type: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  title: string;
  message: string;
  actionable?: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

export interface MonthlyComparison {
  currentMonthTotal: number;
  lastMonthTotal: number;
  totalChange: number;
  totalChangePercent: number;
  categoryChanges: { category: string; current: number; last: number; change: number }[];
  memberChanges: { userId: string; name: string; current: number; last: number; change: number }[];
}

export interface FairnessScore {
  score: number;
  label: string;
  recommendations: string[];
}

@Injectable()
export class AiInsightsEngine {
  private readonly logger = new Logger(AiInsightsEngine.name);

  generateInsights(expenses: any[], members: any[], group: any, period?: string): Insight[] {
    const insights: Insight[] = [];

    if (!expenses || expenses.length === 0) {
      insights.push({
        type: 'no_activity',
        severity: 'info',
        title: 'No expenses yet',
        message: 'Start by adding your first shared expense to begin tracking.',
        actionable: true,
        actionLabel: 'Add Expense',
        actionRoute: '/expenses/add',
      });
      return insights;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthExpenses = expenses.filter((e) => {
      const d = new Date(e.date || e.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (thisMonthExpenses.length > 0) {
      const payerTotals = new Map<string, number>();
      for (const exp of thisMonthExpenses) {
        const amt = Number(exp.amount) || 0;
        payerTotals.set(exp.paidBy, (payerTotals.get(exp.paidBy) || 0) + amt);
      }

      let topPayerId = '';
      let topAmount = 0;
      for (const [uid, amt] of payerTotals) {
        if (amt > topAmount) {
          topAmount = amt;
          topPayerId = uid;
        }
      }

      if (topPayerId) {
        const member = members.find((m) => (m.userId || m.id) === topPayerId);
        const name = member
          ? `${member.user?.firstName || member.firstName || ''} ${member.user?.lastName || member.lastName || ''}`.trim()
          : 'Someone';
        insights.push({
          type: 'top_payer',
          severity: 'info',
          title: `${name} paid the most this month`,
          message: `${name} has paid ₹${topAmount.toLocaleString()} in ${thisMonthExpenses.length} expenses this month.`,
        });
      }
    }

    const categoryTotals = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(exp.amount));
    }

    if (group.monthlyBudget > 0) {
      for (const [cat, total] of categoryTotals) {
        if (total > group.monthlyBudget * 0.5) {
          insights.push({
            type: 'category_over_budget',
            severity: 'warning',
            title: `${cat} category spending high`,
            message: `${cat} expenses total ₹${total.toLocaleString()}, which is more than 50% of your monthly budget of ₹${Number(group.monthlyBudget).toLocaleString()}.`,
            actionable: true,
            actionLabel: 'View Budget',
            actionRoute: `/budget`,
          });
        }
      }
    }

    const totalSpent = Number(group.totalSpent) || 0;
    if (group.monthlyBudget > 0 && totalSpent > group.monthlyBudget) {
      insights.push({
        type: 'budget_exceeded',
        severity: 'warning',
        title: 'Monthly budget exceeded',
        message: `Group has spent ₹${totalSpent.toLocaleString()} this month, exceeding the ₹${Number(group.monthlyBudget).toLocaleString()} budget.`,
      });
    }

    const pendingSettlements = expenses.filter(
      (e) => e.splits && e.splits.some((s: any) => !s.isPaid),
    );
    if (pendingSettlements.length > 0) {
      const unpaidMembers = new Set<string>();
      for (const exp of pendingSettlements) {
        for (const split of exp.splits) {
          if (!split.isPaid && split.userId !== exp.paidBy) {
            unpaidMembers.add(split.userId);
          }
        }
      }

      if (unpaidMembers.size > 0) {
        const names = Array.from(unpaidMembers)
          .map((uid) => {
            const m = members.find((mm) => (mm.userId || mm.id) === uid);
            return m ? `${m.user?.firstName || m.firstName || ''}`.trim() : 'Someone';
          })
          .join(', ');
        insights.push({
          type: 'pending_settlements',
          severity: 'info',
          title: `${unpaidMembers.size} member${unpaidMembers.size > 1 ? 's' : ''} yet to settle up`,
          message: `${names} ${unpaidMembers.size > 1 ? 'have' : 'has'} pending payments to clear.`,
          actionable: true,
          actionLabel: 'View Settlements',
          actionRoute: `/settlements`,
        });
      }
    }

    if (members.length > 1) {
      const memberTotals = new Map<string, number>();
      for (const exp of expenses) {
        const amt = Number(exp.amount) || 0;
        memberTotals.set(exp.paidBy, (memberTotals.get(exp.paidBy) || 0) + amt);
      }

      if (memberTotals.size >= 2) {
        const amounts = Array.from(memberTotals.values());
        const max = Math.max(...amounts);
        const min = Math.min(...amounts);
        if (min > 0 && max / min > 3) {
          insights.push({
            type: 'uneven_spending',
            severity: 'warning',
            title: 'Uneven spending detected',
            message:
              'There is significant disparity in who is paying. Consider using contribution rules for fairer splits.',
            actionable: true,
            actionLabel: 'Set Rules',
            actionRoute: '/contributions',
          });
        }
      }
    }

    if (group.trip) {
      const tripBudget = Number(group.trip.totalBudget) || 0;
      const tripSpent = Number(group.trip.totalSpent) || 0;
      if (tripBudget > 0 && tripSpent > tripBudget * 0.8) {
        const tripCatTotals = new Map<string, number>();
        const tripExpenses = expenses.filter(
          (e) => e.category === 'Trip' || e.category === 'Travel',
        );
        for (const exp of tripExpenses) {
          const cat = exp.category || 'Other';
          tripCatTotals.set(cat, (tripCatTotals.get(cat) || 0) + Number(exp.amount));
        }

        for (const [cat, total] of tripCatTotals) {
          if (total > tripBudget * 0.4) {
            insights.push({
              type: 'trip_budget_exceeded',
              severity: 'warning',
              title: `Trip ${cat} budget running low`,
              message: `You've spent ₹${total.toLocaleString()} on ${cat}, which is ${Math.round((total / tripBudget) * 100)}% of the trip budget.`,
            });
          }
        }
      }
    }

    if (group.coupleProfile) {
      insights.push({
        type: 'couple_savings',
        severity: 'success',
        title: 'Couple finance active',
        message: `You're managing finances together with a shared budget of ₹${Number(group.coupleProfile.sharedBudget || 0).toLocaleString()}. Keep up the great teamwork!`,
      });
    }

    const subscriptions = group.sharedSubscriptions || [];
    if (subscriptions.length > 0) {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 86400000);
      const upcomingRenewals = subscriptions.filter((s: any) => {
        if (!s.nextBilling) {
          return false;
        }
        const nb = new Date(s.nextBilling);
        return nb >= now && nb <= nextWeek;
      });

      for (const sub of upcomingRenewals) {
        insights.push({
          type: 'subscription_renewal',
          severity: 'info',
          title: `${sub.name} renewing soon`,
          message: `${sub.name} (₹${Number(sub.amount).toLocaleString()}) is due for renewal on ${new Date(sub.nextBilling).toLocaleDateString()}.`,
          actionable: true,
          actionLabel: 'View Subscription',
          actionRoute: '/subscriptions',
        });
      }
    }

    if (members.length > 6) {
      insights.push({
        type: 'optimal_group_size',
        severity: 'info',
        title: 'Large group detected',
        message: `Your group has ${members.length} members. Consider using contribution rules and automated splits for easier management.`,
      });
    }

    return insights;
  }

  getMonthlyComparison(expenses: any[]): MonthlyComparison {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentExpenses = expenses.filter((e) => {
      const d = new Date(e.date || e.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastExpenses = expenses.filter((e) => {
      const d = new Date(e.date || e.createdAt);
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });

    const currentTotal = currentExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const lastTotal = lastExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalChange = currentTotal - lastTotal;
    const totalChangePercent = lastTotal > 0 ? Math.round((totalChange / lastTotal) * 100) : 0;

    const categoryChanges: { category: string; current: number; last: number; change: number }[] =
      [];
    const catSet = new Set<string>();
    for (const e of expenses) {
      catSet.add(e.category || 'Other');
    }

    for (const cat of catSet) {
      const cur = currentExpenses
        .filter((e) => (e.category || 'Other') === cat)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const lst = lastExpenses
        .filter((e) => (e.category || 'Other') === cat)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      if (cur > 0 || lst > 0) {
        categoryChanges.push({ category: cat, current: cur, last: lst, change: cur - lst });
      }
    }

    const memberChanges: {
      userId: string;
      name: string;
      current: number;
      last: number;
      change: number;
    }[] = [];
    const memberSet = new Set<string>();
    for (const e of expenses) {
      memberSet.add(e.paidBy);
    }

    for (const uid of memberSet) {
      const cur = currentExpenses
        .filter((e) => e.paidBy === uid)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const lst = lastExpenses
        .filter((e) => e.paidBy === uid)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      if (cur > 0 || lst > 0) {
        const member = expenses.find((e) => e.paidBy === uid);
        const name = member?.payer?.firstName || member?.payer?.email || uid;
        memberChanges.push({ userId: uid, name, current: cur, last: lst, change: cur - lst });
      }
    }

    return {
      currentMonthTotal: Math.round(currentTotal * 100) / 100,
      lastMonthTotal: Math.round(lastTotal * 100) / 100,
      totalChange: Math.round(totalChange * 100) / 100,
      totalChangePercent,
      categoryChanges,
      memberChanges,
    };
  }

  getFairnessScore(members: any[], expenses: any[]): FairnessScore {
    if (members.length < 2 || expenses.length === 0) {
      return {
        score: 100,
        label: 'Perfect',
        recommendations: ['Add more expenses to get a fairness analysis.'],
      };
    }

    const memberTotals = new Map<string, number>();
    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      memberTotals.set(exp.paidBy, (memberTotals.get(exp.paidBy) || 0) + amt);
    }

    const values = Array.from(memberTotals.values()).filter((v) => v > 0);
    if (values.length < 2) {
      return {
        score: 100,
        label: 'Perfect',
        recommendations: ['Only one member has paid so far. Encourage others to share expenses.'],
      };
    }

    values.sort((a, b) => a - b);
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;

    let sumOfDifferences = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfDifferences += Math.abs(values[i] - values[j]);
      }
    }

    const gini = sumOfDifferences / (2 * n * n * mean);
    const score = Math.max(0, Math.min(100, Math.round((1 - gini) * 100)));

    let label: string;
    if (score >= 80) {
      label = 'Fair';
    } else if (score >= 60) {
      label = 'Moderately Fair';
    } else if (score >= 40) {
      label = 'Uneven';
    } else {
      label = 'Very Uneven';
    }

    const recommendations: string[] = [];

    if (score < 60) {
      recommendations.push('Use equal split for shared expenses to ensure fairness.');
      recommendations.push('Set up contribution rules to automate fair distributions.');
      recommendations.push('Consider using salary-based split ratio for couples/roommates.');
    }

    if (score < 80) {
      recommendations.push('Rotate who pays for group expenses to balance contributions.');
    }

    recommendations.push('Review settlements regularly to keep balances in check.');

    return { score, label, recommendations };
  }
}
