import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccountInsightEngine, SpendingInsight, RecurringPattern } from './engine/account-insight.engine';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightEngine: AccountInsightEngine,
  ) {}

  async getAccounts(userId: string): Promise<any[]> {
    return this.prisma.account.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });
  }

  async getAccount(userId: string, accountId: string): Promise<any> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isDeleted: false },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        _count: { select: { transactions: true } },
      },
    });

    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async updateAccount(userId: string, accountId: string, data: { name?: string; type?: string; currency?: string; isActive?: boolean }) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isDeleted: false },
    });
    if (!account) throw new NotFoundException('Account not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isDeleted: false },
    });
    if (!account) throw new NotFoundException('Account not found');

    await this.prisma.account.update({
      where: { id: accountId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { message: 'Account deleted successfully' };
  }

  async getInsights(userId: string): Promise<SpendingInsight[]> {
    const insights = await this.insightEngine.generateSpendingInsights(userId);
    return insights;
  }

  async getRecurringPatterns(userId: string): Promise<RecurringPattern[]> {
    return this.insightEngine.detectRecurringPatterns(userId);
  }

  async getMonthlyTrends(userId: string, months: number = 6) {
    return this.insightEngine.getMonthlyTrend(userId, months);
  }

  async getAccountStats(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isDeleted: false },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const accountTypes = accounts.reduce((acc: Record<string, number>, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    const monthlyIncome = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const monthlyExpense = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    const recentTxs = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      include: { category: true, account: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    });

    return {
      totalAccounts: accounts.length,
      totalBalance,
      accountTypes,
      monthlyIncome,
      monthlyExpense,
      recentTransactions: recentTxs,
    };
  }
}
