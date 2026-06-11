import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AccountInsightEngine,
  SpendingInsight,
  RecurringPattern,
} from './engine/account-insight.engine';
import { FinancialHealthEngine, HealthScoreResult } from './engine/financial-health.engine';
import { SmartInsightsEngine, SmartInsight } from './engine/smart-insights.engine';
import {
  SubscriptionIntelligenceEngine,
  SubscriptionIntelligence,
} from './engine/subscription-intelligence.engine';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightEngine: AccountInsightEngine,
    private readonly healthEngine: FinancialHealthEngine,
    private readonly smartInsightsEngine: SmartInsightsEngine,
    private readonly subscriptionEngine: SubscriptionIntelligenceEngine,
    private readonly aiService: AiService,
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

    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: { name?: string; type?: string; currency?: string; isActive?: boolean },
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isDeleted: false },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.account.update({
      where: { id: accountId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isDeleted: false },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

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

    const [monthTxs, salaryProfile] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.salaryProfile.findUnique({ where: { userId } }),
    ]);

    const txIncome = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const salaryIncome = Number(salaryProfile?.salary || 0);
    const monthlyIncome = Math.max(txIncome, salaryIncome);

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

  async getFinancialHealth(userId: string): Promise<HealthScoreResult> {
    return this.healthEngine.calculate(userId);
  }

  async getSmartInsights(userId: string): Promise<SmartInsight[]> {
    return this.smartInsightsEngine.generate(userId);
  }

  async getAiSmartInsights(userId: string): Promise<any[]> {
    const ruleInsights = await this.smartInsightsEngine.generate(userId);
    const health = await this.healthEngine.calculate(userId);
    const stats = await this.getAccountStats(userId);

    const aiInsights = await this.aiService.generateInsights('dashboard', {
      ruleInsights,
      health: {
        score: health?.score,
        label: health?.label,
        factors: health?.factors,
      },
      stats: {
        monthlyIncome: stats.monthlyIncome,
        monthlyExpense: stats.monthlyExpense,
        totalBalance: stats.totalBalance,
      },
    });

    const merged = [...ruleInsights.map((i) => ({ ...i, source: 'rule' })), ...aiInsights];

    return merged.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2, success: 3 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    });
  }

  async getSubscriptionIntelligence(userId: string): Promise<SubscriptionIntelligence> {
    return this.subscriptionEngine.analyze(userId);
  }

  async getSafeToSpend(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isDeleted: false },
    });
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [upcomingBills, activeLoans] = await Promise.all([
      this.prisma.bill.findMany({
        where: {
          userId,
          deletedAt: null,
          isPaid: false,
          dueDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.userLoan.findMany({
        where: { userId, deletedAt: null },
      }),
    ]);

    const upcomingBillsTotal = upcomingBills.reduce((s, b) => s + Number(b.amount), 0);
    const monthlyEmiTotal = activeLoans.reduce((s, l) => s + Number(l.monthlyEmi), 0);

    const safeToSpend = Math.max(0, totalBalance - upcomingBillsTotal - monthlyEmiTotal);

    return {
      totalBalance,
      upcomingBills: upcomingBillsTotal,
      monthlyEmi: monthlyEmiTotal,
      safeToSpend,
      billsCount: upcomingBills.length,
      loansCount: activeLoans.length,
    };
  }
}
