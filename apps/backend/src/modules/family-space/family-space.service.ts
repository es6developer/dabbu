import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface CreateFamilyGoalDto {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  deadline?: string;
  category?: string;
  assignedTo?: string;
  notes?: string;
}
interface UpdateFamilyGoalDto {
  name?: string;
  targetAmount?: number;
  savedAmount?: number;
  deadline?: string;
  category?: string;
  assignedTo?: string;
  notes?: string;
  status?: string;
}
interface CreateFamilyBillDto {
  name: string;
  amount: number;
  dueDate?: string;
  category?: string;
  frequency?: string;
  assignedTo?: string;
  notes?: string;
}
interface UpdateFamilyBillDto {
  name?: string;
  amount?: number;
  dueDate?: string;
  category?: string;
  frequency?: string;
  isPaid?: boolean;
  paidAt?: string;
  paidBy?: string;
  assignedTo?: string;
  notes?: string;
}
interface CreateContributionDto {
  amount: number;
  period?: string;
  type?: string;
  date?: string;
  notes?: string;
}
interface UpdateContributionDto {
  amount?: number;
  period?: string;
  type?: string;
  date?: string;
  notes?: string;
}
interface CreateInvestmentDto {
  name: string;
  type: string;
  amount: number;
  currentValue?: number;
  returns?: number;
  purchaseDate?: string;
  notes?: string;
  managedBy?: string;
}
interface UpdateInvestmentDto {
  name?: string;
  type?: string;
  amount?: number;
  currentValue?: number;
  returns?: number;
  purchaseDate?: string;
  notes?: string;
  managedBy?: string;
}
interface CreateDocumentDto {
  name: string;
  type?: string;
  category?: string;
  fileUrl: string;
  mimeType: string;
  fileSize?: number;
  description?: string;
  isEncrypted?: boolean;
  expiresAt?: string;
}
interface CreateCalendarEventDto {
  title: string;
  description?: string;
  eventType?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  recurrence?: string;
  referenceType?: string;
  referenceId?: string;
  assignedTo?: string;
}
interface UpdateCalendarEventDto {
  title?: string;
  description?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  recurrence?: string;
  referenceType?: string;
  referenceId?: string;
  assignedTo?: string;
}
interface CreateTaskDto {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedToId?: string;
  isRecurring?: boolean;
  frequency?: string;
}
interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedToId?: string;
  isRecurring?: boolean;
  frequency?: string;
}

