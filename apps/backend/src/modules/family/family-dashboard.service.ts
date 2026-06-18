import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FamilyDashboardService {
  private readonly logger = new Logger(FamilyDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, familyId?: string) {
    const families = familyId
      ? await this.prisma.family.findMany({ where: { id: familyId, isActive: true } })
      : await this.prisma.family.findMany({
          where: { members: { some: { userId } }, isActive: true },
        });

    if (!families.length) {
      return this.getEmptyDashboard();
    }

    const family = families[0];
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: family.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    const memberIds = members.map((m) => m.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      incomeAgg,
      expenseAgg,
      goals,
      bills,
      healthScores,
      contributions,
      investments,
      netWorths,
      familyInsights,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          type: 'income',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.familyGoal.findMany({
        where: { familyId: family.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.familyBill.findMany({
        where: { familyId: family.id },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.familyHealthScore.findMany({
        where: { familyId: family.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
      this.prisma.familyContribution.findMany({
        where: { familyId: family.id },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      this.prisma.familyInvestment.findMany({
        where: { familyId: family.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userNetWorth.findMany({
        where: { userId: { in: memberIds } },
      }),
      this.prisma.familyIntelligence.findFirst({
        where: { familyId: family.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpense = Number(expenseAgg._sum.amount || 0);
    const savings = Math.max(0, totalIncome - totalExpense);
    const budgetUtilization = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

    const totalAssets = netWorths.reduce((s, r) => s + Number(r.totalAssets || 0), 0);
    const totalLiabilities = netWorths.reduce((s, r) => s + Number(r.totalLiabilities || 0), 0);

    const totalSavings = netWorths.reduce(
      (s, r) => s + Number(r.bank || 0) + Number(r.cash || 0),
      0,
    );
    const totalInvestmentsAmt = investments.reduce((s, i) => s + Number(i.currentValue || 0), 0);
    const totalProperties = netWorths.reduce((s, r) => s + Number(r.property || 0), 0);
    const totalLoans = netWorths.reduce(
      (s, r) =>
        s +
        Number(r.homeLoan || 0) +
        Number(r.personalLoan || 0) +
        Number(r.creditCardDebt || 0) +
        Number(r.otherLiabilities || 0),
      0,
    );

    const totalContributions = contributions.reduce((s, c) => s + Number(c.amount), 0);

    const byMember: Record<string, number> = {};
    for (const c of contributions) {
      const key = c.userId;
      byMember[key] = (byMember[key] || 0) + Number(c.amount);
    }

    const contributionMembers = contributions.reduce<
      Record<string, { name: string; total: number }>
    >((acc, c) => {
      const key = c.userId;
      if (!acc[key]) {
        acc[key] = { name: c.user.firstName || c.user.lastName, total: 0 };
      }
      acc[key].total += Number(c.amount);
      return acc;
    }, {});

    const unpaidBills = bills.filter((b) => !b.isPaid);
    const paidBills = bills.filter((b) => b.isPaid);

    const latestHealth = healthScores[0];

    const timeline = await this.prisma.familyCalendarEvent.findMany({
      where: { familyId: family.id },
      orderBy: { startDate: 'desc' },
      take: 10,
      select: { id: true, title: true, eventType: true, startDate: true, description: true },
    });

    const insights: string[] = familyInsights?.insights
      ? (familyInsights.insights as string[])
      : [];

    return {
      familyHero: {
        familyName: family.name,
        memberCount: members.length,
        members: members.map((m) => ({
          id: m.user.id,
          name: m.user.firstName || m.user.email,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
        })),
        createdAt: family.createdAt,
      },
      familyWealth: {
        totalAssets,
        totalSavings,
        totalInvestments: totalInvestmentsAmt,
        totalProperties,
        totalLoans,
        netWorth: totalAssets - totalLiabilities,
      },
      familySnapshot: {
        income: totalIncome,
        expense: totalExpense,
        savings,
        budgetUtilization,
      },
      familyContributions: {
        contributions: contributions.map((c) => ({
          id: c.id,
          userId: c.userId,
          name: c.user.firstName || c.user.lastName,
          amount: Number(c.amount),
          period: c.period,
          date: c.date,
        })),
        total: totalContributions,
        byMember: contributionMembers,
      },
      familyExpenses: {
        categories: [],
        total: totalExpense,
        monthlyComparison: [],
      },
      familyBills: {
        upcoming: unpaidBills.map((b) => ({
          id: b.id,
          name: b.name,
          amount: Number(b.amount),
          dueDate: b.dueDate,
          category: b.category,
        })),
        paid: paidBills.map((b) => ({
          id: b.id,
          name: b.name,
          amount: Number(b.amount),
          paidAt: b.paidAt,
          category: b.category,
        })),
        total: bills.length,
      },
      familyGoals: goals.map((g) => ({
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
        status: g.status,
      })),
      familyInsights:
        insights.length > 0 ? insights : ['Track family finances to see insights here'],
      familyTimeline: timeline.map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.eventType,
        date: e.startDate,
        description: e.description,
      })),
      familyHealth: latestHealth
        ? {
            overallScore: latestHealth.overallScore,
            categoryScores: {
              savings: latestHealth.savingsScore,
              debt: latestHealth.debtScore,
              goals: latestHealth.goalsScore,
              insurance: latestHealth.insuranceScore,
              emergencyFund: latestHealth.emergencyFundScore,
              investmentRatio: latestHealth.investmentRatioScore,
            },
          }
        : {
            overallScore: 0,
            categoryScores: {
              savings: 0,
              debt: 0,
              goals: 0,
              insurance: 0,
              emergencyFund: 0,
              investmentRatio: 0,
            },
          },
    };
  }

  private getEmptyDashboard() {
    return {
      familyHero: { familyName: '', memberCount: 0, members: [], createdAt: null },
      familyWealth: {
        totalAssets: 0,
        totalSavings: 0,
        totalInvestments: 0,
        totalProperties: 0,
        totalLoans: 0,
        netWorth: 0,
      },
      familySnapshot: { income: 0, expense: 0, savings: 0, budgetUtilization: 0 },
      familyContributions: { contributions: [], total: 0, byMember: {} },
      familyExpenses: { categories: [], total: 0, monthlyComparison: [] },
      familyBills: { upcoming: [], paid: [], total: 0 },
      familyGoals: [],
      familyInsights: ['Create a family to get started'],
      familyTimeline: [],
      familyHealth: {
        overallScore: 0,
        categoryScores: {
          savings: 0,
          debt: 0,
          goals: 0,
          insurance: 0,
          emergencyFund: 0,
          investmentRatio: 0,
        },
      },
    };
  }

  async getHealthScore(familyId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    const scores = await this.prisma.aiScore.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      take: memberIds.length,
    });
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, sc) => s + (sc.overallScore || 0), 0) / scores.length)
        : 0;
    return { overallScore: avgScore, memberScores: scores };
  }

  async getNetWorth(familyId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });
    const netWorths = await this.prisma.userNetWorth.findMany({
      where: { userId: { in: members.map((m) => m.userId) } },
    });
    const totalAssets = netWorths.reduce((s, n) => s + Number(n.totalAssets || 0), 0);
    const totalLiabilities = netWorths.reduce((s, n) => s + Number(n.totalLiabilities || 0), 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  }

  async getCalendar(familyId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [bills, goals, loans] = await Promise.all([
      this.prisma.bill.findMany({
        where: { userId: { in: memberIds }, dueDate: { gte: monthStart, lte: monthEnd } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.goal.findMany({
        where: { userId: { in: memberIds }, deadline: { gte: monthStart, lte: monthEnd } },
        orderBy: { deadline: 'asc' },
      }),
      this.prisma.userLoan.findMany({
        where: { userId: { in: memberIds } },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    const rawEvents: { date: Date | null; title: string; type: string; amount: number }[] = [
      ...bills.map((b) => ({
        date: b.dueDate,
        title: b.name,
        type: 'bill' as const,
        amount: Number(b.amount),
      })),
      ...goals.map((g) => ({
        date: g.deadline,
        title: `${g.name} Goal`,
        type: 'goal' as const,
        amount: Number(g.targetAmount),
      })),
      ...loans.map((l) => ({
        date: l.startDate,
        title: `${l.type} EMI`,
        type: 'loan' as const,
        amount: Number(l.monthlyEmi),
      })),
    ];

    return {
      events: rawEvents
        .filter((e): e is typeof e & { date: Date } => !!e.date)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    };
  }

  async getInsights(familyId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthTxns, lastMonthTxns, goals, bills] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId: { in: memberIds }, date: { gte: monthStart } },
      }),
      this.prisma.transaction.findMany({
        where: { userId: { in: memberIds }, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      this.prisma.familyGoal.findMany({ where: { familyId, status: 'active' } }),
      this.prisma.familyBill.findMany({ where: { familyId, isPaid: false } }),
    ]);

    const thisMonthExpense = thisMonthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const lastMonthExpense = lastMonthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenseChange =
      lastMonthExpense > 0
        ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100)
        : 0;

    const insights: string[] = [];
    if (expenseChange > 10) {
      insights.push(
        `Family spending increased ${expenseChange}% this month. Consider reviewing non-essential expenses.`,
      );
    } else if (expenseChange < -10) {
      insights.push(`Great job! Family spending decreased ${Math.abs(expenseChange)}% this month.`);
    } else {
      insights.push('Family spending is stable compared to last month.');
    }

    const activeGoals = goals.filter((g) => g.status === 'active');
    if (activeGoals.length > 0) {
      const onTrack = activeGoals.filter((g) => {
        if (!g.deadline) {
          return true;
        }
        const progress =
          Number(g.targetAmount) > 0 ? Number(g.savedAmount) / Number(g.targetAmount) : 0;
        const timeElapsed =
          (now.getTime() - new Date(g.createdAt).getTime()) /
          (new Date(g.deadline).getTime() - new Date(g.createdAt).getTime());
        return progress >= timeElapsed;
      });
      if (onTrack.length < activeGoals.length) {
        insights.push(
          `${activeGoals.length - onTrack.length} family goal(s) are behind schedule. Consider increasing contributions.`,
        );
      }
    }

    if (bills.length > 3) {
      insights.push(
        `You have ${bills.length} unpaid family bills. Total due: ₹${bills.reduce((s, b) => s + Number(b.amount), 0).toLocaleString('en-IN')}`,
      );
    }

    return { insights };
  }

  async getGoals(familyId: string) {
    const goals = await this.prisma.familyGoal.findMany({
      where: { familyId },
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
      deadline: g.deadline,
      category: g.category,
      status: g.status,
    }));
  }

  async getBills(familyId: string) {
    const bills = await this.prisma.familyBill.findMany({
      where: { familyId },
      orderBy: { dueDate: 'asc' },
    });
    return bills.map((b) => ({
      id: b.id,
      name: b.name,
      amount: Number(b.amount),
      dueDate: b.dueDate,
      isPaid: b.isPaid,
      category: b.category,
      frequency: b.frequency,
    }));
  }
}
