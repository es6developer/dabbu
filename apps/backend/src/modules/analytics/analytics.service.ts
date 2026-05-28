import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsQueryDto, AnalyticsPeriod } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, query: AnalyticsQueryDto) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [accountAgg, incomeAgg, expenseAgg, activeAccounts, upcomingBills, activeBudgets, recentTransactions, budgetsWithSpend] = await Promise.all([
      this.prisma.account.aggregate({
        where: { userId, isArchived: false },
        _sum: { balance: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.account.count({
        where: { userId, isArchived: false },
      }),
      this.prisma.bill.count({
        where: { userId, isPaid: false },
      }),
      this.prisma.budget.count({
        where: { userId, isActive: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          category: true,
          account: true,
        },
      }),
      this.prisma.budget.findMany({
        where: { userId, isActive: true },
        include: { category: true },
      }),
    ]);

    const totalBalance = accountAgg._sum.balance?.toNumber() ?? 0;
    const monthlyIncome = incomeAgg._sum.amount?.toNumber() ?? 0;
    const monthlyExpense = expenseAgg._sum.amount?.toNumber() ?? 0;
    const savingsRate = monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
      : 0;

    const budgetStatus = budgetsWithSpend.map((b) => {
      const limit = b.amount.toNumber();
      const spent = b.spent.toNumber();
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      let status: 'on_track' | 'overspent' | 'underspent' = 'on_track';
      if (percentage >= 100) status = 'overspent';
      else if (percentage < 50) status = 'underspent';
      return {
        id: b.id,
        name: b.name,
        category: b.category,
        limit,
        spent,
        percentage: Math.round(percentage * 100) / 100,
        status,
        remaining: Math.max(0, limit - spent),
      };
    });

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      savingsRate: Math.round(savingsRate * 100) / 100,
      activeAccounts,
      upcomingBills,
      activeBudgets,
      recentTransactions,
      budgetStatus,
    };
  }

  async getSpendingTrend(userId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: { gte: startDate, lte: endDate },
        ...(query.accountId && { accountId: query.accountId }),
        ...(query.categoryId && { categoryId: query.categoryId }),
      },
      select: { amount: true, date: true, type: true },
      orderBy: { date: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const t of transactions) {
      const key = this.formatPeriodKey(t.date, query.period || AnalyticsPeriod.MONTHLY);
      grouped.set(key, (grouped.get(key) || 0) + t.amount.toNumber());
    }

    return Array.from(grouped.entries()).map(([period, amount]) => ({
      period,
      amount: Math.round(amount * 100) / 100,
    }));
  }

  async getCategoryBreakdown(userId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);

    const whereClause: any = {
      userId,
      type: 'expense',
      date: { gte: startDate, lte: endDate },
    };
    if (query.accountId) whereClause.accountId = query.accountId;

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      select: { amount: true, categoryId: true, category: true },
    });

    const total = transactions.reduce((sum, t) => sum + t.amount.toNumber(), 0);
    const byCategory = new Map<string, { name: string; icon: string | null; color: string | null; amount: number }>();

    for (const t of transactions) {
      const catId = t.categoryId || 'uncategorized';
      const existing = byCategory.get(catId);
      const amount = t.amount.toNumber();
      if (existing) {
        existing.amount += amount;
      } else {
        byCategory.set(catId, {
          name: t.category?.name || 'Uncategorized',
          icon: t.category?.icon || null,
          color: t.category?.color || null,
          amount,
        });
      }
    }

    return Array.from(byCategory.entries()).map(([categoryId, data]) => ({
      categoryId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      amount: Math.round(data.amount * 100) / 100,
      percentage: total > 0 ? Math.round((data.amount / total) * 10000) / 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }

  async getCashFlow(userId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const period = query.period || AnalyticsPeriod.MONTHLY;

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        type: { in: ['income', 'expense'] },
        ...(query.accountId && { accountId: query.accountId }),
      },
      select: { amount: true, date: true, type: true },
      orderBy: { date: 'asc' },
    });

    const grouped = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const key = this.formatPeriodKey(t.date, period);
      const entry = grouped.get(key) || { income: 0, expense: 0 };
      const amount = t.amount.toNumber();
      if (t.type === 'income') entry.income += amount;
      else entry.expense += amount;
      grouped.set(key, entry);
    }

    return Array.from(grouped.entries()).map(([periodKey, data]) => ({
      period: periodKey,
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
    }));
  }

  async getNetWorth(userId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);

    const [accounts, bills] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId, isArchived: false },
        select: { balance: true },
      }),
      this.prisma.bill.findMany({
        where: {
          userId,
          isPaid: false,
          dueDate: { gte: startDate, lte: endDate },
        },
        select: { amount: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const totalAssets = accounts.reduce((sum, a) => sum + a.balance.toNumber(), 0);
    const totalLiabilities = bills.reduce((sum, b) => sum + b.amount.toNumber(), 0);

    const liabilityByDate = new Map<string, number>();
    let runningLiability = totalLiabilities;
    for (const bill of bills) {
      const key = this.formatDateKey(bill.dueDate);
      runningLiability -= bill.amount.toNumber();
      liabilityByDate.set(key, Math.max(0, runningLiability));
    }

    const timeline = Array.from(liabilityByDate.entries()).map(([date, liabilities]) => ({
      date,
      assets: totalAssets,
      liabilities: Math.round(liabilities * 100) / 100,
      netWorth: Math.round((totalAssets - liabilities) * 100) / 100,
    }));

    return {
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
      timeline,
    };
  }

  async getBudgetAnalytics(userId: string, query: AnalyticsQueryDto) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgets = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: true },
    });

    const results = budgets.map((b) => {
      const limit = b.amount.toNumber();
      const spent = b.spent.toNumber();
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      let status: 'on_track' | 'overspent' | 'underspent';
      if (percentage >= 100) status = 'overspent';
      else if (percentage > 80) status = 'on_track';
      else status = 'underspent';

      return {
        id: b.id,
        name: b.name,
        category: b.category,
        limit,
        spent,
        remaining: Math.max(0, limit - spent),
        percentage: Math.round(percentage * 100) / 100,
        status,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
      };
    });

    const onTrack = results.filter((r) => r.status === 'on_track').length;
    const overspent = results.filter((r) => r.status === 'overspent').length;
    const underspent = results.filter((r) => r.status === 'underspent').length;

    return {
      budgets: results,
      summary: {
        total: results.length,
        onTrack,
        overspent,
        underspent,
        onTrackPercentage: results.length > 0 ? Math.round((onTrack / results.length) * 100) : 0,
      },
    };
  }

  async getInsights(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonthExpenses, lastMonthExpenses, categoryTotals, avgTransaction] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: startOfMonth, lte: now } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'expense',
          categoryId: { not: null },
          date: { gte: startOfMonth, lte: now },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense' },
        _avg: { amount: true },
      }),
    ]);

    const insights: {
      type: string;
      title: string;
      message: string;
      metric?: number;
      category?: string;
    }[] = [];

    const currentExpense = currentMonthExpenses._sum.amount?.toNumber() ?? 0;
    const lastExpense = lastMonthExpenses._sum.amount?.toNumber() ?? 0;

    if (lastExpense > 0 && currentExpense > lastExpense) {
      const increase = ((currentExpense - lastExpense) / lastExpense) * 100;
      insights.push({
        type: 'spending_increase',
        title: 'Spending Increased',
        message: `Your spending increased by ${Math.round(increase)}% compared to last month.`,
        metric: Math.round(increase),
      });
    }

    if (categoryTotals.length > 0) {
      const topCategory = categoryTotals.reduce((max, c) =>
        (c._sum.amount?.toNumber() ?? 0) > (max._sum.amount?.toNumber() ?? 0) ? c : max,
      );
      const topAmount = topCategory._sum.amount?.toNumber() ?? 0;
      const topPercentage = currentExpense > 0 ? (topAmount / currentExpense) * 100 : 0;
      const topCat = await this.prisma.transactionCategory.findUnique({
        where: { id: topCategory.categoryId! },
      });
      insights.push({
        type: 'largest_category',
        title: 'Largest Expense Category',
        message: `${topCat?.name || 'Unknown'} accounts for ${Math.round(topPercentage)}% of your spending.`,
        metric: Math.round(topPercentage),
        category: topCat?.name || undefined,
      });
    }

    const avgAmount = avgTransaction._avg.amount?.toNumber() ?? 0;
    const largeTransactions = await this.prisma.transaction.count({
      where: {
        userId,
        type: 'expense',
        amount: { gt: avgAmount * 3 },
        date: { gte: startOfMonth },
      },
    });
    if (largeTransactions > 0) {
      insights.push({
        type: 'large_transactions',
        title: 'Unusual Transactions Detected',
        message: `You have ${largeTransactions} transaction(s) significantly above your average.`,
        metric: largeTransactions,
      });
    }

    const savings = currentMonthExpenses._count
      ? currentMonthExpenses._count > 20
      : false;
    if (!savings && currentExpense < lastExpense && lastExpense > 0) {
      insights.push({
        type: 'savings_opportunity',
        title: 'Good Savings Trend',
        message: 'You\'re spending less than last month. Keep it up!',
      });
    }

    return insights;
  }

  async getCategorySummary(userId: string, startDate?: string, endDate?: string) {
    const { startDate: start, endDate: end } = this.resolveDateRange(
      startDate || endDate
        ? ({ startDate, endDate } as AnalyticsQueryDto)
        : ({} as AnalyticsQueryDto),
    );

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: { gte: start, lte: end },
      },
      select: { amount: true, categoryId: true, category: true, type: true },
    });

    const total = transactions.reduce((sum, t) => sum + t.amount.toNumber(), 0);
    const byCategory = new Map<string, { name: string; icon: string | null; color: string | null; amount: number; count: number }>();

    for (const t of transactions) {
      const catId = t.categoryId || 'uncategorized';
      const existing = byCategory.get(catId);
      const amount = t.amount.toNumber();
      if (existing) {
        existing.amount += amount;
        existing.count += 1;
      } else {
        byCategory.set(catId, {
          name: t.category?.name || 'Uncategorized',
          icon: t.category?.icon || null,
          color: t.category?.color || null,
          amount,
          count: 1,
        });
      }
    }

    return Array.from(byCategory.entries()).map(([categoryId, data]) => ({
      categoryId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      percentage: total > 0 ? Math.round((data.amount / total) * 10000) / 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }

  private resolveDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }

    if (query.endDate) {
      endDate = new Date(query.endDate);
    } else {
      endDate = now;
    }

    return { startDate, endDate };
  }

  private formatPeriodKey(date: Date, period: AnalyticsPeriod): string {
    const d = new Date(date);
    switch (period) {
      case AnalyticsPeriod.DAILY:
        return d.toISOString().slice(0, 10);
      case AnalyticsPeriod.WEEKLY: {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return startOfWeek.toISOString().slice(0, 10);
      }
      case AnalyticsPeriod.MONTHLY:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case AnalyticsPeriod.YEARLY:
        return `${d.getFullYear()}`;
      default:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private formatDateKey(date: Date): string {
    return new Date(date).toISOString().slice(0, 10);
  }
}
