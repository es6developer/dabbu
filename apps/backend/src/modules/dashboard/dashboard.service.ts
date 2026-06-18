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

    const [
      user,
      incomeAgg,
      expenseAgg,
      netWorth,
      healthScore,
      upcomingBills,
      goals,
      recentTxns,
      pendingRequests,
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
        select: { id: true, merchantName: true, amount: true, dueDate: true, category: true },
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
      this.prisma.coupleRequest.count({
        where: { receiverId: userId, status: 'pending' },
      }),
    ]);

    const monthlyIncome = Number(incomeAgg._sum.amount || 0);
    const monthlyExpense = Number(expenseAgg._sum.amount || 0);
    const savings = Math.max(0, monthlyIncome - monthlyExpense);
    const savingsRate = monthlyIncome > 0 ? Math.round((savings / monthlyIncome) * 100) : 0;

    let lastFeatures: any[] = [];
    try {
      const layout = user?.dashboardLayout as any;
      if (layout?.recentFeatures && Array.isArray(layout.recentFeatures)) {
        lastFeatures = layout.recentFeatures.slice(0, 10);
      }
    } catch {
      // ignore parse errors
    }

    return {
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            userType: user.userType,
            isCouple: user.isCouple,
            isCoupleMode: user.isCoupleMode,
            partnerId: user.partnerId,
            partnerLinkedAt: user.partnerLinkedAt,
          }
        : null,
      partner: user?.partner || null,
      isInCouple: user?.isCouple || false,
      pendingRequests,
      monthlySummary: {
        income: monthlyIncome,
        expense: monthlyExpense,
        savings,
        savingsRate,
      },
      netWorth: netWorth
        ? {
            totalAssets: Number(netWorth.totalAssets || 0),
            totalLiabilities: Number(netWorth.totalLiabilities || 0),
            cash: Number(netWorth.cash || 0),
            bank: Number(netWorth.bank || 0),
          }
        : null,
      healthScore: healthScore
        ? {
            overallScore: healthScore.overallScore,
            financialLevel: healthScore.financialLevel,
            monthlyChange: healthScore.monthlyChange,
          }
        : null,
      upcomingBills: upcomingBills.map((b) => ({
        id: b.id,
        name: b.merchantName,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        category: b.category,
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
      lastFeatures,
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
