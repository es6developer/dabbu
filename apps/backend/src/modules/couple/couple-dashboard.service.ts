import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CoupleGamificationService } from './couple-gamification.service';

@Injectable()
export class CoupleDashboardService {
  private readonly logger = new Logger(CoupleDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificationService: CoupleGamificationService,
  ) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isCouple: true,
        isCoupleMode: true,
        partnerLinkedAt: true,
        partner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!user || !user.partner) {
      throw new Error('Couple not found');
    }

    const sharedGroup = await this.prisma.sharedGroup.findFirst({
      where: {
        type: 'couple',
        members: { some: { userId, isActive: true } },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        netWorth: true,
        totalAssets: true,
        totalLiabilities: true,
      },
    });
    if (!sharedGroup) {
      throw new Error('Couple workspace not found');
    }

    const groupId = sharedGroup.id;

    const [gamification, netWorthTrend, monthlySnapshot, aiSummary, sharedBalance] =
      await Promise.all([
        this.gamificationService.getGamification(groupId),
        this.getNetWorthTrend(groupId),
        this.getMonthlySnapshot(groupId),
        this.getAiSummary(groupId, user.firstName),
        this.getSharedBalance(groupId),
      ]);

    return {
      partners: {
        me: { id: user.id, firstName: user.firstName, lastName: user.lastName },
        partner: user.partner,
      },
      togetherSince: user.partnerLinkedAt || sharedGroup.createdAt,
      healthScore: gamification.healthScore,
      netWorth: {
        total: Number(sharedGroup.netWorth || 0),
        assets: Number(sharedGroup.totalAssets || 0),
        liabilities: Number(sharedGroup.totalLiabilities || 0),
        trend: netWorthTrend,
      },
      sharedBalance,
      monthlySnapshot,
      aiSummary,
      gamification: {
        level: gamification.level,
        xp: gamification.xp,
        xpProgress: gamification.xpProgress,
        xpRequired: gamification.xpRequired,
        achievements: gamification.achievements.filter((a) => a.earned).length,
      },
      groupId,
    };
  }

  private async getNetWorthTrend(groupId: string) {
    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);

    const snapshots = await this.prisma.netWorthSnapshot.findMany({
      where: { userId: { in: userIds } },
      orderBy: { snapshotDate: 'desc' },
      take: 12,
    });

    const combined: Record<
      string,
      { date: string; assets: number; liabilities: number; netWorth: number }
    > = {};
    for (const snap of snapshots) {
      const key = snap.snapshotDate.toISOString().split('T')[0];
      if (!combined[key]) {
        combined[key] = { date: key, assets: 0, liabilities: 0, netWorth: 0 };
      }
      combined[key].assets += Number(snap.totalAssets);
      combined[key].liabilities += Number(snap.totalLiabilities);
      combined[key].netWorth += Number(snap.netWorth);
    }

    return Object.values(combined).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthlySnapshot(groupId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentExpenses = await this.prisma.sharedExpense.aggregate({
      where: { groupId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const lastExpenses = await this.prisma.sharedExpense.aggregate({
      where: { groupId, date: { gte: startOfLastMonth, lt: startOfMonth } },
      _sum: { amount: true },
    });
    const currentIncomes = await this.prisma.coupleFinanceIncome.aggregate({
      where: { groupId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const savings = await this.prisma.coupleFinanceSaving.aggregate({
      where: { groupId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    const income = Number(currentIncomes._sum.amount || 0);
    const expenses = Number(currentExpenses._sum.amount || 0);
    const totalSavings = Number(savings._sum.amount || 0);
    const lastExpensesTotal = Number(lastExpenses._sum.amount || 0);

    return {
      income,
      expenses,
      savings: totalSavings,
      investments: 0,
      savingsRate: income > 0 ? Math.round((totalSavings / income) * 100) : 0,
      change:
        lastExpensesTotal > 0
          ? Math.round(((expenses - lastExpensesTotal) / lastExpensesTotal) * 100)
          : 0,
    };
  }

  private async getSharedBalance(groupId: string) {
    const settlements = await this.prisma.settlement.aggregate({
      where: { groupId, status: 'completed' },
      _sum: { amount: true },
    });

    const totalSettled = Number(settlements._sum.amount || 0);
    return { amount: totalSettled, change: 0 };
  }

  private async getAiSummary(groupId: string, userName: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentExpenses = await this.prisma.sharedExpense.aggregate({
      where: { groupId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const currentIncomes = await this.prisma.coupleFinanceIncome.aggregate({
      where: { groupId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const currentSavings = await this.prisma.coupleFinanceSaving.aggregate({
      where: { groupId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const budgets = await this.prisma.coupleBudgetCategory.findMany({
      where: { groupId, period: now.toISOString().slice(0, 7) },
    });
    const planners = await this.prisma.couplePlanner.findMany({
      where: { groupId, status: 'active' },
    });

    const expenses = Number(currentExpenses._sum.amount || 0);
    const income = Number(currentIncomes._sum.amount || 0);
    const savings = Number(currentSavings._sum.amount || 0);
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    const insights: string[] = [];
    if (savings > 0) {
      insights.push(
        `This month you saved ${this.formatCurrency(savings)}. Savings rate is ${savingsRate}%.`,
      );
    }

    for (const budget of budgets) {
      if (Number(budget.spentAmount) > Number(budget.budgetAmount)) {
        const overspent = Number(budget.spentAmount) - Number(budget.budgetAmount);
        insights.push(`${budget.category} exceeded budget by ${this.formatCurrency(overspent)}.`);
      }
    }

    for (const planner of planners) {
      const current = Number(planner.currentSavings || 0);
      const target = Number(planner.targetAmount || 0);
      if (target > 0) {
        const progress = Math.round((current / target) * 100);
        if (progress > 0) {
          insights.push(`You are ${progress}% to your ${planner.plannerType} goal.`);
        }
      }
    }

    if (insights.length === 0) {
      insights.push('Start tracking expenses and incomes to get personalized insights.');
    }

    return {
      text: insights[0] || '',
      insights,
      savingsRate,
    };
  }

  async getCoachInsights(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, partnerId: true },
    });
    if (!user || !user.partnerId) {
      throw new Error('Couple not found');
    }

    const group = await this.prisma.sharedGroup.findFirst({
      where: { type: 'couple', members: { some: { userId, isActive: true } } },
    });
    if (!group) {
      throw new Error('Couple workspace not found');
    }

    const groupId = group.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [expenses, lastExpenses, incomes, budgets, savings, planners] = await Promise.all([
      this.prisma.sharedExpense.aggregate({
        where: { groupId, date: { gte: startOfMonth } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.sharedExpense.aggregate({
        where: { groupId, date: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.coupleFinanceIncome.aggregate({
        where: { groupId, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.coupleBudgetCategory.findMany({
        where: { groupId, period: now.toISOString().slice(0, 7) },
        orderBy: { budgetAmount: 'desc' },
      }),
      this.prisma.coupleFinanceSaving.aggregate({ where: { groupId }, _sum: { amount: true } }),
      this.prisma.couplePlanner.findMany({ where: { groupId, status: 'active' } }),
    ]);

    const totalExpenses = Number(expenses._sum.amount || 0);
    const lastMonthExpenses = Number(lastExpenses._sum.amount || 0);
    const totalIncome = Number(incomes._sum.amount || 0);
    const totalSavings = Number(savings._sum.amount || 0);
    const expenseCount = expenses._count;
    const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

    const insights: Array<{ type: 'positive' | 'warning' | 'info'; icon: string; title: string; description: string }> = [];
    const suggestions: Array<{ icon: string; title: string; description: string; action: string; screen: string }> = [];

    if (lastMonthExpenses > 0) {
      const change = Math.round(((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100);
      if (change < 0) {
        insights.push({
          type: 'positive', icon: 'trending-down',
          title: `Spending decreased ${Math.abs(change)}%`,
          description: `You spent ${Math.abs(change)}% less this month compared to last month. Great job staying on track!`,
        });
      } else if (change > 0) {
        insights.push({
          type: 'warning', icon: 'trending-up',
          title: `Spending increased ${change}%`,
          description: `Your spending went up ${change}% this month. Review your expenses to identify where you can cut back.`,
        });
      }
    }

    if (savingsRate > 0) {
      insights.push({
        type: savingsRate >= 20 ? 'positive' : 'info',
        icon: 'trending-up',
        title: `Savings rate: ${savingsRate}%`,
        description: savingsRate >= 20
          ? `Excellent savings rate! You're saving ${savingsRate}% of your income. Keep it up!`
          : `Your savings rate is ${savingsRate}%. Aim for 20% to build a strong financial future.`,
      });
    }

    for (const budget of budgets) {
      const spent = Number(budget.spentAmount || 0);
      const budgeted = Number(budget.budgetAmount || 0);
      if (spent > budgeted) {
        const over = spent - budgeted;
        insights.push({
          type: 'warning', icon: 'alert-circle',
          title: `${budget.category} exceeded budget`,
          description: `You've spent ${this.formatCurrency(over)} over your ${budget.category} budget this month.`,
        });
      }
    }

    for (const planner of planners) {
      const current = Number(planner.currentSavings || 0);
      const target = Number(planner.targetAmount || 0);
      const pct = target > 0 ? Math.round((current / target) * 100) : 0;
      if (pct > 0 && pct < 100) {
        insights.push({
          type: 'info', icon: 'flag',
          title: `${planner.plannerType} goal ${pct}% complete`,
          description: `You're ${pct}% to your ${planner.plannerType.toLowerCase()} goal. Keep contributing to stay on track!`,
        });
      }
    }

    if (totalExpenses > 0 && totalIncome > 0 && (totalExpenses / totalIncome) > 0.7) {
      suggestions.push({
        icon: 'wallet', title: 'Reduce monthly expenses',
        description: `You're spending ${Math.round((totalExpenses / totalIncome) * 100)}% of your income. Try to keep it under 70%.`,
        action: 'Review', screen: 'CoupleBudgets',
      });
    }

    if (savingsRate < 20) {
      suggestions.push({
        icon: 'save', title: 'Increase savings rate', action: 'Save More',
        description: `Your current savings rate is ${savingsRate}%. Increasing it by 5% would add significant long-term value.`,
        screen: 'CoupleSavings',
      });
    }

    const hasEmergencyFund = planners.some((p: any) => p.plannerType === 'BABY' && Number(p.emergencyFund) > 0);
    if (!hasEmergencyFund) {
      suggestions.push({
        icon: 'shield', title: 'Build an emergency fund', action: 'Start',
        description: 'Aim for 6 months of expenses in an emergency fund. Start with a small monthly contribution.',
        screen: 'CoupleSavings',
      });
    }

    return {
      insights,
      suggestions,
      updatedAt: now.toISOString(),
      healthBreakdown: [
        { label: 'Spending vs Budget', score: Math.min(100, Math.max(0, 100 - Math.round(totalExpenses / (totalIncome || 1) * 100))) },
        { label: 'Savings Rate', score: Math.min(100, Math.max(0, savingsRate * 3)) },
        { label: 'Debt Management', score: 90 }, // placeholder
        { label: 'Goal Progress', score: Math.min(100, planners.length > 0 ? 50 : 0) },
        { label: 'Emergency Fund', score: 33 }, // placeholder
      ],
    };
  }

  private formatCurrency(amount: number): string {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(amount)}`;
  }
}
