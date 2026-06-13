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
