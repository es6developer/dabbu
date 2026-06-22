import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { LensDataService } from '../../common/lens/lens-data.service';

@Injectable()
export class FamilyDashboardService {
  private readonly logger = new Logger(FamilyDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly lensData: LensDataService,
  ) {}

  async getWidgets(userId: string, familyId?: string) {
    const cacheKey = `dashboard:family:${userId}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    let fid = familyId;
    if (!fid) {
      const membership = await this.prisma.familyMember.findFirst({
        where: { userId },
        select: { familyId: true },
      });
      if (!membership) {
        return [{ type: 'FAMILY_WEALTH', data: null, state: 'disabled' }];
      }
      fid = membership.familyId;
    }

    const family = await this.prisma.family.findUnique({
      where: { id: fid },
      select: { id: true, name: true, createdAt: true, members: { select: { userId: true, role: true, user: { select: { firstName: true } } } } },
    });
    if (!family) return [{ type: 'FAMILY_WEALTH', data: null, state: 'disabled' }];

    const memberIds = family.members.map(m => m.userId);

    const configs = await this.prisma.dashboardWidget.findMany({
      where: { userId, scope: 'family', enabled: true },
      orderBy: { position: 'asc' },
    });

    const enabledTypes = new Set(
      configs.length > 0
        ? configs.map(c => c.widgetType)
        : ['FAMILY_HERO', 'FAMILY_WEALTH', 'FAMILY_SNAPSHOT', 'FAMILY_CONTRIBUTIONS', 'FAMILY_EXPENSES', 'FAMILY_BILLS', 'FAMILY_GOALS', 'FAMILY_INSIGHTS', 'FAMILY_TIMELINE', 'FAMILY_HEALTH', 'RECENT_TRANSACTIONS', 'AI_INSIGHTS', 'QUICK_ACTIONS'],
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const fetchers: Record<string, () => Promise<any>> = {
      FAMILY_HERO: () => this.getFamilyHero(family),
      FAMILY_WEALTH: () => this.getFamilyWealth(family, memberIds),
      FAMILY_SNAPSHOT: () => this.getFamilySnapshot(memberIds, monthStart, monthEnd, userId),
      FAMILY_CONTRIBUTIONS: () => this.getFamilyContributions(fid!, memberIds),
      FAMILY_INSIGHTS: () => this.getFamilyInsights(fid!),
      FAMILY_GOALS: () => this.getFamilyGoals(fid!),
      FAMILY_BILLS: () => this.getFamilyBills(fid!),
      FAMILY_HEALTH: () => this.getFamilyHealth(memberIds),
      FAMILY_EXPENSES: () => this.getFamilyExpenses(memberIds, monthStart, monthEnd, userId),
      FAMILY_TIMELINE: () => this.getFamilyTimeline(fid!),
      RECENT_TRANSACTIONS: () => this.getCombinedTransactions(memberIds, userId),
      AI_INSIGHTS: () => this.getCombinedAiInsights(memberIds),
      QUICK_ACTIONS: () => this.getQuickActions(),
    };

    const results = await Promise.all(
      [...enabledTypes].map(async (type) => {
        try {
          const data = fetchers[type] ? await fetchers[type]() : null;
          return { type, data, state: 'loaded' as const };
        } catch (err) {
          this.logger.error(`Family widget ${type} failed: ${err}`);
          return { type, data: null, state: 'error' as const };
        }
      }),
    );

    const widgetOrder = [...enabledTypes];
    results.sort((a, b) => widgetOrder.indexOf(a.type) - widgetOrder.indexOf(b.type));

    await this.cache.set(cacheKey, results, 120);
    return results;
  }

  private async getFamilyHero(family: any) {
    return {
      familyName: family.name || 'Family',
      memberCount: family.members?.length || 0,
      familySince: family.createdAt?.toISOString?.()?.split('T')[0] || '',
      members: family.members?.map((m: any) => ({
        name: m.user?.firstName || m.userId?.slice(0, 8) || 'Member',
        role: m.role || 'member',
      })) || [],
    };
  }

  private async getFamilySnapshot(memberIds: string[], monthStart: Date, monthEnd: Date, userId: string) {
    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId: { in: memberIds }, deletedAt: null, type: 'income', date: { gte: monthStart, lte: monthEnd }, ...(await this.lensData.buildLensFilter(userId)) },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId: { in: memberIds }, deletedAt: null, type: 'expense', date: { gte: monthStart, lte: monthEnd }, ...(await this.lensData.buildLensFilter(userId)) },
        _sum: { amount: true },
      }),
    ]);
    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    return {
      income: totalIncome,
      expense: totalExpense,
      saved: Math.max(0, totalIncome - totalExpense),
      savingsRate: totalIncome > 0 ? Math.round((Math.max(0, totalIncome - totalExpense) / totalIncome) * 100) : 0,
      memberCount: memberIds.length,
    };
  }

  private async getFamilyTimeline(familyId: string) {
    const events = await this.prisma.familyCalendarEvent.findMany({
      where: { familyId },
      orderBy: { startDate: 'desc' },
      take: 10,
    });
    return {
      events: events.map(e => ({
        id: e.id,
        title: e.title || e.description || 'Event',
        date: e.startDate,
        type: e.eventType || 'event',
      })),
    };
  }

  private async getQuickActions() {
    return [
      { id: 'add_expense', label: 'Add Expense', icon: 'add-circle', route: 'AddExpense', color: '#7C3AED' },
      { id: 'add_income', label: 'Add Income', icon: 'trending-up', route: 'AddExpense?type=income', color: '#22C55E' },
      { id: 'family_goal', label: 'Family Goal', icon: 'flag', route: 'FamilyGoals', color: '#F59E0B' },
      { id: 'family_contribute', label: 'Contribute', icon: 'rise', route: 'FamilyContributions', color: '#6366F1' },
    ];
  }

  private async getFamilyWealth(family: any, memberIds: string[]) {
    const netWorths = await this.prisma.userNetWorth.findMany({
      where: { userId: { in: memberIds } },
    });
    const combined = netWorths.reduce(
      (acc, nw) => ({
        totalAssets: acc.totalAssets + Number(nw.totalAssets || 0),
        totalLiabilities: acc.totalLiabilities + Number(nw.totalLiabilities || 0),
      }),
      { totalAssets: 0, totalLiabilities: 0 },
    );
    return {
      totalAssets: combined.totalAssets,
      savings: 0,
      investments: 0,
      properties: 0,
      loans: combined.totalLiabilities,
      netWorth: combined.totalAssets - combined.totalLiabilities,
    };
  }

  private async getFamilyContributions(familyId: string, memberIds: string[]) {
    const contributions = await this.prisma.familyContribution.findMany({
      where: { familyId },
      orderBy: { date: 'desc' },
      take: 10,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return contributions.map(c => ({
      name: c.user?.firstName || c.user?.lastName || 'Member',
      amount: Number(c.amount),
    }));
  }

  private async getFamilyInsights(familyId: string) {
    const intelligence = await this.prisma.familyIntelligence.findFirst({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });
    if (!intelligence) {
      return { text: 'Family insights will appear after more activity' };
    }
    return {
      title: 'Family Financial Health',
      text: `Health Score: ${intelligence.healthScore} · Savings Rate: ${intelligence.savingsRate}% · Bill Score: ${intelligence.sharedBillScore}%`,
    };
  }

  private async getFamilyGoals(familyId: string) {
    const goals = await this.prisma.familyGoal.findMany({
      where: { familyId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return goals.map(g => ({
      name: g.name,
      progress: Number(g.targetAmount) > 0 ? Math.round((Number(g.savedAmount || 0) / Number(g.targetAmount)) * 100) : 0,
    }));
  }

  private async getFamilyBills(familyId: string) {
    const bills = await this.prisma.familyBill.findMany({
      where: { familyId, isPaid: false },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
    return bills.map(b => ({
      name: b.name, amount: Number(b.amount),
      daysRemaining: b.dueDate ? Math.max(0, Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 30,
    }));
  }

  private async getFamilyExpenses(memberIds: string[], monthStart: Date, monthEnd: Date, userId: string) {
    const expenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId: { in: memberIds }, deletedAt: null, type: 'expense', date: { gte: monthStart, lte: monthEnd }, ...(await this.lensData.buildLensFilter(userId)) },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });
    const categoryIds = [...new Set(expenses.map(e => e.categoryId).filter(Boolean))];
    const categories = categoryIds.length > 0
      ? await this.prisma.transactionCategory.findMany({
          where: { id: { in: categoryIds as string[] } },
          select: { id: true, name: true },
        })
      : [];
    const catMap = new Map(categories.map(c => [c.id, c.name]));
    return expenses.map(e => ({ category: catMap.get(e.categoryId || '') || 'Other', amount: Number(e._sum?.amount || 0) }));
  }

  private async getCombinedTransactions(memberIds: string[], userId: string) {
    const txns = await this.prisma.transaction.findMany({
      where: { userId: { in: memberIds }, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, description: true, amount: true, date: true, type: true, categoryId: true },
    });
    return txns.map(t => ({
      id: t.id, description: t.description, amount: Number(t.amount),
      date: t.date, type: t.type === 'income' ? 'arrowdown' : 'arrowup',
      category: t.categoryId || null,
    }));
  }

  private async getFamilyHealth(memberIds: string[]) {
    const scores = await this.prisma.aiScore.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      take: memberIds.length,
      distinct: ['userId'],
    });
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.overallScore, 0) / scores.length) : 0;
    const avgSub = (field: string) => scores.length > 0
      ? Math.round(scores.reduce((s, sc) => s + Number((sc as any)[field] || 0), 0) / scores.length)
      : 0;
    return {
      score: avg,
      subScores: [
        avgSub('savingsRate'),
        100 - avgSub('debtRatio'),
        avgSub('goalProgress'),
        avgSub('emergencyFund'),
        avgSub('budgetDiscipline'),
        50,
      ],
    };
  }

  private async getCombinedAiInsights(memberIds: string[]) {
    const insights = await this.prisma.aiInsight.findMany({
      where: { userId: { in: memberIds }, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, description: true, type: true },
    });
    if (insights.length > 0) {
      return { title: insights[0].title || null, text: insights[0].description || insights[0].title };
    }
    return { text: 'Family AI insights will appear as you track together' };
  }
}
