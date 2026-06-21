import { Injectable, Logger } from '@nestjs/common';
import { LensType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PersonalDashboardData {
  income: number;
  expense: number;
  savings: number;
  netWorth: { total: number; assets: number; liabilities: number };
  goals: { id: string; name: string; targetAmount: number; currentAmount: number; progress: number; type: string; icon?: string; color?: string }[];
  bills: { id: string; name: string; amount: number; dueDate: string; category: string; isPaid: boolean }[];
  budgets: { id: string; name: string; amount: number; spent: number; remaining: number; progress: number }[];
  accountBalances: { id: string; name: string; type: string; balance: number; institution?: string }[];
}

export interface PartneredDashboardData {
  incomeCombined: number;
  expenseCombined: number;
  sharedBalance: number;
  partnerContribution: { partnerId: string; name: string; contributed: number; percentage: number }[];
  sharedBudget: { id: string; name: string; amount: number; spent: number; remaining: number }[];
  sharedGoals: { id: string; name: string; targetAmount: number; currentAmount: number; progress: number }[];
  sharedBills: { id: string; name: string; amount: number; dueDate: string; category: string; isPaid: boolean }[];
  settlementStatus: { totalOwed: number; youOwe: number; youAreOwed: number };
  spendingComparison: { you: { category: string; amount: number }[]; partner: { category: string; amount: number }[] };
}

export interface FamilyDashboardData {
  familyIncome: number;
  familyExpense: number;
  utilityBills: { id: string; name: string; amount: number; dueDate: string; category: string; isPaid: boolean }[];
  familyBudget: { id: string; name: string; amount: number; spent: number; remaining: number }[];
  familyGoals: { id: string; name: string; targetAmount: number; currentAmount: number; progress: number }[];
  familyNetWorth: { total: number; assets: number; liabilities: number };
  allowances: { id: string; memberName: string; amount: number; frequency: string; nextDate: string }[];
  reminders: { id: string; title: string; dueDate: string; completed: boolean }[];
}

export interface FullDashboardData {
  personal: PersonalDashboardData;
  partnered: PartneredDashboardData;
  family: FamilyDashboardData;
  spaces: { id: string; name: string; type: string; balance: number; memberCount: number }[];
  investments: { id: string; name: string; type: string; value: number; returns: number; returnsPct: number }[];
  goals: { id: string; name: string; targetAmount: number; currentAmount: number; progress: number; lens: string }[];
  bills: { id: string; name: string; amount: number; dueDate: string; category: string; isPaid: boolean; lens: string }[];
  analytics: { netWorthHistory: { month: string; value: number }[]; incomeVsExpense: { month: string; income: number; expense: number }[] };
}

@Injectable()
export class LensDashboardService {
  private readonly logger = new Logger(LensDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPersonalDashboard(userId: string): Promise<PersonalDashboardData> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [incomeAgg, expenseAgg, netWorth, goals, bills, budgets, accounts] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: 'income', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: 'expense', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.userNetWorth.findUnique({ where: { userId } }).catch(() => null),
      this.prisma.goal.findMany({
        where: { userId, deletedAt: null, isCompleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, targetAmount: true, currentAmount: true, type: true, icon: true, color: true },
      }).catch(() => []),
      this.prisma.bill.findMany({
        where: { userId, deletedAt: null, isPaid: false },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: { id: true, name: true, amount: true, dueDate: true, isPaid: true },
      }).catch(() => []),
      this.prisma.budget.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, amount: true, spent: true },
      }).catch(() => []),
      this.prisma.account.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, type: true, balance: true, institution: true },
      }).catch(() => []),
    ]);

    const income = Number(incomeAgg._sum?.amount || 0);
    const expense = Number(expenseAgg._sum?.amount || 0);
    const totalAssets = Number(netWorth?.totalAssets || 0);
    const totalLiabilities = Number(netWorth?.totalLiabilities || 0);

    return {
      income,
      expense,
      savings: Math.max(0, income - expense),
      netWorth: { total: totalAssets - totalLiabilities, assets: totalAssets, liabilities: totalLiabilities },
      goals: goals.map(g => ({
        id: g.id, name: g.name,
        targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount),
        progress: Number(g.targetAmount) > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0,
        type: g.type, icon: g.icon, color: g.color,
      })),
      bills: bills.map(b => ({
        id: b.id, name: b.name, amount: Number(b.amount),
        dueDate: b.dueDate.toISOString(), category: b.name,
        isPaid: b.isPaid,
      })),
      budgets: budgets.map(b => ({
        id: b.id, name: b.name, amount: Number(b.amount), spent: Number(b.spent),
        remaining: Math.max(0, Number(b.amount) - Number(b.spent)),
        progress: Number(b.amount) > 0 ? Math.min(100, Math.round((Number(b.spent) / Number(b.amount)) * 100)) : 0,
      })),
      accountBalances: accounts.map(a => ({
        id: a.id, name: a.name, type: a.type, balance: Number(a.balance), institution: a.institution,
      })),
    };
  }

  async getPartneredDashboard(userId: string): Promise<PartneredDashboardData | null> {
    const coupleSpaces = await this.prisma.space.findMany({
      where: { type: 'COUPLE', members: { some: { userId } } },
      select: { id: true },
    }).catch(() => []);

    if (coupleSpaces.length === 0) return null;

    const ids = coupleSpaces.map(s => s.id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const incomeAggP = this.prisma.transaction.aggregate({
      where: { spaceId: { in: ids }, deletedAt: null, type: 'income', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: 0 } }));
    const expenseAggP = this.prisma.transaction.aggregate({
      where: { spaceId: { in: ids }, deletedAt: null, type: 'expense', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: 0 } }));
    const goalsP = this.prisma.goal.findMany({
      where: { spaceId: { in: ids }, deletedAt: null, isCompleted: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, targetAmount: true, currentAmount: true, type: true },
    }).catch(() => []);
    const budgetsP = this.prisma.budget.findMany({
      where: { spaceId: { in: ids }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, amount: true, spent: true },
    }).catch(() => []);

    const results = await Promise.all([incomeAggP, expenseAggP, goalsP, budgetsP]);
    const incomeAggR = results[0] as any;
    const expenseAggR = results[1] as any;
    const goals = results[2] as any[];
    const budgetsR = results[3] as any[];

    let partnerInfo: { partnerId: string; name: string; contributed: number; percentage: number }[] = [];
    try {
      const members = await this.prisma.spaceMember.findMany({
        where: { spaceId: { in: ids } },
        select: { userId: true, role: true, user: { select: { id: true, firstName: true, lastName: true } } },
      });
      partnerInfo = members
        .filter(m => m.userId !== userId)
        .map(m => ({
          partnerId: m.user.id, name: `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim(),
          contributed: 0, percentage: 0,
        }));
    } catch { /* silent */ }

    const income = Number(incomeAggR._sum?.amount || 0);
    const expense = Number(expenseAggR._sum?.amount || 0);

    return {
      incomeCombined: income,
      expenseCombined: expense,
      sharedBalance: Math.max(0, income - expense),
      partnerContribution: partnerInfo,
      sharedBudget: budgetsR.map((b: any) => ({
        id: b.id, name: b.name, amount: Number(b.amount), spent: Number(b.spent),
        remaining: Math.max(0, Number(b.amount) - Number(b.spent)),
      })),
      sharedGoals: goals.map((g: any) => ({
        id: g.id, name: g.name,
        targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount),
        progress: Number(g.targetAmount) > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0,
      })),
      sharedBills: [],
      settlementStatus: {
        totalOwed: 0,
        youOwe: 0,
        youAreOwed: 0,
      },
      spendingComparison: { you: [], partner: [] },
    };
  }

  async getFamilyDashboard(userId: string): Promise<FamilyDashboardData | null> {
    const families = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true, family: { select: { id: true } } },
    }).catch(() => []);
    const familyIds = families.map(f => f.familyId);

    if (familyIds.length === 0) return null;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [goals, bills, budgetData, reminders] = await Promise.all([
      this.prisma.familyGoal.findMany({
        where: { familyId: { in: familyIds }, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, targetAmount: true, savedAmount: true, category: true },
      }).catch(() => []),
      this.prisma.familyBill.findMany({
        where: { familyId: { in: familyIds }, isPaid: false },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: { id: true, name: true, amount: true, dueDate: true, category: true, isPaid: true },
      }).catch(() => []),
      this.prisma.budget.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, amount: true, spent: true },
      }).catch(() => []),
      this.prisma.reminder.findMany({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { id: true, title: true, dueDate: true, status: true },
      }).catch(() => []),
    ]);

    const familyMembers = await this.prisma.familyMember.count({
      where: { familyId: { in: familyIds } },
    }).catch(() => 0);

    return {
      familyIncome: 0,
      familyExpense: 0,
      utilityBills: bills.map(b => ({
        id: b.id, name: b.name, amount: Number(b.amount),
        dueDate: b.dueDate?.toISOString() || new Date().toISOString(),
        category: b.category, isPaid: b.isPaid,
      })),
      familyBudget: budgetData.map(b => ({
        id: b.id, name: b.name, amount: Number(b.amount), spent: Number(b.spent),
        remaining: Math.max(0, Number(b.amount) - Number(b.spent)),
      })),
      familyGoals: goals.map(g => ({
        id: g.id, name: g.name,
        targetAmount: Number(g.targetAmount), currentAmount: Number(g.savedAmount),
        progress: Number(g.targetAmount) > 0 ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100) : 0,
      })),
      familyNetWorth: { total: 0, assets: 0, liabilities: 0 },
      allowances: [],
      reminders: reminders.map(r => ({
        id: r.id, title: r.title,
        dueDate: r.dueDate?.toISOString() || new Date().toISOString(),
        completed: r.status === 'completed',
      })),
    };
  }

  async getFullDashboard(userId: string): Promise<FullDashboardData | null> {
    const [personal, partnered, family] = await Promise.all([
      this.getPersonalDashboard(userId),
      this.getPartneredDashboard(userId),
      this.getFamilyDashboard(userId),
    ]);

    const spaces = await this.prisma.space.findMany({
      where: { members: { some: { userId } } },
      select: { id: true, name: true, type: true },
    }).catch(() => []);

    const investments = await this.prisma.investment.findMany({
      where: { userId, deletedAt: null },
      take: 10,
      select: { id: true, name: true, type: true, currentPrice: true, buyPrice: true, quantity: true },
    }).catch(() => []);

    const spaceCounts = await Promise.all(
      spaces.map(s =>
        this.prisma.spaceMember.count({ where: { spaceId: s.id } }).catch(() => 0)
      )
    );

    const totalGoals = [
      ...(personal?.goals || []).map(g => ({ ...g, lens: 'PERSONAL' })),
      ...(partnered?.sharedGoals || []).map(g => ({ ...g, lens: 'PARTNERED' })),
      ...(family?.familyGoals || []).map(g => ({ ...g, lens: 'FAMILY' })),
    ];

    const totalBills = [
      ...(personal?.bills || []).map(b => ({ ...b, lens: 'PERSONAL' })),
      ...(partnered?.sharedBills || []).map(b => ({ ...b, lens: 'PARTNERED' })),
      ...(family?.utilityBills || []).map(b => ({ ...b, lens: 'FAMILY' })),
    ];

    return {
      personal: personal || {
        income: 0, expense: 0, savings: 0,
        netWorth: { total: 0, assets: 0, liabilities: 0 },
        goals: [], bills: [], budgets: [], accountBalances: [],
      },
      partnered: partnered || {
        incomeCombined: 0, expenseCombined: 0, sharedBalance: 0,
        partnerContribution: [], sharedBudget: [], sharedGoals: [],
        sharedBills: [], settlementStatus: { totalOwed: 0, youOwe: 0, youAreOwed: 0 },
        spendingComparison: { you: [], partner: [] },
      },
      family: family || {
        familyIncome: 0, familyExpense: 0, utilityBills: [],
        familyBudget: [], familyGoals: [], familyNetWorth: { total: 0, assets: 0, liabilities: 0 },
        allowances: [], reminders: [],
      },
      spaces: spaces.map((s, i) => ({
        id: s.id, name: s.name, type: s.type,
        balance: 0, memberCount: spaceCounts[i] || 0,
      })),
      investments: investments.map(i => {
        const value = Number(i.currentPrice || 0) * Number(i.quantity || 0);
        const cost = Number(i.buyPrice || 0) * Number(i.quantity || 0);
        return {
          id: i.id, name: i.name, type: i.type,
          value,
          returns: value - cost,
          returnsPct: cost > 0 ? Math.round(((value - cost) / cost) * 100) : 0,
        };
      }),
      goals: totalGoals,
      bills: totalBills as any[],
      analytics: {
        netWorthHistory: [],
        incomeVsExpense: [],
      },
    };
  }

  async getLensDashboard(lens: LensType, userId: string): Promise<any> {
    switch (lens) {
      case 'PERSONAL':
        return this.getPersonalDashboard(userId);
      case 'PARTNERED':
        return this.getPartneredDashboard(userId);
      case 'FAMILY':
        return this.getFamilyDashboard(userId);
      case 'FULL':
        return this.getFullDashboard(userId);
      default:
        return this.getPersonalDashboard(userId);
    }
  }
}
