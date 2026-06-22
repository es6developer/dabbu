import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { LensDataService } from '../../common/lens/lens-data.service';

@Injectable()
export class PersonalDashboardService {
  private readonly logger = new Logger(PersonalDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly lensData: LensDataService,
  ) {}

  async getWidgets(userId: string) {
    const cacheKey = `dashboard:personal:${userId}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const configs = await this.prisma.dashboardWidget.findMany({
      where: { userId, scope: 'personal', enabled: true },
      orderBy: { position: 'asc' },
    });

    const enabledTypes = new Set(
      configs.length > 0
        ? configs.map(c => c.widgetType)
        : ['GREETING', 'NET_WORTH', 'THIS_MONTH', 'HEALTH_SCORE', 'AI_INSIGHTS', 'GOALS', 'UPCOMING_BILLS', 'RECENT_TRANSACTIONS', 'BUDGETS', 'QUICK_ACTIONS'],
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const fetchers: Record<string, () => Promise<any>> = {
      GREETING: () => this.getGreeting(userId),
      NET_WORTH: () => this.getNetWorth(userId),
      THIS_MONTH: () => this.getThisMonth(userId, monthStart, monthEnd),
      HEALTH_SCORE: () => this.getHealthScore(userId),
      AI_INSIGHTS: () => this.getAiInsights(userId),
      GOALS: () => this.getGoals(userId),
      UPCOMING_BILLS: () => this.getUpcomingBills(userId),
      RECENT_TRANSACTIONS: () => this.getRecentTransactions(userId),
      BUDGETS: () => this.getBudgets(userId),
      QUICK_ACTIONS: () => this.getQuickActions(),
    };

    const results = await Promise.all(
      [...enabledTypes].map(async (type) => {
        try {
          const data = fetchers[type] ? await fetchers[type]() : null;
          return { type, data, state: 'loaded' as const };
        } catch (err) {
          this.logger.error(`Widget ${type} failed: ${err}`);
          return { type, data: null, state: 'error' as const };
        }
      }),
    );

    const widgetOrder = [...enabledTypes];
    results.sort((a, b) => widgetOrder.indexOf(a.type) - widgetOrder.indexOf(b.type));

    await this.cache.set(cacheKey, results, 120);
    return results;
  }

  private async getGreeting(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const { income, expense } = await this.getThisMonth(
      userId,
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    );
    const change = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    return {
      name: user?.firstName || 'User',
      balance: income - expense,
      change,
    };
  }

  private async getBudgets(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, categoryId: true, amount: true, spent: true, category: { select: { name: true } } },
    });
    return budgets.map(b => ({
      category: b.category?.name || 'General',
      spent: Number(b.spent || 0),
      limit: Number(b.amount || 1),
    }));
  }

  private async getNetWorth(userId: string) {
    const nw = await this.prisma.userNetWorth.findUnique({ where: { userId } });
    const trend = await this.prisma.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'asc' },
      take: 12,
      select: { snapshotDate: true, netWorth: true, totalAssets: true, totalLiabilities: true },
    });
    const totalAssets = Number(nw?.totalAssets || 0);
    const totalLiabilities = Number(nw?.totalLiabilities || 0);
    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      total: totalAssets - totalLiabilities,
      snapshots: trend.map(s => ({ date: s.snapshotDate, netWorth: Number(s.netWorth || 0) })),
    };
  }

  private async getThisMonth(userId: string, monthStart: Date, monthEnd: Date) {
    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: 'income', date: { gte: monthStart, lte: monthEnd }, ...(await this.lensData.buildLensFilter(userId)) },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: 'expense', date: { gte: monthStart, lte: monthEnd }, ...(await this.lensData.buildLensFilter(userId)) },
        _sum: { amount: true },
      }),
    ]);
    const monthlyIncome = Number(income._sum.amount || 0);
    const monthlyExpense = Number(expense._sum.amount || 0);
    const saved = Math.max(0, monthlyIncome - monthlyExpense);
    return {
      income: monthlyIncome,
      expense: monthlyExpense,
      saved,
      savingsRate: monthlyIncome > 0 ? Math.round((saved / monthlyIncome) * 100) : 0,
    };
  }

  private async getHealthScore(userId: string) {
    const score = await this.prisma.aiScore.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!score) return { score: 0, subScores: [0, 0, 0, 0, 0] };
    return {
      score: score.overallScore,
      subScores: [
        score.savingsRate || 0,
        100 - (score.debtRatio || 0),
        score.budgetDiscipline || 0,
        score.emergencyFund || 0,
        score.goalProgress || 0,
      ],
    };
  }

  private async getAiInsights(userId: string) {
    const insight = await this.prisma.aiInsight.findFirst({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      select: { title: true, description: true, type: true, severity: true, amount: true },
    });
    return insight
      ? { title: insight.title || null, text: insight.description || insight.title }
      : { text: 'Start tracking to get AI insights' };
  }

  private async getGoals(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null, isCompleted: false, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, targetAmount: true, currentAmount: true, type: true, icon: true, color: true },
    });
    return goals.map(g => ({
      id: g.id, name: g.name, targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount), type: g.type, icon: g.icon, color: g.color,
      progress: Number(g.targetAmount) > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0,
    }));
  }

  private async getUpcomingBills(userId: string) {
    const bills = await this.prisma.bill.findMany({
      where: { userId, deletedAt: null, isPaid: false, dueDate: { gte: new Date() }, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: { id: true, name: true, amount: true, dueDate: true, categoryId: true },
    });
    return bills.map(b => ({
      id: b.id, name: b.name, amount: Number(b.amount),
      dueDate: b.dueDate,
      daysRemaining: Math.max(0, Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    }));
  }

  private async getRecentTransactions(userId: string) {
    const txns = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, description: true, amount: true, date: true, type: true, categoryId: true },
    });
    return txns.map(t => ({
      id: t.id, description: t.description, amount: Number(t.amount),
      date: t.date, type: t.type === 'income' ? 'arrowdown' : 'arrowup',
      category: t.categoryId,
    }));
  }

  private async getQuickActions() {
    return [
      { id: 'add_expense', label: 'Add Expense', icon: 'add-circle', route: 'AddExpense', color: '#7C3AED' },
      { id: 'add_income', label: 'Add Income', icon: 'trending-up', route: 'AddExpense?type=income', color: '#22C55E' },
      { id: 'create_goal', label: 'New Goal', icon: 'flag', route: 'GoalsList', color: '#F59E0B' },
      { id: 'pay_bill', label: 'Pay Bill', icon: 'receipt', route: 'BillsList', color: '#EF4444' },
      { id: 'view_reports', label: 'Reports', icon: 'bar-chart', route: 'Reports', color: '#6366F1' },
    ];
  }
}
