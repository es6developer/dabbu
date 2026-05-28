import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CoupleProfileDto, UpdateSalariesDto } from './dto/expenses.dto';

@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(userId: string, dto: CoupleProfileDto) {
    const myGroupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.partner2Id, userId } },
      include: { group: true },
    });

    if (!myGroupMember) {
      throw new BadRequestException('Partner must be in the same group');
    }

    const groupId = myGroupMember.groupId;

    const partnerMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: dto.partner2Id } },
    });
    if (!partnerMember) {
      throw new BadRequestException('Partner is not a member of this group');
    }

    if (userId === dto.partner2Id) {
      throw new BadRequestException('Cannot set yourself as partner');
    }

    const existing = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
    });

    const salary1 = dto.salary1 || 0;
    const salary2 = dto.salary2 || 0;
    const totalSalary = salary1 + salary2;
    const contributionRatio = totalSalary > 0 ? (salary1 / totalSalary) * 100 : 50;

    if (existing) {
      const updated = await this.prisma.coupleFinanceProfile.update({
        where: { id: existing.id },
        data: {
          partner1Id: myGroupMember.id,
          partner2Id: partnerMember.id,
          salary1,
          salary2,
          contributionRatio,
          sharedSavingsGoal: dto.sharedSavingsGoal,
          monthlyBudget: dto.monthlyBudget,
        },
        include: {
          partner1: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
          partner2: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      });

      this.logger.log(`Couple profile ${updated.id} updated for group ${groupId}`);
      return updated;
    }

    const profile = await this.prisma.coupleFinanceProfile.create({
      data: {
        groupId,
        partner1Id: myGroupMember.id,
        partner2Id: partnerMember.id,
        salary1,
        salary2,
        contributionRatio,
        sharedSavingsGoal: dto.sharedSavingsGoal || 0,
        monthlyBudget: dto.monthlyBudget || 0,
      },
      include: {
        partner1: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        partner2: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    this.logger.log(`Couple profile ${profile.id} created for group ${groupId}`);
    return profile;
  }

  async getProfile(userId: string) {
    const myMemberships = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { groupId: true },
    });

    const groupIds = myMemberships.map((m) => m.groupId);

    const profile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { groupId: { in: groupIds } },
      include: {
        group: { select: { id: true, name: true, currency: true } },
        partner1: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
          },
        },
        partner2: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Couple profile not found');
    return profile;
  }

  async updateSalaries(userId: string, dto: UpdateSalariesDto) {
    const myMemberships = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { groupId: true },
    });

    const groupIds = myMemberships.map((m) => m.groupId);

    const profile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { groupId: { in: groupIds } },
    });

    if (!profile) throw new NotFoundException('Couple profile not found');

    const salary1 = dto.salary1;
    const salary2 = dto.salary2;
    const totalSalary = salary1 + salary2;
    const contributionRatio = totalSalary > 0 ? (salary1 / totalSalary) * 100 : 50;

    const updated = await this.prisma.coupleFinanceProfile.update({
      where: { id: profile.id },
      data: {
        salary1,
        salary2,
        contributionRatio,
      },
    });

    this.logger.log(`Salaries updated for couple profile ${profile.id}`);
    return updated;
  }

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);

    const isPartner1 = profile.partner1.userId === userId;
    const mySalary = isPartner1 ? Number(profile.salary1) : Number(profile.salary2);
    const partnerSalary = isPartner1 ? Number(profile.salary2) : Number(profile.salary1);
    const totalIncome = mySalary + partnerSalary;
    const myRatio = totalIncome > 0 ? Math.round((mySalary / totalIncome) * 10000) / 100 : 50;
    const partnerRatio = totalIncome > 0 ? Math.round((partnerSalary / totalIncome) * 10000) / 100 : 50;

    const partnerUser = isPartner1 ? profile.partner2 : profile.partner1;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [myTransactions, partnerTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          date: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
        select: { amount: true, category: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId: partnerUser.userId,
          type: 'expense',
          date: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
        select: { amount: true, category: true },
      }),
    ]);

    const myTotalSpend = myTransactions.reduce((s, t) => s + Number(t.amount), 0);
    const partnerTotalSpend = partnerTransactions.reduce((s, t) => s + Number(t.amount), 0);

    const myCategoryMap = this.aggregateByCategory(myTransactions);
    const partnerCategoryMap = this.aggregateByCategory(partnerTransactions);
    const allCategories = new Set([...myCategoryMap.keys(), ...partnerCategoryMap.keys()]);

    const categoryComparison = Array.from(allCategories).map((category) => ({
      category,
      me: myCategoryMap.get(category) || 0,
      partner: partnerCategoryMap.get(category) || 0,
    }));

    return {
      partners: {
        me: { id: userId, salary: mySalary, totalSpend: Math.round(myTotalSpend * 100) / 100 },
        partner: { id: partnerUser.userId, salary: partnerSalary, totalSpend: Math.round(partnerTotalSpend * 100) / 100 },
      },
      incomeRatio: { mine: myRatio, partner: partnerRatio },
      totalIncome,
      sharedSavingsGoal: Number(profile.sharedSavingsGoal || 0),
      sharedSavings: Number(profile.sharedSavingsCurrent || 0),
      categoryComparison,
    };
  }

  async getMonthlyOverview(userId: string, year?: number, month?: number) {
    const profile = await this.getProfile(userId);

    const isPartner1 = profile.partner1.userId === userId;
    const partnerUser = isPartner1 ? profile.partner2 : profile.partner1;

    const y = year || new Date().getFullYear();
    const m = month !== undefined ? month : new Date().getMonth() + 1;
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const [myTransactions, partnerTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        select: { amount: true, type: true, category: true, description: true, date: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId: partnerUser.userId,
          date: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        select: { amount: true, type: true, category: true, description: true, date: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const myIncome = myTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const myExpense = myTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const partnerIncome = partnerTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const partnerExpense = partnerTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    const myCategoryExpense = this.aggregateByCategory(
      myTransactions.filter((t) => t.type === 'expense'),
    );
    const partnerCategoryExpense = this.aggregateByCategory(
      partnerTransactions.filter((t) => t.type === 'expense'),
    );

    return {
      month: m,
      year: y,
      summary: {
        myIncome: Math.round(myIncome * 100) / 100,
        myExpense: Math.round(myExpense * 100) / 100,
        myNetSavings: Math.round((myIncome - myExpense) * 100) / 100,
        partnerIncome: Math.round(partnerIncome * 100) / 100,
        partnerExpense: Math.round(partnerExpense * 100) / 100,
        partnerNetSavings: Math.round((partnerIncome - partnerExpense) * 100) / 100,
        combinedIncome: Math.round((myIncome + partnerIncome) * 100) / 100,
        combinedExpense: Math.round((myExpense + partnerExpense) * 100) / 100,
        combinedSavings: Math.round(((myIncome + partnerIncome) - (myExpense + partnerExpense)) * 100) / 100,
      },
      categoryBreakdown: Array.from(
        new Set([...myCategoryExpense.keys(), ...partnerCategoryExpense.keys()]),
      ).map((category) => ({
        category,
        me: myCategoryExpense.get(category) || 0,
        partner: partnerCategoryExpense.get(category) || 0,
      })),
      myTransactions,
      partnerTransactions,
    };
  }

  async getInsights(userId: string) {
    const profile = await this.getProfile(userId);

    const isPartner1 = profile.partner1.userId === userId;
    const partnerUser = isPartner1 ? profile.partner2 : profile.partner1;

    const mySalary = Number(isPartner1 ? profile.salary1 : profile.salary2);
    const partnerSalary = Number(isPartner1 ? profile.salary2 : profile.salary1);
    const totalIncome = mySalary + partnerSalary;
    const incomeRatio = totalIncome > 0 ? mySalary / totalIncome : 0.5;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [mySpending, partnerSpending] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId, type: 'expense',
          date: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
        select: { amount: true, category: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId: partnerUser.userId, type: 'expense',
          date: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
        select: { amount: true, category: true },
      }),
    ]);

    const myTotal = mySpending.reduce((s, t) => s + Number(t.amount), 0);
    const partnerTotal = partnerSpending.reduce((s, t) => s + Number(t.amount), 0);

    const expectedMyShare = Math.round((myTotal + partnerTotal) * incomeRatio * 100) / 100;
    const expectedPartnerShare = Math.round((myTotal + partnerTotal) * (1 - incomeRatio) * 100) / 100;
    const myActualShare = Math.round(myTotal * 100) / 100;
    const partnerActualShare = Math.round(partnerTotal * 100) / 100;

    const myFairnessDelta = myActualShare - expectedMyShare;
    const fairnessScore = expectedMyShare > 0
      ? Math.max(0, Math.min(100, Math.round(
        100 - (Math.abs(myFairnessDelta) / expectedMyShare) * 100,
      )))
      : 100;

    const myCategoryMap = this.aggregateByCategory(mySpending);
    const partnerCategoryMap = this.aggregateByCategory(partnerSpending);

    const potentialSavings: { category: string; message: string; amount: number }[] = [];
    for (const [category, myAmt] of myCategoryMap) {
      const partnerAmt = partnerCategoryMap.get(category) || 0;
      if (myAmt > partnerAmt * 1.5 && myAmt > 100) {
        potentialSavings.push({
          category,
          message: `You spend ${Math.round((myAmt / (partnerAmt || 1)) * 100) / 100}x more than your partner on ${category}`,
          amount: Math.round((myAmt - partnerAmt) * 100) / 100,
        });
      }
    }

    return {
      incomeRatio: {
        mine: Math.round(incomeRatio * 10000) / 100,
        partner: Math.round((1 - incomeRatio) * 10000) / 100,
      },
      fairnessScore,
      spendingComparison: {
        mine: myActualShare,
        partner: partnerActualShare,
        expectedMine: expectedMyShare,
        expectedPartner: expectedPartnerShare,
        delta: Math.round(myFairnessDelta * 100) / 100,
      },
      insights: [
        fairnessScore >= 80
          ? 'Your spending is fairly balanced relative to income.'
          : 'Consider adjusting spending to align with income ratio.',
        myTotal < partnerTotal
          ? 'Your partner is spending more this month.'
          : 'You are spending more this month.',
        `Combined monthly spend: ${Math.round((myTotal + partnerTotal) * 100) / 100}`,
      ],
      potentialSavings: potentialSavings.sort((a, b) => b.amount - a.amount).slice(0, 5),
      sharedSavings: Number(profile.sharedSavingsCurrent || 0),
      sharedSavingsGoal: Number(profile.sharedSavingsGoal || 0),
    };
  }

  // ─── Helpers ───────────────────────────────────────

  private aggregateByCategory(transactions: { amount: number; category?: any }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const cat = typeof t.category === 'string' ? t.category : 'uncategorized';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount));
    }
    return map;
  }
}