@Injectable()
export class FamilySpaceService {
  private readonly logger = new Logger(FamilySpaceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getFamilyId(userId: string): Promise<string> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: { family: { select: { id: true, isActive: true } } },
    });
    if (!membership || !membership.family?.isActive) {
      throw new NotFoundException('User is not a member of an active family');
    }
    return membership.familyId;
  }

  private async getFamilyMemberIds(familyId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private async getFamilyMembers(familyId: string) {
    return this.prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });
  }

  async getDashboard(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const members = await this.getFamilyMembers(familyId);
    const memberIds = members.map((m) => m.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [incomeAgg, expenseAgg, goals, bills, tasks, healthScores, investments, contributions] =
      await Promise.all([
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
          where: { familyId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.familyBill.findMany({
          where: { familyId, isPaid: false },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
        this.prisma.sharedTask.findMany({
          where: { familyId, status: { not: 'completed' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.familyHealthScore.findMany({
          where: { familyId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }),
        this.prisma.familyInvestment.aggregate({
          where: { familyId },
          _sum: { amount: true, currentValue: true },
        }),
        this.prisma.familyContribution.aggregate({
          where: { familyId },
          _sum: { amount: true },
        }),
      ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpense = Number(expenseAgg._sum.amount || 0);
    const savings = Math.max(0, totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

    const netWorthRecords = await this.prisma.userNetWorth.findMany({
      where: { userId: { in: memberIds } },
    });
    const totalAssets = netWorthRecords.reduce((s, r) => s + Number(r.totalAssets || 0), 0);
    const totalLiabilities = netWorthRecords.reduce(
      (s, r) => s + Number(r.totalLiabilities || 0),
      0,
    );

    const latestHealth = healthScores[0];
    const avgHealth = latestHealth?.overallScore || 0;

    return {
      family: {
        id: family.id,
        name: family.name,
        code: family.code,
        memberCount: members.length,
        createdAt: family.createdAt,
      },
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.firstName || m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
      monthlySnapshot: { income: totalIncome, expense: totalExpense, savings, savingsRate },
      netWorth: { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities },
      goals: goals.map((g) => ({
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
      bills: bills.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        isPaid: b.isPaid,
        category: b.category,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignedToId: t.assignedToId,
        dueDate: t.dueDate,
      })),
      investments: {
        totalInvested: Number(investments._sum.amount || 0),
        currentValue: Number(investments._sum.currentValue || 0),
        count: 0,
      },
      totalContributions: Number(contributions._sum.amount || 0),
      healthScore: { overallScore: avgHealth },
    };
  }

  async getMembers(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const members = await this.getFamilyMembers(familyId);
    return members.map((m) => ({
      id: m.user.id,
      name: m.user.firstName || m.user.email,
      avatarUrl: m.user.avatarUrl,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async getGoals(userId: string) {
    const familyId = await this.getFamilyId(userId);
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
      category: g.category,
      deadline: g.deadline,
      status: g.status,
      createdBy: g.createdBy,
      assignedTo: g.assignedTo,
    }));
  }

  async getBills(userId: string) {
    const familyId = await this.getFamilyId(userId);
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
      paidAt: b.paidAt,
      category: b.category,
      frequency: b.frequency,
      paidBy: b.paidBy,
      assignedTo: b.assignedTo,
    }));
  }

  async getContributions(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const contributions = await this.prisma.familyContribution.findMany({
      where: { familyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    });
    const totalByMember = new Map<string, { name: string; total: number; count: number }>();
    for (const c of contributions) {
      const key = c.userId;
      const existing = totalByMember.get(key) || {
        name: c.user.firstName || c.user.lastName,
        total: 0,
        count: 0,
      };
      existing.total += Number(c.amount);
      existing.count += 1;
      totalByMember.set(key, existing);
    }
    return {
      contributions: contributions.map((c) => ({
        id: c.id,
        userId: c.userId,
        amount: Number(c.amount),
        period: c.period,
        type: c.type,
        date: c.date,
        user: { id: c.user.id, name: c.user.firstName || c.user.lastName },
      })),
      summary: Array.from(totalByMember.entries()).map(([userId, data]) => ({
        userId,
        name: data.name,
        totalContributed: data.total,
        contributionCount: data.count,
      })),
    };
  }

  async getBudget(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [budgets, txAgg] = await Promise.all([
      this.prisma.budget.findMany({
        where: {
          userId: { in: memberIds },
          isActive: true,
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
        },
        include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const spentByCategory = new Map(txAgg.map((t) => [t.categoryId, Number(t._sum.amount || 0)]));

    return {
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        spent: Number(b.spent),
        category: b.category
          ? {
              id: b.category.id,
              name: b.category.name,
              icon: b.category.icon,
              color: b.category.color,
            }
          : null,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
      })),
      monthlySpendingByCategory: Array.from(spentByCategory.entries()).map(
        ([categoryId, amount]) => ({
          categoryId,
          amount,
        }),
      ),
    };
  }

  async getInvestments(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const investments = await this.prisma.familyInvestment.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
    const totalCurrentValue = investments.reduce((s, i) => s + Number(i.currentValue), 0);
    return {
      investments: investments.map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        amount: Number(i.amount),
        currentValue: Number(i.currentValue),
        returns: Number(i.returns),
        purchaseDate: i.purchaseDate,
        managedBy: i.managedBy,
      })),
      summary: {
        totalInvested,
        totalCurrentValue,
        totalGainLoss: totalCurrentValue - totalInvested,
        count: investments.length,
      },
    };
  }

  async getInsurance(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
    const documents = await this.prisma.userDocument.findMany({
      where: { userId: { in: memberIds }, category: 'insurance', deletedAt: null },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      insurance: documents.map((d) => ({
        id: d.id,
        name: d.name,
        documentNumber: d.documentNumber,
        expiryDate: d.expiryDate,
        issuer: d.issuer,
        user: { id: d.user.id, name: d.user.firstName || d.user.lastName },
      })),
      count: documents.length,
    };
  }

  async getEmergencyFund(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
    const funds = await this.prisma.emergencyFund.findMany({
      where: { group: { members: { some: { userId: { in: memberIds } } } }, isActive: true },
      include: {
        contributions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return funds.map((f) => ({
      id: f.id,
      name: f.name,
      targetAmount: Number(f.targetAmount),
      savedAmount: Number(f.savedAmount || 0),
      monthlyContribution: Number(f.monthlyContribution || 0),
      progress:
        Number(f.targetAmount) > 0
          ? Math.round((Number(f.savedAmount || 0) / Number(f.targetAmount)) * 100)
          : 0,
      createdBy: { id: f.creator.id, name: f.creator.firstName || f.creator.lastName },
      contributions: f.contributions.map((c) => ({
        userId: c.userId,
        name: c.user.firstName || c.user.lastName,
        amount: Number(c.amount),
        createdAt: c.createdAt,
      })),
    }));
  }

  async getTasks(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const tasks = await this.prisma.sharedTask.findMany({
      where: { familyId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      isRecurring: t.isRecurring,
      createdBy: {
        id: t.createdBy.id,
        name: t.createdBy.firstName || t.createdBy.lastName,
        avatarUrl: t.createdBy.avatarUrl,
      },
      assignedTo: t.assignedTo
        ? {
            id: t.assignedTo.id,
            name: t.assignedTo.firstName || t.assignedTo.lastName,
            avatarUrl: t.assignedTo.avatarUrl,
          }
        : null,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));
  }

  async getCalendar(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [bills, goals, tasks, calendarEvents] = await Promise.all([
      this.prisma.bill.findMany({
        where: {
          userId: { in: memberIds },
          dueDate: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        select: { id: true, name: true, amount: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.goal.findMany({
        where: {
          userId: { in: memberIds },
          deadline: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        select: { id: true, name: true, targetAmount: true, deadline: true },
        orderBy: { deadline: 'asc' },
      }),
      this.prisma.sharedTask.findMany({
        where: { familyId, dueDate: { gte: monthStart, lte: monthEnd } },
        select: { id: true, title: true, dueDate: true, status: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.familyCalendarEvent.findMany({
        where: {
          familyId,
          startDate: { gte: monthStart },
          endDate: { lte: monthEnd },
        },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    return {
      bills: bills.map((b) => ({
        id: b.id,
        title: b.name,
        amount: Number(b.amount),
        date: b.dueDate,
        type: 'bill',
      })),
      goals: goals.map((g) => ({
        id: g.id,
        title: g.name,
        amount: Number(g.targetAmount),
        date: g.deadline,
        type: 'goal',
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.dueDate,
        status: t.status,
        type: 'task',
      })),
      events: calendarEvents.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startDate: e.startDate,
        endDate: e.endDate,
        allDay: e.allDay,
        color: e.color,
        recurrence: e.recurrence,
      })),
    };
  }

  async getDocuments(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);

    const [familyDocs, userDocs] = await Promise.all([
      this.prisma.familyDocument.findMany({
        where: { familyId },
        include: { uploader: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userDocument.findMany({
        where: { userId: { in: memberIds }, deletedAt: null, isArchived: false },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      familyDocuments: familyDocs.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        category: d.category,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        fileUrl: d.fileUrl,
        uploadedBy: { id: d.uploader.id, name: d.uploader.firstName || d.uploader.lastName },
        createdAt: d.createdAt,
        expiresAt: d.expiresAt,
      })),
      personalDocuments: userDocs.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        user: { id: d.user.id, name: d.user.firstName || d.user.lastName },
        expiryDate: d.expiryDate,
        createdAt: d.createdAt,
      })),
    };
  }

  async getAIAdvisor(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);

    const [insights, healthScores] = await Promise.all([
      this.prisma.aiInsight.findMany({
        where: { userId: { in: memberIds }, isDismissed: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.familyHealthScore.findMany({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
    ]);

    const latestHealth = healthScores[0];

    return {
      healthScore: latestHealth
        ? {
            overallScore: latestHealth.overallScore,
            savingsScore: latestHealth.savingsScore,
            debtScore: latestHealth.debtScore,
            goalsScore: latestHealth.goalsScore,
            insuranceScore: latestHealth.insuranceScore,
            emergencyFundScore: latestHealth.emergencyFundScore,
          }
        : null,
      insights: insights.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        type: i.type,
        severity: i.severity,
        category: i.category,
        amount: i.amount ? Number(i.amount) : null,
      })),
    };
  }

  async getReports(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [monthlyIncome, monthlyExpense, monthlyTxns, pendingBills, activeGoals] =
      await Promise.all([
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
        this.prisma.transaction.findMany({
          where: {
            userId: { in: memberIds },
            deletedAt: null,
            date: { gte: monthStart, lte: monthEnd },
          },
          orderBy: { date: 'desc' },
          take: 100,
        }),
        this.prisma.familyBill.count({ where: { familyId, isPaid: false } }),
        this.prisma.familyGoal.count({ where: { familyId, status: 'active' } }),
      ]);

    const income = Number(monthlyIncome._sum.amount || 0);
    const expense = Number(monthlyExpense._sum.amount || 0);

    const categoryBreakdown = monthlyTxns
      .filter((t) => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => {
        const cat = t.categoryId || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + Number(t.amount);
        return acc;
      }, {});

    return {
      period: { start: monthStart, end: monthEnd },
      summary: {
        income,
        expense,
        savings: Math.max(0, income - expense),
        memberCount: memberIds.length,
      },
      pendingBills,
      activeGoals,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([categoryId, amount]) => ({
        categoryId,
        amount,
      })),
      transactionCount: monthlyTxns.length,
    };
  }

  async getVault(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);

    const [familyDocs, userDocs] = await Promise.all([
      this.prisma.familyDocument.findMany({
        where: { familyId, isEncrypted: true },
        include: { uploader: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userDocument.findMany({
        where: { userId: { in: memberIds }, deletedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const allDocs = [
      ...familyDocs.map((d) => ({
        ...d,
        uploadedByName: d.uploader.firstName || d.uploader.lastName,
      })),
      ...userDocs.map((d: any) => ({ ...d, uploadedByName: d.user.firstName || d.user.lastName })),
    ];

    const byCategory = allDocs.reduce<Record<string, typeof allDocs>>((acc, d) => {
      const cat = d.category || 'other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(d);
      return acc;
    }, {});

    return {
      documents: allDocs.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        fileUrl: d.fileUrl,
        uploadedBy: d.uploadedByName,
        createdAt: d.createdAt,
      })),
      byCategory: Object.entries(byCategory).map(([category, docs]) => ({
        category,
        count: docs.length,
      })),
      totalCount: allDocs.length,
    };
  }

  async getHealthScore(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const scores = await this.prisma.familyHealthScore.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const latest = scores[0];
    return latest
      ? {
          overallScore: latest.overallScore,
          savingsScore: latest.savingsScore,
          debtScore: latest.debtScore,
          goalsScore: latest.goalsScore,
          insuranceScore: latest.insuranceScore,
          emergencyFundScore: latest.emergencyFundScore,
          investmentRatioScore: latest.investmentRatioScore,
          periodStart: latest.periodStart,
          periodEnd: latest.periodEnd,
        }
      : {
          overallScore: 0,
          savingsScore: 0,
          debtScore: 0,
          goalsScore: 0,
          insuranceScore: 0,
          emergencyFundScore: 0,
          investmentRatioScore: 0,
        };
  }

  async getNetWorth(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
    const [netWorths, snapshots] = await Promise.all([
      this.prisma.userNetWorth.findMany({ where: { userId: { in: memberIds } } }),
      this.prisma.netWorthSnapshot.findMany({
        where: { userId: { in: memberIds } },
        orderBy: { snapshotDate: 'asc' },
        take: 12,
      }),
    ]);
    const totalAssets = netWorths.reduce((s, n) => s + Number(n.totalAssets || 0), 0);
    const totalLiabilities = netWorths.reduce((s, n) => s + Number(n.totalLiabilities || 0), 0);
    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      members: netWorths.map((n) => ({
        userId: n.userId,
        totalAssets: Number(n.totalAssets || 0),
        totalLiabilities: Number(n.totalLiabilities || 0),
        netWorth: Number(n.totalAssets || 0) - Number(n.totalLiabilities || 0),
      })),
      trend: snapshots.map((s) => ({
        date: s.snapshotDate,
        netWorth: Number(s.netWorth || 0),
        totalAssets: Number(s.totalAssets || 0),
        totalLiabilities: Number(s.totalLiabilities || 0),
      })),
    };
  }

  async getInsights(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const memberIds = await this.getFamilyMemberIds(familyId);
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

    const generated: string[] = [];
    if (expenseChange > 10) {
      generated.push(
        `Family spending increased ${expenseChange}% this month. Consider reviewing non-essential expenses.`,
      );
    } else if (expenseChange < -10) {
      generated.push(
        `Great job! Family spending decreased ${Math.abs(expenseChange)}% this month.`,
      );
    } else {
      generated.push('Family spending is stable compared to last month.');
    }

    if (goals.length > 0) {
      const onTrack = goals.filter((g) => {
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
      if (onTrack.length < goals.length) {
        generated.push(
          `${goals.length - onTrack.length} family goal(s) are behind schedule. Consider increasing contributions.`,
        );
      }
    }

    if (bills.length > 0) {
      const totalDue = bills.reduce((s, b) => s + Number(b.amount), 0);
      generated.push(
        `You have ${bills.length} unpaid family bills totaling ${totalDue.toFixed(2)}.`,
      );
    }

    return { insights: generated };
  }

  async getCalendarEvents(userId: string) {
    const familyId = await this.getFamilyId(userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const events = await this.prisma.familyCalendarEvent.findMany({
      where: {
        familyId,
        startDate: { gte: monthStart },
        endDate: { lte: monthEnd },
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      startDate: e.startDate,
      endDate: e.endDate,
      allDay: e.allDay,
      color: e.color,
      recurrence: e.recurrence,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      createdBy: { id: e.creator.id, name: e.creator.firstName || e.creator.lastName },
      assignedTo: e.assignedTo,
    }));
  }

  // ─── CRUD: Goals ───────────────────────────────────────

  async createGoal(userId: string, dto: CreateFamilyGoalDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.familyGoal.create({
      data: {
        familyId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        savedAmount: dto.savedAmount || 0,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        category: dto.category || 'savings',
        assignedTo: dto.assignedTo || null,
        notes: dto.notes || null,
        createdBy: userId,
      },
    });
  }

  async updateGoal(userId: string, goalId: string, dto: UpdateFamilyGoalDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyGoal.findFirst({ where: { id: goalId, familyId } });
    if (!existing) {
      throw new NotFoundException('Family goal not found');
    }
    return this.prisma.familyGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.savedAmount !== undefined && { savedAmount: dto.savedAmount }),
        ...(dto.deadline !== undefined && {
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async deleteGoal(userId: string, goalId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyGoal.findFirst({ where: { id: goalId, familyId } });
    if (!existing) {
      throw new NotFoundException('Family goal not found');
    }
    return this.prisma.familyGoal.delete({ where: { id: goalId } });
  }

  // ─── CRUD: Bills ───────────────────────────────────────

  async createBill(userId: string, dto: CreateFamilyBillDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.familyBill.create({
      data: {
        familyId,
        name: dto.name,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        category: dto.category || 'other',
        frequency: dto.frequency || 'monthly',
        assignedTo: dto.assignedTo || null,
        notes: dto.notes || null,
      },
    });
  }

  async updateBill(userId: string, billId: string, dto: UpdateFamilyBillDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyBill.findFirst({ where: { id: billId, familyId } });
    if (!existing) {
      throw new NotFoundException('Family bill not found');
    }
    return this.prisma.familyBill.update({
      where: { id: billId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.isPaid !== undefined && {
          isPaid: dto.isPaid,
          paidAt: dto.isPaid ? (dto.paidAt ? new Date(dto.paidAt) : new Date()) : null,
          paidBy: dto.isPaid ? dto.paidBy || userId : null,
        }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteBill(userId: string, billId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyBill.findFirst({ where: { id: billId, familyId } });
    if (!existing) {
      throw new NotFoundException('Family bill not found');
    }
    return this.prisma.familyBill.delete({ where: { id: billId } });
  }

  // ─── CRUD: Contributions ───────────────────────────────

  async createContribution(userId: string, dto: CreateContributionDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const now = new Date();
    const period =
      dto.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.prisma.familyContribution.create({
      data: {
        familyId,
        userId,
        amount: dto.amount,
        period,
        type: dto.type || 'monthly',
        date: dto.date ? new Date(dto.date) : now,
        notes: dto.notes || null,
      },
    });
  }

  async updateContribution(
    userId: string,
    contributionId: string,
    dto: UpdateContributionDto,
  ): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyContribution.findFirst({
      where: { id: contributionId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family contribution not found');
    }
    return this.prisma.familyContribution.update({
      where: { id: contributionId },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.date !== undefined && { date: dto.date ? new Date(dto.date) : undefined }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteContribution(userId: string, contributionId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyContribution.findFirst({
      where: { id: contributionId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family contribution not found');
    }
    return this.prisma.familyContribution.delete({ where: { id: contributionId } });
  }

  // ─── CRUD: Investments ───────────────────────────────

  async createInvestment(userId: string, dto: CreateInvestmentDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.familyInvestment.create({
      data: {
        familyId,
        name: dto.name,
        type: dto.type,
        amount: dto.amount,
        currentValue: dto.currentValue || dto.amount,
        returns: dto.returns || 0,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        notes: dto.notes || null,
        managedBy: dto.managedBy || userId,
      },
    });
  }

  async updateInvestment(
    userId: string,
    investmentId: string,
    dto: UpdateInvestmentDto,
  ): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyInvestment.findFirst({
      where: { id: investmentId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family investment not found');
    }
    return this.prisma.familyInvestment.update({
      where: { id: investmentId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currentValue !== undefined && { currentValue: dto.currentValue }),
        ...(dto.returns !== undefined && { returns: dto.returns }),
        ...(dto.purchaseDate !== undefined && {
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.managedBy !== undefined && { managedBy: dto.managedBy }),
      },
    });
  }

  async deleteInvestment(userId: string, investmentId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyInvestment.findFirst({
      where: { id: investmentId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family investment not found');
    }
    return this.prisma.familyInvestment.delete({ where: { id: investmentId } });
  }

  // ─── CRUD: Documents ─────────────────────────────────

  async createDocument(userId: string, dto: CreateDocumentDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.familyDocument.create({
      data: {
        familyId,
        name: dto.name,
        type: dto.type || 'other',
        category: dto.category || 'other',
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize || 0,
        description: dto.description || null,
        isEncrypted: dto.isEncrypted || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        uploadedBy: userId,
      },
    });
  }

  async deleteDocument(userId: string, documentId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyDocument.findFirst({
      where: { id: documentId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family document not found');
    }
    return this.prisma.familyDocument.delete({ where: { id: documentId } });
  }

  // ─── CRUD: Calendar Events ───────────────────────────

  async createCalendarEvent(userId: string, dto: CreateCalendarEventDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.familyCalendarEvent.create({
      data: {
        familyId,
        title: dto.title,
        description: dto.description || null,
        eventType: dto.eventType || 'custom',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        allDay: dto.allDay || false,
        color: dto.color || null,
        recurrence: dto.recurrence || null,
        referenceType: dto.referenceType || null,
        referenceId: dto.referenceId || null,
        createdBy: userId,
        assignedTo: dto.assignedTo || null,
      },
    });
  }

  async updateCalendarEvent(
    userId: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyCalendarEvent.findFirst({
      where: { id: eventId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family calendar event not found');
    }
    return this.prisma.familyCalendarEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.allDay !== undefined && { allDay: dto.allDay }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
        ...(dto.referenceType !== undefined && { referenceType: dto.referenceType }),
        ...(dto.referenceId !== undefined && { referenceId: dto.referenceId }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
      },
    });
  }

  async deleteCalendarEvent(userId: string, eventId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.familyCalendarEvent.findFirst({
      where: { id: eventId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Family calendar event not found');
    }
    return this.prisma.familyCalendarEvent.delete({ where: { id: eventId } });
  }

  // ─── CRUD: Tasks ─────────────────────────────────────

  async createTask(userId: string, dto: CreateTaskDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.sharedTask.create({
      data: {
        familyId,
        createdById: userId,
        title: dto.title,
        description: dto.description || null,
        status: dto.status || 'pending',
        priority: dto.priority || 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignedToId: dto.assignedToId || null,
        isRecurring: dto.isRecurring || false,
        frequency: dto.frequency || null,
      },
    });
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.sharedTask.findFirst({ where: { id: taskId, familyId } });
    if (!existing) {
      throw new NotFoundException('Shared task not found');
    }
    const updateData: any = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
      ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
      ...(dto.frequency !== undefined && { frequency: dto.frequency }),
    };
    if (dto.status === 'completed') {
      updateData.completedAt = new Date();
      updateData.completedById = userId;
    }
    return this.prisma.sharedTask.update({
      where: { id: taskId },
      data: updateData,
    });
  }

  async deleteTask(userId: string, taskId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    const existing = await this.prisma.sharedTask.findFirst({ where: { id: taskId, familyId } });
    if (!existing) {
      throw new NotFoundException('Shared task not found');
    }
    return this.prisma.sharedTask.delete({ where: { id: taskId } });
  }
}
