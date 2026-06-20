import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CoupleDashboardService {
  private readonly logger = new Logger(CoupleDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async findCoupleGroupId(
    userId: string,
  ): Promise<{ groupId: string; partnerId: string; coupleId: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, partnerId: true },
    });
    if (!user?.partnerId) {
      return null;
    }

    const couple = await (this.prisma as any).couple.findFirst({
      where: {
        OR: [
          { partner1Id: userId, partner2Id: user.partnerId },
          { partner1Id: user.partnerId, partner2Id: userId },
        ],
        status: 'active',
      },
      select: { id: true },
    });
    if (!couple) {
      return null;
    }

    const profile = await (this.prisma as any).coupleFinanceProfile.findFirst({
      where: {
        OR: [
          { partner1Id: userId, partner2Id: user.partnerId },
          { partner1Id: user.partnerId, partner2Id: userId },
        ],
      },
      select: { groupId: true },
    });

    return { groupId: profile?.groupId || null, partnerId: user.partnerId, coupleId: couple.id };
  }

  async getDashboard(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { groupId, partnerId, coupleId } = coupleInfo;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      user,
      partner,
      userTxns,
      partnerTxns,
      profile,
      goals,
      expenses,
      incomes,
      savingsRecords,
      userHealth,
      partnerHealth,
      coupleInsights,
      userNetWorth,
      partnerNetWorth,
      timelineEvents,
      bills,
      planners,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isCoupleMode: true,
          partnerLinkedAt: true,
          maritalStatus: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: partnerId },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, maritalStatus: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId: partnerId, deletedAt: null, date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      groupId
        ? (this.prisma as any).coupleFinanceProfile.findUnique({ where: { groupId } })
        : Promise.resolve(null),
      groupId
        ? this.prisma.sharedGoal.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      groupId
        ? this.prisma.sharedExpense.findMany({
            where: { groupId, date: { gte: monthStart, lte: monthEnd } },
            orderBy: { date: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
      groupId
        ? this.prisma.coupleFinanceIncome.findMany({
            where: { groupId, date: { gte: monthStart, lte: monthEnd } },
            orderBy: { date: 'desc' },
          })
        : Promise.resolve([]),
      groupId
        ? this.prisma.coupleFinanceSaving.findMany({
            where: { groupId, date: { gte: monthStart, lte: monthEnd } },
            orderBy: { date: 'desc' },
          })
        : Promise.resolve([]),
      this.prisma.aiScore.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiScore.findFirst({
        where: { userId: partnerId },
        orderBy: { createdAt: 'desc' },
      }),
      groupId
        ? (this.prisma as any).coupleIntelligence.findFirst({
            where: { coupleProfileId: groupId },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve(null),
      this.prisma.userNetWorth.findUnique({ where: { userId } }),
      this.prisma.userNetWorth.findUnique({ where: { userId: partnerId } }),
      groupId
        ? (this.prisma as any).coupleTimelineEvent.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      groupId
        ? this.prisma.bill.findMany({
            where: { OR: [{ userId }, { userId: partnerId }], isPaid: false },
            orderBy: { dueDate: 'asc' },
            take: 10,
          })
        : Promise.resolve([]),
      groupId
        ? (this.prisma as any).couplePlanner.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const sharedIncome = (incomes as any[]).reduce((s: number, i: any) => s + Number(i.amount), 0);
    const sharedExpense = (expenses as any[]).reduce(
      (s: number, e: any) => s + Number(e.amount),
      0,
    );
    const sharedSavingsAmt = (savingsRecords as any[]).reduce(
      (s: number, sa: any) => s + Number(sa.amount),
      0,
    );

    const daysTogether = user?.partnerLinkedAt
      ? Math.floor(
          (now.getTime() - new Date(user.partnerLinkedAt).getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    const userIncome = Number(
      (
        await this.prisma.transaction.aggregate({
          where: {
            userId,
            deletedAt: null,
            type: 'income',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        })
      )._sum.amount || 0,
    );
    const partnerIncome = Number(
      (
        await this.prisma.transaction.aggregate({
          where: {
            userId: partnerId,
            deletedAt: null,
            type: 'income',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        })
      )._sum.amount || 0,
    );
    const userExpense = Number(
      (
        await this.prisma.transaction.aggregate({
          where: {
            userId,
            deletedAt: null,
            type: 'expense',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        })
      )._sum.amount || 0,
    );
    const partnerExpense = Number(
      (
        await this.prisma.transaction.aggregate({
          where: {
            userId: partnerId,
            deletedAt: null,
            type: 'expense',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        })
      )._sum.amount || 0,
    );

    const combinedIncome = userIncome + partnerIncome + sharedIncome;
    const combinedExpense = userExpense + partnerExpense + sharedExpense;
    const totalSavings = Math.max(0, combinedIncome - combinedExpense) + sharedSavingsAmt;

    const wealthUser = userNetWorth || ({} as any);
    const wealthPartner = partnerNetWorth || ({} as any);
    const totalCash = Number(wealthUser.cash || 0) + Number(wealthPartner.cash || 0);
    const totalBankSavings = Number(wealthUser.bank || 0) + Number(wealthPartner.bank || 0);
    const totalInvestmentsAmt =
      Number(wealthUser.investments || 0) + Number(wealthPartner.investments || 0);
    const totalAssets =
      Number(wealthUser.totalAssets || 0) + Number(wealthPartner.totalAssets || 0);
    const totalLiabilities =
      Number(wealthUser.totalLiabilities || 0) + Number(wealthPartner.totalLiabilities || 0);

    return {
      coupleHero: {
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
        since: user?.partnerLinkedAt,
        daysTogether,
        maritalStatus: user?.maritalStatus || '',
      },
      combinedWealth: {
        totalCash,
        totalSavings: totalBankSavings,
        totalInvestments: totalInvestmentsAmt,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      },
      coupleSnapshot: {
        userContribution: userIncome,
        partnerContribution: partnerIncome,
        combinedIncome,
        combinedExpense,
        savings: totalSavings,
      },
      sharedSavings: {
        current: profile?.savingsGoal ? Number(profile.savingsGoal) : 0,
        target: sharedSavingsAmt,
        remaining: Math.max(
          0,
          (profile?.savingsGoal ? Number(profile.savingsGoal) : 0) - sharedSavingsAmt,
        ),
        expectedCompletion: null,
      },
      coupleHealth: {
        overallScore: userHealth?.overallScore || partnerHealth?.overallScore || 0,
        compatibilityScore: coupleInsights?.compatibilityScore
          ? Number(coupleInsights.compatibilityScore)
          : Math.round(
              (userHealth?.overallScore || 0) * 0.4 + (partnerHealth?.overallScore || 0) * 0.4 + 20,
            ),
        categories: {
          savingsAlignment: userHealth
            ? Math.round((userHealth.savingsRate + (partnerHealth?.savingsRate || 0)) / 2)
            : 0,
          expenseAlignment: userHealth
            ? Math.round((userHealth.budgetDiscipline + (partnerHealth?.budgetDiscipline || 0)) / 2)
            : 0,
          goalAlignment: userHealth
            ? Math.round((userHealth.goalProgress + (partnerHealth?.goalProgress || 0)) / 2)
            : 0,
          emergencyFund: userHealth
            ? Math.round((userHealth.emergencyFund + (partnerHealth?.emergencyFund || 0)) / 2)
            : 0,
          debtManagement: userHealth
            ? 100 - Math.round(((userHealth.debtRatio || 0) + (partnerHealth?.debtRatio || 0)) / 2)
            : 0,
        },
      },
      sharedExpenses: {
        categories: (expenses as any[]).reduce<{ category: string; amount: number }[]>(
          (acc, e: any) => {
            const cat = e.category || 'Other';
            const existing = acc.find((c) => c.category === cat);
            if (existing) {
              existing.amount += Number(e.amount);
            } else {
              acc.push({ category: cat, amount: Number(e.amount) });
            }
            return acc;
          },
          [],
        ),
        total: sharedExpense,
        byCategory: (expenses as any[]).reduce<Record<string, number>>(
          (acc: Record<string, number>, e: any) => {
            const cat = e.category || 'Other';
            acc[cat] = (acc[cat] || 0) + Number(e.amount);
            return acc;
          },
          {},
        ),
      },
      upcomingBills: (bills as any[]).map((b: any) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        category: b.category,
      })),
      coupleAI: {
        insights: coupleInsights?.insights || [],
      },
      coupleGoals: (goals as any[]).map((g: any) => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        savedAmount: Number(g.savedAmount || 0),
        progress:
          Number(g.targetAmount) > 0
            ? Math.round((Number(g.savedAmount || 0) / Number(g.targetAmount)) * 100)
            : 0,
        category: g.category,
        deadline: g.deadline,
      })),
      coupleTimeline: (timelineEvents as any[]).map((e: any) => ({
        id: e.id,
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        amount: e.amount ? Number(e.amount) : null,
        icon: e.icon,
        user: e.user
          ? {
              id: e.user.id,
              name: e.user.firstName || e.user.lastName,
              avatarUrl: e.user.avatarUrl,
            }
          : null,
        createdAt: e.createdAt,
      })),
      lifePlans: (planners as any[]).map((p: any) => ({
        id: p.id,
        plannerType: p.plannerType,
        targetAmount: Number(p.targetAmount || 0),
        currentSavings: Number(p.currentSavings || 0),
        timeline: p.timeline,
        progress:
          Number(p.targetAmount || 0) > 0
            ? Math.round((Number(p.currentSavings || 0) / Number(p.targetAmount || 0)) * 100)
            : 0,
      })),
    };
  }

  async getCombinedWealth(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { partnerId } = coupleInfo;
    const [userNetWorth, partnerNetWorth, netWorthSnapshots] = await Promise.all([
      this.prisma.userNetWorth.findUnique({ where: { userId } }),
      this.prisma.userNetWorth.findUnique({ where: { userId: partnerId } }),
      this.prisma.netWorthSnapshot.findMany({
        where: { userId: { in: [userId, partnerId] } },
        orderBy: { snapshotDate: 'asc' },
        take: 12,
      }),
    ]);

    const totalAssets =
      Number(userNetWorth?.totalAssets || 0) + Number(partnerNetWorth?.totalAssets || 0);
    const totalLiabilities =
      Number(userNetWorth?.totalLiabilities || 0) + Number(partnerNetWorth?.totalLiabilities || 0);

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      members: [
        {
          userId,
          totalAssets: Number(userNetWorth?.totalAssets || 0),
          totalLiabilities: Number(userNetWorth?.totalLiabilities || 0),
        },
        {
          userId: partnerId,
          totalAssets: Number(partnerNetWorth?.totalAssets || 0),
          totalLiabilities: Number(partnerNetWorth?.totalLiabilities || 0),
        },
      ],
      trend: netWorthSnapshots.reduce<Record<string, { date: Date; netWorth: number }[]>>(
        (acc, s) => {
          const key = s.userId;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push({ date: s.snapshotDate, netWorth: Number(s.netWorth || 0) });
          return acc;
        },
        {},
      ),
    };
  }

  async getSnapshot(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { groupId, partnerId } = coupleInfo;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthIncome, thisMonthExpenses, lastMonthIncome, lastMonthExpenses, budgets] =
      await Promise.all([
        groupId
          ? this.prisma.coupleFinanceIncome.aggregate({
              where: { groupId, date: { gte: monthStart, lte: monthEnd } },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null as any } }),
        groupId
          ? this.prisma.sharedExpense.aggregate({
              where: { groupId, date: { gte: monthStart, lte: monthEnd } },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null as any } }),
        groupId
          ? this.prisma.coupleFinanceIncome.aggregate({
              where: { groupId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null as any } }),
        groupId
          ? this.prisma.sharedExpense.aggregate({
              where: { groupId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null as any } }),
        groupId
          ? this.prisma.coupleBudgetCategory.findMany({ where: { groupId } })
          : Promise.resolve([]),
      ]);

    const income = Number(thisMonthIncome._sum.amount || 0);
    const expense = Number(thisMonthExpenses._sum.amount || 0);
    const prevIncome = Number(lastMonthIncome._sum.amount || 0);
    const prevExpense = Number(lastMonthExpenses._sum.amount || 0);
    const incomeChange =
      prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : 0;
    const expenseChange =
      prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : 0;

    return {
      period: { start: monthStart, end: monthEnd },
      income: { value: income, change: incomeChange },
      expense: { value: expense, change: expenseChange },
      savings: {
        value: Math.max(0, income - expense),
        rate: income > 0 ? Math.round((Math.max(0, income - expense) / income) * 100) : 0,
      },
      budgetCategories: budgets.map((b) => ({
        id: b.id,
        category: b.category,
        budgetAmount: Number(b.budgetAmount),
        spentAmount: Number(b.spentAmount),
        period: b.period,
      })),
    };
  }

  async getSharedSavings(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { groupId } = coupleInfo;
    if (!groupId) {
      return { savings: [], total: 0 };
    }

    const savings = await this.prisma.coupleFinanceSaving.findMany({
      where: { groupId },
      include: { contributor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });

    const total = (savings as any[]).reduce((s: number, sa: any) => s + Number(sa.amount), 0);
    return {
      savings: savings.map((s: any) => ({
        id: s.id,
        amount: Number(s.amount),
        date: s.date,
        notes: s.notes,
        contributedBy: {
          id: s.contributor.id,
          name: s.contributor.firstName || s.contributor.lastName,
        },
      })),
      total,
      byMember: (savings as any[]).reduce<Record<string, number>>(
        (acc: Record<string, number>, s: any) => {
          const name = s.contributor.firstName || s.contributor.lastName || 'Unknown';
          acc[name] = (acc[name] || 0) + Number(s.amount);
          return acc;
        },
        {},
      ),
    };
  }

  async getSharedExpenses(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { groupId } = coupleInfo;
    if (!groupId) {
      return { expenses: [], total: 0 };
    }

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: {
        payer: { select: { id: true, firstName: true, lastName: true } },
        splits: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    const total = (expenses as any[]).reduce((s: number, e: any) => s + Number(e.amount), 0);
    return {
      expenses: expenses.map((e: any) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        category: e.category,
        date: e.date,
        splitType: e.splitType,
        currency: e.currency,
        paidBy: { id: e.payer.id, name: e.payer.firstName || e.payer.lastName },
        splits: e.splits.map((sp: any) => ({
          userId: sp.userId,
          name: sp.user.firstName || sp.user.lastName,
          amount: Number(sp.amount),
          isPaid: sp.isPaid,
        })),
      })),
      total,
      byCategory: (expenses as any[]).reduce<Record<string, number>>(
        (acc: Record<string, number>, e: any) => {
          const cat = e.category || 'Other';
          acc[cat] = (acc[cat] || 0) + Number(e.amount);
          return acc;
        },
        {},
      ),
    };
  }

  async getGoals(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { groupId } = coupleInfo;
    if (!groupId) {
      return [];
    }

    const goals = await this.prisma.sharedGoal.findMany({
      where: { groupId },
      include: {
        contributions: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount || 0),
      progress:
        Number(g.targetAmount) > 0
          ? Math.round((Number(g.savedAmount || 0) / Number(g.targetAmount)) * 100)
          : 0,
      category: g.category,
      deadline: g.deadline,
      createdBy: g.createdBy,
      contributions: g.contributions.map((c) => ({
        userId: c.userId,
        name: c.user.firstName || c.user.email,
        amount: Number(c.amount),
        date: c.date,
      })),
    }));
  }

  async getTimeline(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }

    const { groupId } = coupleInfo;
    if (!groupId) {
      return [];
    }

    const events = await (this.prisma as any).coupleTimelineEvent.findMany({
      where: { groupId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return (events as any[]).map((e) => ({
      id: e.id,
      eventType: e.eventType,
      title: e.title,
      description: e.description,
      amount: e.amount ? Number(e.amount) : null,
      icon: e.icon,
      user: e.user
        ? { id: e.user.id, name: e.user.firstName || e.user.lastName, avatarUrl: e.user.avatarUrl }
        : null,
      createdAt: e.createdAt,
    }));
  }

  async getWealth(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }
    const { partnerId } = coupleInfo;
    const [uNw, pNw, snapshots] = await Promise.all([
      this.prisma.userNetWorth.findUnique({ where: { userId } }),
      this.prisma.userNetWorth.findUnique({ where: { userId: partnerId } }),
      this.prisma.netWorthSnapshot.findMany({
        where: { userId: { in: [userId, partnerId] } },
        orderBy: { snapshotDate: 'asc' },
        take: 24,
      }),
    ]);
    const u = uNw || ({} as any);
    const p = pNw || ({} as any);
    const cash = Number(u.cash || 0) + Number(p.cash || 0);
    const savings = Number(u.bank || 0) + Number(p.bank || 0);
    const investments = Number(u.investments || 0) + Number(p.investments || 0);
    const assets =
      Number(u.property || 0) +
      Number(p.property || 0) +
      Number(u.otherAssets || 0) +
      Number(p.otherAssets || 0);
    const loans =
      Number(u.homeLoan || 0) +
      Number(u.personalLoan || 0) +
      Number(u.creditCardDebt || 0) +
      Number(u.otherLiabilities || 0) +
      Number(p.homeLoan || 0) +
      Number(p.personalLoan || 0) +
      Number(p.creditCardDebt || 0) +
      Number(p.otherLiabilities || 0);
    const netWorth = cash + savings + investments + assets - loans;

    const trend: { date: string; netWorth: number }[] = [];
    const monthlyMap = new Map<string, number>();
    for (const s of snapshots) {
      const key = s.snapshotDate.toISOString().slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(s.netWorth || 0));
    }
    for (const [date, nw] of monthlyMap) {
      trend.push({ date, netWorth: nw });
    }
    trend.sort((a, b) => a.date.localeCompare(b.date));

    return { cash, savings, investments, assets, loans, netWorth, trend };
  }

  async getHealthScore(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }
    const { groupId, partnerId } = coupleInfo;

    const [userScore, partnerScore, coupleLevel, coupleIntelligence] = await Promise.all([
      this.prisma.aiScore.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiScore.findFirst({
        where: { userId: partnerId },
        orderBy: { createdAt: 'desc' },
      }),
      groupId
        ? (this.prisma as any).coupleLevel.findUnique({ where: { groupId } })
        : Promise.resolve(null),
      groupId
        ? (this.prisma as any).coupleIntelligence.findFirst({ where: { coupleProfileId: groupId } })
        : Promise.resolve(null),
    ]);

    const userHealthScore = userScore?.overallScore || 0;
    const partnerHealthScore = partnerScore?.overallScore || 0;
    const financialCompatibility = coupleIntelligence?.compatibilityScore
      ? Number(coupleIntelligence.compatibilityScore)
      : Math.round((userHealthScore + partnerHealthScore) / 2);

    const avgSavings = Math.round(
      ((userScore?.savingsRate || 0) + (partnerScore?.savingsRate || 0)) / 2,
    );
    const avgEmergency = Math.round(
      ((userScore?.emergencyFund || 0) + (partnerScore?.emergencyFund || 0)) / 2,
    );
    const avgDebt = Math.round(
      100 - ((userScore?.debtRatio || 0) + (partnerScore?.debtRatio || 0)) / 2,
    );

    const emergencyReadinessScore = Math.round(
      avgEmergency * 0.6 + avgSavings * 0.2 + avgDebt * 0.2,
    );

    const monthlyRelationshipScore = Math.round(
      financialCompatibility * 0.3 +
        avgSavings * 0.2 +
        avgEmergency * 0.2 +
        avgDebt * 0.15 +
        (coupleLevel?.level || 1) * 5,
    );

    return {
      overallScore: Math.round((userHealthScore + partnerHealthScore) / 2),
      financialCompatibility,
      monthlyRelationshipScore,
      emergencyReadinessScore,
      level: coupleLevel?.level || 1,
      xp: coupleLevel?.xp || 0,
      categories: {
        savingsAlignment: avgSavings,
        emergencyFund: avgEmergency,
        debtManagement: avgDebt,
        goalAlignment: userScore
          ? Math.round((userScore.goalProgress + (partnerScore?.goalProgress || 0)) / 2)
          : 0,
      },
      members: [
        { userId, overallScore: userHealthScore, financialLevel: userScore?.financialLevel },
        {
          userId: partnerId,
          overallScore: partnerHealthScore,
          financialLevel: partnerScore?.financialLevel,
        },
      ],
    };
  }

  async getLifePlans(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }
    const { groupId } = coupleInfo;
    if (!groupId) {
      return [];
    }

    const planners = await (this.prisma as any).couplePlanner.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });

    return (planners as any[]).map((p: any) => {
      const target = Number(p.targetAmount || 0);
      const current = Number(p.currentSavings || 0);
      const progress = target > 0 ? Math.round((current / target) * 100) : 0;
      const monthlyReq = p.timeline ? Math.round((target - current) / Math.max(1, p.timeline)) : 0;

      return {
        id: p.id,
        plannerType: p.plannerType,
        targetAmount: target,
        currentSavings: current,
        progress,
        timeline: p.timeline,
        monthlyRequirement: monthlyReq,
        targetDate: p.targetDate,
        status: p.status || 'active',
        aiAdvice: p.aiAdvice || null,
        details: p.details || {},
      };
    });
  }

  async createGoal(userId: string, body: any) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }
    const { groupId } = coupleInfo;
    return this.prisma.sharedGoal.create({
      data: {
        groupId: groupId!,
        name: body.name,
        targetAmount: body.targetAmount,
        savedAmount: body.savedAmount || 0,
        deadline: body.deadline ? new Date(body.deadline) : null,
        category: body.category || 'savings',
        createdBy: userId,
      },
    });
  }

  async updateGoal(userId: string, id: string, body: any) {
    const goal = await this.prisma.sharedGoal.findUnique({ where: { id } });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return this.prisma.sharedGoal.update({
      where: { id },
      data: {
        name: body.name ?? goal.name,
        targetAmount: body.targetAmount ?? goal.targetAmount,
        savedAmount: body.savedAmount ?? goal.savedAmount,
        deadline: body.deadline ? new Date(body.deadline) : goal.deadline,
        category: body.category ?? goal.category,
      },
    });
  }

  async deleteGoal(userId: string, id: string) {
    const goal = await this.prisma.sharedGoal.findUnique({ where: { id } });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    await this.prisma.sharedGoal.delete({ where: { id } });
    return { message: 'Goal deleted' };
  }

  async addTimelineEvent(userId: string, body: any) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }
    const { groupId } = coupleInfo;
    return (this.prisma as any).coupleTimelineEvent.create({
      data: {
        groupId,
        userId,
        eventType: body.eventType || 'custom',
        title: body.title,
        description: body.description,
        amount: body.amount,
        icon: body.icon,
      },
    });
  }

  async updatePlanner(userId: string, id: string, body: any) {
    const planner = await (this.prisma as any).couplePlanner.findUnique({ where: { id } });
    if (!planner) {
      throw new NotFoundException('Planner not found');
    }
    return (this.prisma as any).couplePlanner.update({
      where: { id },
      data: {
        targetAmount: body.targetAmount ?? planner.targetAmount,
        currentSavings: body.currentSavings ?? planner.currentSavings,
        monthlyTarget: body.monthlyTarget ?? planner.monthlyTarget,
        deadline: body.deadline ? new Date(body.deadline) : planner.deadline,
        status: body.status ?? planner.status,
      },
    });
  }

  async deletePlanner(userId: string, id: string) {
    const planner = await (this.prisma as any).couplePlanner.findUnique({ where: { id } });
    if (!planner) {
      throw new NotFoundException('Planner not found');
    }
    await (this.prisma as any).couplePlanner.delete({ where: { id } });
    return { message: 'Planner deleted' };
  }

  async getAIReview(userId: string) {
    const coupleInfo = await this.findCoupleGroupId(userId);
    if (!coupleInfo) {
      throw new NotFoundException('Couple not found');
    }
    const { groupId, partnerId } = coupleInfo;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthTxns, lastMonthTxns, thisMonthShared, goals, planners, coupleIntelligence] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            userId: { in: [userId, partnerId] },
            date: { gte: monthStart, lte: monthEnd },
            deletedAt: null,
          },
        }),
        this.prisma.transaction.findMany({
          where: {
            userId: { in: [userId, partnerId] },
            date: { gte: lastMonthStart, lte: lastMonthEnd },
            deletedAt: null,
          },
        }),
        groupId
          ? this.prisma.sharedExpense.aggregate({
              where: { groupId, date: { gte: monthStart, lte: monthEnd } },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null } }),
        groupId ? this.prisma.sharedGoal.findMany({ where: { groupId } }) : Promise.resolve([]),
        groupId
          ? (this.prisma as any).couplePlanner.findMany({ where: { groupId } })
          : Promise.resolve([]),
        groupId
          ? (this.prisma as any).coupleIntelligence.findFirst({
              where: { coupleProfileId: groupId },
            })
          : Promise.resolve(null),
      ]);

    const thisIncome = thisMonthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const thisExpense = thisMonthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const lastIncome = lastMonthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const lastExpense = lastMonthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const sharedExpenseAmt = Number((thisMonthShared as any)._sum?.amount || 0);
    const savings = Math.max(0, thisIncome + lastIncome - thisExpense - lastExpense);
    const savingsRate =
      thisIncome + lastIncome > 0 ? Math.round((savings / (thisIncome + lastIncome)) * 100) : 0;
    const expenseChange =
      lastExpense > 0 ? Math.round(((thisExpense - lastExpense) / lastExpense) * 100) : 0;

    const activeGoals = (goals as any[]).filter((g) => g.status === 'active');
    const completedGoals = (goals as any[]).filter((g) => g.status === 'completed');
    const topCategory = (coupleIntelligence as any)?.topSpendingCategory || null;

    return {
      period: { start: lastMonthStart, end: monthEnd },
      summary: {
        income: thisIncome + lastIncome,
        expenses: thisExpense + lastExpense + sharedExpenseAmt,
        savings,
        savingsRate,
        expenseChange,
      },
      goals: {
        active: activeGoals.length,
        completed: completedGoals.length,
        onTrack: activeGoals.filter((g: any) => {
          if (!g.deadline) {
            return true;
          }
          const pct = Number(g.savedAmount || 0) / Number(g.targetAmount || 1);
          const elapsed =
            (now.getTime() - new Date(g.createdAt).getTime()) /
            (new Date(g.deadline).getTime() - new Date(g.createdAt).getTime());
          return pct >= elapsed;
        }).length,
      },
      lifePlans: (planners as any[]).map((p: any) => ({
        type: p.plannerType,
        progress:
          Number(p.targetAmount || 0) > 0
            ? Math.round((Number(p.currentSavings || 0) / Number(p.targetAmount || 0)) * 100)
            : 0,
      })),
      insights: coupleIntelligence?.insights || [],
      alerts: [],
      recommendations: [],
    };
  }
}
