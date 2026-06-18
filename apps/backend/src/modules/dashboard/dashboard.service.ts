import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const last6Months: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(d);
    }

    const [
      user,
      incomeAgg,
      expenseAgg,
      netWorth,
      healthScore,
      upcomingBills,
      goals,
      recentTxns,
      budgets,
      aiInsight,
      netWorthTrend,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          userType: true,
          isCouple: true,
          isCoupleMode: true,
          partnerId: true,
          partnerLinkedAt: true,
          dashboardLayout: true,
          partner: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          deletedAt: null,
          type: 'income',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          deletedAt: null,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.userNetWorth.findUnique({ where: { userId } }),
      this.prisma.aiScore.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.bill.findMany({
        where: { userId, deletedAt: null, isPaid: false, dueDate: { gte: now } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: { id: true, name: true, amount: true, dueDate: true, categoryId: true },
      }),
      this.prisma.goal.findMany({
        where: { userId, deletedAt: null, isCompleted: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          name: true,
          targetAmount: true,
          currentAmount: true,
          type: true,
          icon: true,
          color: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          type: true,
          category: true,
        },
      }),
      this.prisma.budget.findMany({
        where: { userId, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          amount: true,
          spent: true,
          period: true,
        },
        take: 5,
      }),
      this.prisma.aiInsight.findFirst({
        where: { userId, isDismissed: false },
        orderBy: { createdAt: 'desc' },
        select: { title: true, description: true, type: true, severity: true, amount: true },
      }),
      this.prisma.netWorthSnapshot.findMany({
        where: { userId },
        orderBy: { snapshotDate: 'asc' },
        take: 12,
        select: { snapshotDate: true, netWorth: true, totalAssets: true, totalLiabilities: true },
      }),
    ]);

    const monthlyIncome = Number(incomeAgg._sum.amount || 0);
    const monthlyExpense = Number(expenseAgg._sum.amount || 0);
    const savings = Math.max(0, monthlyIncome - monthlyExpense);
    const savingsRate = monthlyIncome > 0 ? Math.round((savings / monthlyIncome) * 100) : 0;

    const totalAssets = Number(netWorth?.totalAssets || 0);
    const totalLiabilities = Number(netWorth?.totalLiabilities || 0);
    const balance = totalAssets - totalLiabilities;

    let widgetOrder: string[] = [];
    try {
      const layout = user?.dashboardLayout as any;
      if (layout?.widgetOrder && Array.isArray(layout.widgetOrder)) {
        widgetOrder = layout.widgetOrder;
      }
    } catch {
      // eslint-disable-next-line no-empty
    }

    return {
      greeting: {
        name: user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User',
        balance,
        monthlyChange: healthScore?.monthlyChange || 0,
      },
      netWorth: {
        totalAssets,
        totalLiabilities,
        netWorth: balance,
        trend: netWorthTrend.map((s) => ({
          date: s.snapshotDate,
          netWorth: Number(s.netWorth || 0),
          totalAssets: Number(s.totalAssets || 0),
          totalLiabilities: Number(s.totalLiabilities || 0),
        })),
      },
      monthlySnapshot: {
        income: monthlyIncome,
        expense: monthlyExpense,
        saved: savings,
        savingsRate,
      },
      healthScore: healthScore
        ? {
            overallScore: healthScore.overallScore,
            categories: {
              savings: healthScore.savingsRate || 0,
              debt: 100 - (healthScore.debtRatio || 0),
              budget: healthScore.budgetDiscipline || 0,
              emergencyFund: healthScore.emergencyFund || 0,
              goalProgress: healthScore.goalProgress || 0,
            },
          }
        : {
            overallScore: 0,
            categories: { savings: 0, debt: 0, budget: 0, emergencyFund: 0, goalProgress: 0 },
          },
      aiInsight: aiInsight
        ? {
            message: aiInsight.description || aiInsight.title,
            type: aiInsight.type || 'info',
            impact: aiInsight.amount ? Number(aiInsight.amount) : 0,
          }
        : { message: 'Start tracking to get AI insights', type: 'info', impact: 0 },
      upcomingBills: upcomingBills.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        categoryId: b.categoryId,
      })),
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        type: g.type,
        icon: g.icon,
        color: g.color,
        progress:
          Number(g.targetAmount) > 0
            ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
            : 0,
      })),
      recentTransactions: recentTxns.map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
        type: t.type,
        category: t.category,
      })),
      budgetsOverview: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        spent: Number(b.spent),
        period: b.period,
        utilization:
          Number(b.amount) > 0 ? Math.round((Number(b.spent) / Number(b.amount)) * 100) : 0,
      })),
      widgetOrder,
    };
  }

  async trackFeature(userId: string, feature: string, label?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dashboardLayout: true },
    });
    if (!user) {
      return;
    }

    let layout: any = {};
    try {
      layout = user.dashboardLayout ? (user.dashboardLayout as any) : {};
    } catch {
      layout = {};
    }

    const recentFeatures: any[] = layout.recentFeatures || [];
    const now = new Date().toISOString();

    const existing = recentFeatures.findIndex((f: any) => f.feature === feature);
    const entry = { feature, label: label || feature, usedAt: now };

    if (existing >= 0) {
      recentFeatures.splice(existing, 1);
    }
    recentFeatures.unshift(entry);
    if (recentFeatures.length > 20) {
      recentFeatures.length = 20;
    }

    layout.recentFeatures = recentFeatures;

    await this.prisma.user.update({
      where: { id: userId },
      data: { dashboardLayout: layout as any },
    });
  }
}
