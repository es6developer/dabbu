import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface SmartInsight {
  type: 'spending_trend' | 'category_spike' | 'unusual_spending' | 'goal_progress' | 'savings_opportunity';
  icon: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  actionable?: boolean;
  actionLabel?: string;
}

@Injectable()
export class SmartInsightsEngine {
  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = now;
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [transactions, categories, goals, bills, salaryProfile] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, date: { gte: prevMonthStart, lte: monthEnd } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.transactionCategory.findMany({
        where: { userId, transactionType: 'expense' },
      }),
      this.prisma.goal.findMany({
        where: { userId, deletedAt: null },
      }),
      this.prisma.bill.findMany({
        where: { userId, deletedAt: null },
      }),
      this.prisma.salaryProfile.findUnique({ where: { userId } }),
    ]);

    const currentExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.date >= monthStart,
    );
    const prevExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.date >= prevMonthStart && t.date < monthStart,
    );

    const currentTotal = currentExpenses.reduce((s, t) => s + Number(t.amount), 0);
    const prevTotal = prevExpenses.reduce((s, t) => s + Number(t.amount), 0);

    if (prevTotal > 0 && currentTotal > 0) {
      const diff = currentTotal - prevTotal;
      const pct = Math.round((diff / prevTotal) * 100);
      if (Math.abs(pct) >= 5) {
        insights.push({
          type: 'spending_trend',
          icon: pct < 0 ? 'trending-down' : 'trending-up',
          title: pct < 0 ? 'Spending Decreased' : 'Spending Increased',
          message: pct < 0
            ? `You spent ${Math.abs(pct)}% less this month compared to last month.`
            : `Your spending increased by ${pct}% this month compared to last month.`,
          severity: pct > 20 ? 'warning' : pct < -10 ? 'success' : 'info',
          actionable: pct > 20,
          actionLabel: pct > 20 ? 'Review Expenses' : undefined,
        });
      }
    }

    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    for (const cat of categories) {
      const currentCat = currentExpenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((s, t) => s + Number(t.amount), 0);
      const prevCat = prevExpenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((s, t) => s + Number(t.amount), 0);

      if (prevCat > 0 && currentCat > prevCat * 1.4 && currentCat > 500) {
        const diff = currentCat - prevCat;
        insights.push({
          type: 'category_spike',
          icon: 'alert-circle',
          title: `${cat.name} Spending Up`,
          message: `You spent ₹${Math.round(diff).toLocaleString('en-IN')} more on ${cat.name.toLowerCase()} this month.`,
          severity: currentCat > prevCat * 2 ? 'critical' : 'warning',
          actionable: true,
          actionLabel: 'View Details',
        });
      }
    }

    for (const cat of categories) {
      const avg = prevExpenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((s, t) => s + Number(t.amount), 0);
      const current = currentExpenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((s, t) => s + Number(t.amount), 0);

      if (avg > 0 && current > avg * 2.5 && current > 1000 && current > 0) {
        insights.push({
          type: 'unusual_spending',
          icon: 'flame',
          title: `Unusual Spending in ${cat.name}`,
          message: `Your ${cat.name.toLowerCase()} spending is unusually high at ₹${Math.round(current).toLocaleString('en-IN')}.`,
          severity: 'warning',
          actionable: true,
          actionLabel: 'Investigate',
        });
      }
    }

    const recurringTransactions = transactions.filter(
      (t) => t.isRecurring && t.type === 'expense',
    );
    if (recurringTransactions.length > 0) {
      const subTotal = recurringTransactions.reduce((s, t) => s + Number(t.amount), 0);
      const monthlyIncome = Number(salaryProfile?.salary || 0);
      insights.push({
        type: 'savings_opportunity',
        icon: 'card',
        title: 'Recurring Subscriptions',
        message: `Your subscriptions cost approximately ₹${Math.round(subTotal).toLocaleString('en-IN')} monthly.${monthlyIncome > 0 ? ` That's ${Math.round((subTotal / monthlyIncome) * 100)}% of your income.` : ''}`,
        severity: subTotal > monthlyIncome * 0.15 ? 'warning' : 'info',
        actionable: true,
        actionLabel: 'Review Subscriptions',
      });
    }

    const activeGoals = goals.filter((g) => !g.isCompleted);
    const onTrackGoals = activeGoals.filter(
      (g) =>
        Number(g.currentAmount) > 0 &&
        (g.deadline
          ? Number(g.currentAmount) / Number(g.targetAmount) >=
            1 - (new Date(g.deadline).getTime() - now.getTime()) / Math.max(new Date(g.deadline).getTime() - new Date(g.createdAt || now).getTime(), 1)
          : Number(g.currentAmount) / Number(g.targetAmount) >= 0.5),
    );
    if (onTrackGoals.length > 0) {
      const goal = onTrackGoals[0];
      const pct = Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100);
      insights.push({
        type: 'goal_progress',
        icon: 'flag',
        title: 'Goal On Track',
        message: `You're on track for your "${goal.name}" goal — ${pct}% complete.`,
        severity: 'success',
        actionable: false,
      });
    }
    if (activeGoals.length === 0 && currentTotal > 0) {
      insights.push({
        type: 'savings_opportunity',
        icon: 'wallet',
        title: 'Savings Opportunity',
        message: `You spent ₹${Math.round(currentTotal).toLocaleString('en-IN')} this month. Could you save ₹${Math.max(Math.round(currentTotal * 0.15), 500).toLocaleString('en-IN')} by reducing discretionary spending?`,
        severity: 'info',
        actionable: false,
      });
    }

    const monthlyIncome = Number(salaryProfile?.salary || 0);
    if (monthlyIncome > 0 && currentTotal > 0) {
      const savingsPotential = monthlyIncome * 0.3 - (monthlyIncome - currentTotal);
      if (savingsPotential > 500) {
        insights.push({
          type: 'savings_opportunity',
          icon: 'trending-down',
          title: 'Potential Savings',
          message: `You can save approximately ₹${Math.round(savingsPotential).toLocaleString('en-IN')} more each month by reducing non-essential spending.`,
          severity: 'info',
          actionable: false,
        });
      }
    }

    return insights;
  }
}
