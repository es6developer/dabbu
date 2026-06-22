import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { LensDataService } from '../../common/lens/lens-data.service';

@Injectable()
export class CoupleDashboardService {
  private readonly logger = new Logger(CoupleDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly lensData: LensDataService,
  ) {}

  async getWidgets(userId: string) {
    const cacheKey = `dashboard:couple:${userId}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true, isCoupleMode: true },
    });
    if (!user?.partnerId || !user.isCoupleMode) {
      return [{ type: 'COUPLE_WEALTH', data: null, state: 'disabled' }];
    }

    const configs = await this.prisma.dashboardWidget.findMany({
      where: { userId, scope: 'couple', enabled: true },
      orderBy: { position: 'asc' },
    });

    const enabledTypes = new Set(
      configs.length > 0
        ? configs.map((c) => c.widgetType)
        : [
            'COUPLE_HERO',
            'COUPLE_WEALTH',
            'COUPLE_GOALS',
            'COUPLE_TIMELINE',
            'THIS_MONTH',
            'HEALTH_SCORE',
            'AI_INSIGHTS',
            'UPCOMING_BILLS',
            'RECENT_TRANSACTIONS',
            'QUICK_ACTIONS',
            'SHARED_SAVINGS',
          ],
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const fetchers: Record<string, () => Promise<any>> = {
      COUPLE_HERO: () => this.getCoupleHero(userId, user.partnerId!),
      COUPLE_WEALTH: () => this.getCoupleWealth(userId, user.partnerId!),
      COUPLE_GOALS: () => this.getCoupleGoals(userId),
      COUPLE_TIMELINE: () => this.getCoupleTimeline(userId, user.partnerId!),
      THIS_MONTH: () => this.getCombinedThisMonth([userId, user.partnerId!], monthStart, monthEnd),
      HEALTH_SCORE: () => this.getCombinedHealthScore([userId, user.partnerId!]),
      AI_INSIGHTS: () => this.getCombinedAiInsights([userId, user.partnerId!]),
      UPCOMING_BILLS: () => this.getCombinedBills([userId, user.partnerId!]),
      RECENT_TRANSACTIONS: () => this.getCombinedTransactions([userId, user.partnerId!]),
      QUICK_ACTIONS: () => this.getQuickActions(),
      SHARED_SAVINGS: () => this.getSharedSavings(userId),
    };

    const results = await Promise.all(
      [...enabledTypes].map(async (type: string) => {
        try {
          const data = fetchers[type] ? await fetchers[type]() : null;
          return { type, data, state: 'loaded' as const };
        } catch (err) {
          this.logger.error(`Couple widget ${type} failed: ${err}`);
          return { type, data: null, state: 'error' as const };
        }
      }),
    );

    const widgetOrder = [...enabledTypes];
    results.sort((a, b) => widgetOrder.indexOf(a.type) - widgetOrder.indexOf(b.type));

    await this.cache.set(cacheKey, results, 120);
    return results;
  }

  private async getCoupleHero(userId: string, partnerId: string) {
    const [user, partner] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, avatarUrl: true, maritalStatus: true, partnerLinkedAt: true },
      }),
      this.prisma.user.findUnique({
        where: { id: partnerId },
        select: { firstName: true, lastName: true, avatarUrl: true, maritalStatus: true, partnerLinkedAt: true },
      }),
    ]);
    const profile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { OR: [{ partner1Id: userId }, { partner2Id: userId }] },
    });
    const coupleRecord = await (this.prisma as any).couple.findFirst({
      where: {
        OR: [
          { partner1Id: userId, partner2Id: partnerId },
          { partner1Id: partnerId, partner2Id: userId },
        ],
        status: 'active',
      },
    });
    const linkedAt = user?.partnerLinkedAt || coupleRecord?.linkedAt || profile?.startDate || null;
    return {
      user: {
        id: userId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        avatarUrl: user?.avatarUrl,
      },
      partner: {
        id: partnerId,
        firstName: partner?.firstName,
        lastName: partner?.lastName,
        avatarUrl: partner?.avatarUrl,
      },
      partner1Name: user?.firstName || 'Partner 1',
      partner2Name: partner?.firstName || 'Partner 2',
      togetherSince: linkedAt ? new Date(linkedAt).toISOString().split('T')[0] : '',
      since: linkedAt,
      maritalStatus: user?.maritalStatus || '',
    };
  }

  private async getCoupleWealth(userId: string, partnerId: string) {
    const [userNw, partnerNw] = await Promise.all([
      this.prisma.userNetWorth.findUnique({ where: { userId } }),
      this.prisma.userNetWorth.findUnique({ where: { userId: partnerId } }),
    ]);
    const u = userNw || ({} as any);
    const p = partnerNw || ({} as any);
    const totalCash = Number(u.cash || 0) + Number(p.cash || 0);
    const totalSavings = Number(u.bank || 0) + Number(p.bank || 0);
    const totalInvestments = Number(u.investments || 0) + Number(p.investments || 0);
    const totalProperty = Number(u.property || 0) + Number(p.property || 0);
    const totalOtherAssets = Number(u.otherAssets || 0) + Number(p.otherAssets || 0);
    const totalAssets = totalCash + totalSavings + totalInvestments + totalProperty + totalOtherAssets;
    const totalLiabilities =
      Number(u.homeLoan || 0) + Number(u.personalLoan || 0) + Number(u.creditCardDebt || 0) + Number(u.otherLiabilities || 0)
      + Number(p.homeLoan || 0) + Number(p.personalLoan || 0) + Number(p.creditCardDebt || 0) + Number(p.otherLiabilities || 0);
    const netWorth = totalAssets - totalLiabilities;
    return {
      totalCash,
      totalAssets,
      savings: totalSavings,
      totalSavings,
      investments: totalInvestments,
      totalInvestments: totalInvestments,
      netWorth,
      totalLiabilities,
    };
  }

  private async getCoupleGoals(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null, isCompleted: false, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
        type: true,
        icon: true,
        color: true,
      },
    });
    return goals.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type || 'other',
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.currentAmount),
      progress:
        Number(g.targetAmount) > 0
          ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
          : 0,
    }));
  }

  private async getCoupleTimeline(userId: string, partnerId: string) {
    const profile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { OR: [{ partner1Id: userId }, { partner2Id: userId }] },
    });
    if (!profile) {
      return { events: [], level: 1, xp: 0 };
    }
    const [events, level] = await Promise.all([
      this.prisma.coupleTimelineEvent.findMany({
        where: { groupId: profile.groupId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.coupleLevel.findUnique({ where: { groupId: profile.groupId } }),
    ]);
    const userIds = [userId, partnerId];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.eventType,
        title: e.title,
        description: e.description || undefined,
        amount: e.amount ? Number(e.amount) : undefined,
        date: e.createdAt,
        user: e.userId && userMap.has(e.userId)
          ? { name: `${userMap.get(e.userId)!.firstName || ''} ${userMap.get(e.userId)!.lastName || ''}`.trim() || 'Partner' }
          : undefined,
      })),
      level: level?.level || 1,
      xp: level?.xp || 0,
    };
  }

  private async getCombinedThisMonth(userIds: string[], monthStart: Date, monthEnd: Date) {
    const [u1Income, u2Income, u1Expense, u2Expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId: userIds[0],
          deletedAt: null,
          type: 'income',
          date: { gte: monthStart, lte: monthEnd },
          ...(await this.lensData.buildLensFilter(userIds[0])),
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: userIds[1],
          deletedAt: null,
          type: 'income',
          date: { gte: monthStart, lte: monthEnd },
          ...(await this.lensData.buildLensFilter(userIds[0])),
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: userIds[0],
          deletedAt: null,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd },
          ...(await this.lensData.buildLensFilter(userIds[0])),
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: userIds[1],
          deletedAt: null,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd },
          ...(await this.lensData.buildLensFilter(userIds[0])),
        },
        _sum: { amount: true },
      }),
    ]);
    const userIncome = Number(u1Income._sum.amount || 0);
    const partnerIncome = Number(u2Income._sum.amount || 0);
    const combinedIncome = userIncome + partnerIncome;
    const combinedExpense = Number(u1Expense._sum.amount || 0) + Number(u2Expense._sum.amount || 0);
    const combinedSavings = Math.max(0, combinedIncome - combinedExpense);
    return {
      yourContribution: { amount: userIncome },
      partnerContribution: { amount: partnerIncome },
      combinedIncome,
      combinedExpense,
      combinedSavings,
    };
  }

  private async getCombinedHealthScore(userIds: string[]) {
    const scores = await this.prisma.aiScore.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'desc' },
      take: 2,
      distinct: ['userId'],
    });
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, sc) => s + sc.overallScore, 0) / scores.length)
        : 0;
    const avgSub = (field: string) =>
      scores.length > 0
        ? Math.round(
            scores.reduce((s, sc) => s + Number((sc as any)[field] || 0), 0) / scores.length,
          )
        : 0;
    return {
      overallScore: avgScore,
      score: avgScore,
      categories: {
        savingsAlignment: avgSub('savingsRate'),
        expenseAlignment: avgSub('budgetDiscipline'),
        goalAlignment: avgSub('goalProgress'),
        emergencyFund: avgSub('emergencyFund'),
        debtManagement: 100 - avgSub('debtRatio'),
      },
      compatibilityScore: 0,
      level: 1,
    };
  }

  private async getCombinedAiInsights(userIds: string[]) {
    const insights = await this.prisma.aiInsight.findMany({
      where: { userId: { in: userIds }, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { title: true, description: true },
    });
    if (insights.length > 0) {
      return {
        title: insights[0].title || null,
        text: insights[0].description || insights[0].title,
      };
    }
    return { text: 'Start tracking together to get shared AI insights' };
  }

  private async getCombinedBills(userIds: string[]) {
    const bills = await this.prisma.bill.findMany({
      where: {
        userId: { in: userIds },
        deletedAt: null,
        isPaid: false,
        dueDate: { gte: new Date() },
        ...(await this.lensData.buildLensFilter(userIds[0])),
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: { id: true, name: true, amount: true, dueDate: true },
    });
    return bills.map((b) => ({
      name: b.name,
      amount: Number(b.amount),
      daysRemaining: Math.max(
        0,
        Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      ),
    }));
  }

  private async getCombinedTransactions(userIds: string[]) {
    const txns = await this.prisma.transaction.findMany({
      where: { userId: { in: userIds }, deletedAt: null, ...(await this.lensData.buildLensFilter(userIds[0])) },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        type: true,
        categoryId: true,
      },
    });
    return txns.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      type: t.type === 'income' ? 'arrowdown' : 'arrowup',
      category: t.categoryId,
    }));
  }

  private async getSharedSavings(userId: string) {
    const profile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { OR: [{ partner1Id: userId }, { partner2Id: userId }] },
      select: { groupId: true, savingsGoal: true },
    });
    if (!profile?.groupId) {
      return { current: 0, target: 0, remaining: 0, expectedCompletion: null };
    }
    const records = await this.prisma.coupleFinanceSaving.findMany({
      where: { groupId: profile.groupId },
    });
    const total = records.reduce((s, r) => s + Number(r.amount), 0);
    const target = Number(profile.savingsGoal || 0);
    return {
      current: total,
      target,
      remaining: Math.max(0, target - total),
      expectedCompletion: null,
    };
  }

  private async getQuickActions() {
    return [
      {
        id: 'add_expense',
        label: 'Add Expense',
        icon: 'add-circle',
        route: 'AddExpense',
        color: '#7C3AED',
      },
      {
        id: 'add_income',
        label: 'Add Income',
        icon: 'trending-up',
        route: 'AddExpense?type=income',
        color: '#22C55E',
      },
      {
        id: 'couple_goal',
        label: 'Couple Goal',
        icon: 'flag',
        route: 'CoupleGoals',
        color: '#F59E0B',
      },
      {
        id: 'couple_settle',
        label: 'Settle Up',
        icon: 'swap',
        route: 'Settlements',
        color: '#EF4444',
      },
      {
        id: 'couple_timeline',
        label: 'Timeline',
        icon: 'clockcircleo',
        route: 'CoupleTimeline',
        color: '#6366F1',
      },
    ];
  }
}
