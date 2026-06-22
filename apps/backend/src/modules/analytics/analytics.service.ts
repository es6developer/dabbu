import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { AnalyticsQueryDto, AnalyticsPeriod, ReportQueryDto, ExportQueryDto } from './dto/analytics-query.dto';

interface TrackEventDto {
  event: string;
  category?: string;
  label?: string;
  properties?: any;
  sessionId?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async getDashboard(userId: string, query: AnalyticsQueryDto) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [accountAgg, incomeAgg, expenseAgg, activeAccounts, upcomingBills, activeBudgets, recentTransactions, budgetsWithSpend] = await Promise.all([
      this.prisma.account.aggregate({
        where: { userId, ...lensFilter, isArchived: false },
        _sum: { balance: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          ...lensFilter,
          type: 'income',
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          ...lensFilter,
          type: 'expense',
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.account.count({
        where: { userId, ...lensFilter, isArchived: false },
      }),
      this.prisma.bill.count({
        where: { userId, ...lensFilter, isPaid: false },
      }),
      this.prisma.budget.count({
        where: { userId, ...lensFilter, isActive: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, ...lensFilter },
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          category: true,
          account: true,
        },
      }),
      this.prisma.budget.findMany({
        where: { userId, ...lensFilter, isActive: true },
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
      if (percentage >= 100) {status = 'overspent';}
      else if (percentage < 50) {status = 'underspent';}
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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        ...lensFilter,
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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const whereClause: any = {
      userId,
      ...lensFilter,
      type: 'expense',
      date: { gte: startDate, lte: endDate },
    };
    if (query.accountId) {whereClause.accountId = query.accountId;}

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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        ...lensFilter,
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
      if (t.type === 'income') {entry.income += amount;}
      else {entry.expense += amount;}
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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [accounts, bills] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId, ...lensFilter, isArchived: false },
        select: { balance: true },
      }),
      this.prisma.bill.findMany({
        where: {
          userId,
          ...lensFilter,
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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const budgets = await this.prisma.budget.findMany({
      where: { userId, ...lensFilter, isActive: true },
      include: { category: true },
    });

    const results = budgets.map((b) => {
      const limit = b.amount.toNumber();
      const spent = b.spent.toNumber();
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      let status: 'on_track' | 'overspent' | 'underspent';
      if (percentage >= 100) {status = 'overspent';}
      else if (percentage > 80) {status = 'on_track';}
      else {status = 'underspent';}

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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [currentMonthExpenses, lastMonthExpenses, categoryTotals, avgTransaction] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'expense', date: { gte: startOfMonth, lte: now } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'expense', date: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          ...lensFilter,
          type: 'expense',
          categoryId: { not: null },
          date: { gte: startOfMonth, lte: now },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'expense' },
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
        ...lensFilter,
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

  // ─── Report Methods ─────────────────────────────────────

  async getExpenseReport(userId: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const lensFilter = await this.lensData.buildLensFilter(userId);
    const whereBase: any = {
      userId,
      ...lensFilter,
      type: 'expense',
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    };
    if (query.groupId) {whereBase.expenseGroupId = query.groupId;}

    const [totalResult, categoryData, monthlyTrend] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: whereBase,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      this.getCategoryBreakdown(userId, query),
      this.getSpendingTrend(userId, query),
    ]);

    const totalExpense = totalResult._sum.amount?.toNumber() ?? 0;
    const topCategory = categoryData.length > 0 ? categoryData[0] : null;

    return {
      totalExpense,
      transactionCount: totalResult._count,
      averageTransaction: Math.round((totalResult._avg.amount?.toNumber() ?? 0) * 100) / 100,
      topCategory,
      categories: categoryData,
      monthlyTrend,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    };
  }

  async getIncomeReport(userId: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const lensFilter = await this.lensData.buildLensFilter(userId);
    const whereBase: any = {
      userId,
      ...lensFilter,
      type: 'income',
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    };
    if (query.groupId) {whereBase.expenseGroupId = query.groupId;}

    const [totalResult, monthlyTrend] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: whereBase,
        _sum: { amount: true },
        _count: true,
      }),
      this.getCashFlow(userId, query),
    ]);

    const totalIncome = totalResult._sum.amount?.toNumber() ?? 0;

    const incomeByCategory = await this.prisma.transaction.findMany({
      where: whereBase,
      include: { category: true },
    });
    const catMap = new Map<string, number>();
    for (const t of incomeByCategory) {
      const name = t.category?.name || 'Uncategorized';
      catMap.set(name, (catMap.get(name) || 0) + t.amount.toNumber());
    }
    const sources = Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      transactionCount: totalResult._count,
      sources,
      monthlyTrend,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    };
  }

