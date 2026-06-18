import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [user, monthTxns, netWorth, healthScore, upcomingBills, goals, recentTxns] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            userType: true,
            isCoupleMode: true,
          },
        }),
        this.prisma.transaction.aggregate({
          where: { userId, deletedAt: null, date: { gte: monthStart, lte: monthEnd } },
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
      ]);

    const monthlyIncome = monthTxns._sum.amount ? Number(monthTxns._sum.amount) : 0;

    return {
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            userType: user.userType,
            isCoupleMode: user.isCoupleMode,
          }
        : null,
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
      monthlyIncome,
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
    };
  }
}