  async getSavingsReport(userId: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const cashFlow = await this.getCashFlow(userId, query);

    let totalIncome = 0;
    let totalExpense = 0;
    for (const m of cashFlow) {
      totalIncome += m.income;
      totalExpense += m.expense;
    }
    const totalSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    const savingsTrend = cashFlow.map((m) => ({
      period: m.period,
      income: m.income,
      expense: m.expense,
      savings: m.net,
      savingsRate: m.income > 0 ? Math.round((m.net / m.income) * 10000) / 100 : 0,
    }));

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
      savingsTrend,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    };
  }

  async getMemberReport(userId: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const { groupId, memberId } = query;

    if (!groupId) {
      return this._buildPersonalMemberReport(userId, startDate, endDate);
    }

    const groupMemberIds = await this.prisma.sharedGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const uids = groupMemberIds.map((m) => m.userId);
    const targetUids = memberId ? [memberId] : uids;

    const members = await this.prisma.user.findMany({
      where: { id: { in: targetUids }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const memberData = await Promise.all(
      members.map(async (member) => {
        const memberLensFilter = await this.lensData.buildLensFilter(member.id);
        const [expenseAgg, incomeAgg, txCount] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { userId: member.id, ...memberLensFilter, type: 'expense', date: { gte: startDate, lte: endDate }, deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: { userId: member.id, ...memberLensFilter, type: 'income', date: { gte: startDate, lte: endDate }, deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.transaction.count({
            where: { userId: member.id, ...memberLensFilter, date: { gte: startDate, lte: endDate }, deletedAt: null },
          }),
        ]);
        return {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`.trim() || member.email,
          totalExpense: expenseAgg._sum.amount?.toNumber() ?? 0,
          totalIncome: incomeAgg._sum.amount?.toNumber() ?? 0,
          transactionCount: txCount,
        };
      }),
    );

    const groupTotal = memberData.reduce((s, m) => s + m.totalExpense, 0);
    return {
      members: memberData.map((m) => ({
        ...m,
        contributionPercentage: groupTotal > 0 ? Math.round((m.totalExpense / groupTotal) * 10000) / 100 : 0,
      })),
      groupTotal,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    };
  }

  private async _buildPersonalMemberReport(userId: string, startDate: Date, endDate: Date) {
    const lensFilter = await this.lensData.buildLensFilter(userId);
    const [expenseAgg, incomeAgg, txCount, categories] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'expense', date: { gte: startDate, lte: endDate }, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'income', date: { gte: startDate, lte: endDate }, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({
        where: { userId, ...lensFilter, date: { gte: startDate, lte: endDate }, deletedAt: null },
      }),
      this.getCategoryBreakdown(userId, { startDate: startDate.toISOString(), endDate: endDate.toISOString() } as any),
    ]);
    return {
      members: [{
        id: userId,
        name: 'You',
        totalExpense: expenseAgg._sum.amount?.toNumber() ?? 0,
        totalIncome: incomeAgg._sum.amount?.toNumber() ?? 0,
        transactionCount: txCount,
        contributionPercentage: 100,
      }],
      categories,
      groupTotal: expenseAgg._sum.amount?.toNumber() ?? 0,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    };
  }

  async getGroupReport(userId: string, groupId: string) {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
    if (!group) {throw new NotFoundException('Group not found');}

    const memberIds = group.members.map((m) => m.userId);
    if (!memberIds.includes(userId)) {throw new ForbiddenException('Not a member of this group');}

    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [expenseAgg, txCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId: { in: memberIds }, ...lensFilter, expenseGroupId: groupId, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({
        where: { userId: { in: memberIds }, ...lensFilter, expenseGroupId: groupId, deletedAt: null },
      }),
    ]);

    const memberExpenses = await Promise.all(
      group.members.map(async (m) => {
        const agg = await this.prisma.transaction.aggregate({
          where: { userId: m.userId, ...lensFilter, expenseGroupId: groupId, type: 'expense', deletedAt: null },
          _sum: { amount: true },
        });
        return {
          id: m.userId,
          name: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
          totalExpense: agg._sum.amount?.toNumber() ?? 0,
        };
      }),
    );

    const groupTotal = expenseAgg._sum.amount?.toNumber() ?? 0;
    return {
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
      totalExpense: groupTotal,
      transactionCount: txCount,
      activeMembers: group.members.filter((m) => m.isActive).length,
      totalMembers: group.members.length,
      memberExpenses: memberExpenses.map((m) => ({
        ...m,
        percentage: groupTotal > 0 ? Math.round((m.totalExpense / groupTotal) * 10000) / 100 : 0,
      })),
    };
  }

  // ─── Export Methods ──────────────────────────────────────

  async exportPdf(userId: string, query: ExportQueryDto, reportType: string): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const { startDate, endDate } = this.resolveDateRange(query as AnalyticsQueryDto);
      const dateRangeStr = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

      // Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#F7892C').text('Dabbu', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666').text('Smart Family Finance', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E0E0E0').stroke();
      doc.moveDown(0.5);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#333').text(`${reportType} Report`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Period: ${dateRangeStr}`, { align: 'center' });
      if (query.groupId) {
        doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Group ID: ${query.groupId}`, { align: 'center' });
      }
      doc.moveDown(1);

      // Summary section
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#333').text('Summary', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`Report Type: ${reportType}`);
      doc.text(`Date Range: ${dateRangeStr}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown(1);

      // Footer
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E0E0E0').stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#999').text('Dabbu - Smart Family Finance', { align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#999').text('This is a computer-generated report.', { align: 'center' });

      doc.end();
    });
  }

  async exportExcel(userId: string, query: ExportQueryDto, reportType: string): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dabbu';
    wb.created = new Date();

    // Summary sheet
    const summary = wb.addWorksheet('Summary');
    summary.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 },
      { header: 'Period', key: 'period', width: 20 },
    ];
    summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7892C' } };
    summary.addRow({ metric: 'Report Type', value: reportType });
    summary.addRow({ metric: 'Generated', value: new Date().toLocaleString() });
    summary.addRow({ metric: 'Group ID', value: query.groupId || 'All accounts' });
    summary.addRow({ metric: 'Start Date', value: query.startDate || 'N/A' });
    summary.addRow({ metric: 'End Date', value: query.endDate || 'N/A' });

    // Transactions sheet
    const txSheet = wb.addWorksheet('Transactions');
    txSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Description', key: 'description', width: 40 },
    ];
    txSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    txSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7892C' } };

    const { startDate, endDate } = this.resolveDateRange(query as AnalyticsQueryDto);
    const lensFilter = await this.lensData.buildLensFilter(userId);
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, ...lensFilter, date: { gte: startDate, lte: endDate }, deletedAt: null },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 500,
    });
    for (const t of transactions) {
      txSheet.addRow({
        date: t.date.toISOString().slice(0, 10),
        type: t.type,
        category: t.category?.name || '',
        amount: t.amount.toNumber(),
        description: t.description || '',
      });
    }

    // Categories sheet
    const catSheet = wb.addWorksheet('Categories');
    catSheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Percentage', key: 'percentage', width: 14 },
    ];
    catSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    catSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7892C' } };

    const catData = await this.getCategoryBreakdown(userId, query as AnalyticsQueryDto);
    for (const c of catData) {
      catSheet.addRow({ category: c.name, amount: c.amount, count: 0, percentage: `${c.percentage}%` });
    }

    // Members sheet
    const memSheet = wb.addWorksheet('Members');
    memSheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Expenses', key: 'expenses', width: 16 },
      { header: 'Income', key: 'income', width: 16 },
      { header: 'Transactions', key: 'transactions', width: 14 },
    ];
    memSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    memSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7892C' } };

    try {
      const memberReport = await this.getMemberReport(userId, query as any);
      for (const m of memberReport.members) {
        memSheet.addRow({ name: m.name, expenses: m.totalExpense, income: m.totalIncome, transactions: m.transactionCount });
      }
    } catch {}

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async getCategorySummary(userId: string, startDate?: string, endDate?: string) {
    const { startDate: start, endDate: end } = this.resolveDateRange(
      startDate || endDate
        ? ({ startDate, endDate } as AnalyticsQueryDto)
        : ({} as AnalyticsQueryDto),
    );

    const lensFilter = await this.lensData.buildLensFilter(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        ...lensFilter,
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

  // ─── Event Tracking ────────────────────────────────────

  async track(userId: string | null, dto: TrackEventDto, ip?: string, userAgent?: string) {
    return this.prisma.analyticsEvent.create({
      data: {
        userId,
        event: dto.event,
        category: dto.category || null,
        label: dto.label || null,
        properties: dto.properties || undefined,
        sessionId: dto.sessionId || null,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });
  }

  async trackBatch(userId: string | null, events: TrackEventDto[]) {
    const data = events.map((e) => ({
      userId,
      event: e.event,
      category: e.category || null,
      label: e.label || null,
      properties: e.properties || undefined,
      sessionId: e.sessionId || null,
    }));
    await this.prisma.analyticsEvent.createMany({ data });
  }

  // ─── Retention & Activity ──────────────────────────────

  async getActiveUsers(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const total = await this.prisma.user.count({ where: { deletedAt: null } });
    const active = await this.prisma.user.count({
      where: { lastLoginAt: { gte: since }, deletedAt: null },
    });
    return { total, active, rate: total > 0 ? Math.round((active / total) * 100) : 0 };
  }

  async getRetention(days = 90) {
    const now = new Date();
    const cohorts: { period: string; total: number; retained: number; rate: number }[] = [];

    for (let i = 1; i <= 3; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const total = await this.prisma.user.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd }, deletedAt: null },
      });

      const retained = await this.prisma.user.count({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
          lastLoginAt: { gte: new Date(Date.now() - days * 86400000) },
          deletedAt: null,
        },
      });

      cohorts.push({
        period: `${monthStart.toLocaleDateString('en', { month: 'short', year: '2-digit' })}`,
        total,
        retained,
        rate: total > 0 ? Math.round((retained / total) * 100) : 0,
      });
    }

    return cohorts;
  }

  async getFeatureUsage(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { timestamp: { gte: since } },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
    });

    return events.map((e: any) => ({
      event: e.event,
      count: e._count,
      uniqueUsers: 0,
    }));
  }

  async getPremiumConversion() {
    const total = await this.prisma.user.count({ where: { deletedAt: null } });
    const premium = await this.prisma.subscription.count({
      where: {
        status: 'active',
        currentPeriodEnd: { gte: new Date() },
        plan: { code: { not: 'FREE' } },
      },
    });
    const trial = await this.prisma.subscription.count({
      where: {
        status: 'active',
        plan: { code: 'FREE' },
        currentPeriodEnd: { gte: new Date() },
      },
    });

    return {
      totalUsers: total,
      premiumUsers: premium,
      freeUsers: trial,
      conversionRate: total > 0 ? Math.round((premium / total) * 100) : 0,
    };
  }

  async getOnboardingCompletion() {
    const total = await this.prisma.user.count({ where: { deletedAt: null } });
    const withTransactions = await this.prisma.transaction.groupBy({
      by: ['userId'],
      _count: { id: true },
    });
    const completed = withTransactions.filter((t) => t._count.id >= 1).length;
    return {
      totalUsers: total,
      completedOnboarding: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async getEventSummary(days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const daily = await this.prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { timestamp: { gte: since } },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
    });

    const totalEvents = daily.reduce((s, e: any) => s + e._count, 0);
    const uniqueUsers = (
      await this.prisma.analyticsEvent.findMany({
        where: { timestamp: { gte: since }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      })
    ).length;

    return {
      period: `${days}d`,
      totalEvents,
      uniqueUsers,
      events: daily.map((e: any) => ({
        event: e.event,
        count: e._count,
      })),
    };
  }
}
