import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateContributionRuleDto, UpdateContributionRuleDto, ContributionRuleType,
} from './dto/contributions.dto';

interface FairnessSuggestion {
  userId: string;
  userName: string;
  currentShare: number;
  suggestedShare: number;
  difference: number;
  reason: string;
}

@Injectable()
export class ContributionsService {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRule(groupId: string, userId: string, dto: CreateContributionRuleDto) {
    await this.validateGroupMember(groupId, userId);
    await this.validateAdmin(groupId, userId);

    const rule = await this.prisma.contributionRule.create({
      data: {
        groupId,
        name: dto.name,
        type: dto.type,
        values: JSON.parse(JSON.stringify(dto.values)),
      },
    });

    this.logger.log(`Contribution rule ${rule.id} created in group ${groupId}`);
    return rule;
  }

  async listRules(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    return this.prisma.contributionRule.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(groupId: string, ruleId: string, userId: string, dto: UpdateContributionRuleDto) {
    await this.validateGroupMember(groupId, userId);
    await this.validateAdmin(groupId, userId);

    const rule = await this.prisma.contributionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.groupId !== groupId || rule.deletedAt) {
      throw new NotFoundException('Contribution rule not found');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.values !== undefined) data.values = dto.values;
    if (dto.isActive !== undefined) data.isActive = dto.isActive === 'true';

    return this.prisma.contributionRule.update({
      where: { id: ruleId },
      data,
    });
  }

  async deleteRule(groupId: string, ruleId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);
    await this.validateAdmin(groupId, userId);

    const rule = await this.prisma.contributionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.groupId !== groupId || rule.deletedAt) {
      throw new NotFoundException('Contribution rule not found');
    }

    await this.prisma.contributionRule.update({
      where: { id: ruleId },
      data: { deletedAt: new Date(), isActive: false },
    });

    this.logger.log(`Contribution rule ${ruleId} deleted from group ${groupId}`);
  }

  async getSalaryProfiles(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const profiles = await this.prisma.salaryProfile.findMany({
      where: { groupId, isActive: true },
    });

    const userIds = profiles.map((p) => p.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return profiles.map((p) => ({
      ...p,
      salary: Number(p.salary),
      user: userMap.get(p.userId) || null,
    }));
  }

  async calculateContributions(
    groupId: string,
    userId: string,
    ruleId: string,
    totalAmount?: number,
  ) {
    await this.validateGroupMember(groupId, userId);

    const rule = await this.prisma.contributionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.groupId !== groupId || rule.deletedAt || !rule.isActive) {
      throw new NotFoundException('Contribution rule not found or inactive');
    }

    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    const valuesMap = new Map(
      (rule.values as Array<{ userId: string; value: number }>).map((v) => [v.userId, v.value]),
    );

    switch (rule.type) {
      case ContributionRuleType.EQUAL:
        return this.calculateEqual(members, totalAmount);

      case ContributionRuleType.PERCENTAGE:
        return this.calculatePercentage(members, totalAmount, valuesMap);

      case ContributionRuleType.SALARY_RATIO:
        return this.calculateSalaryRatio(groupId, members, totalAmount);

      case ContributionRuleType.FIXED:
        return this.calculateFixed(members, valuesMap);

      default:
        throw new BadRequestException(`Unsupported rule type: ${rule.type}`);
    }
  }

  async applyRule(
    groupId: string,
    userId: string,
    ruleId: string,
    description?: string,
    category?: string,
    date?: string,
  ) {
    await this.validateGroupMember(groupId, userId);
    await this.validateAdmin(groupId, userId);

    const rule = await this.prisma.contributionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.groupId !== groupId || rule.deletedAt || !rule.isActive) {
      throw new NotFoundException('Contribution rule not found or inactive');
    }

    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
    });

    const values = rule.values as Array<{ userId: string; value: number }>;
    const valuesMap = new Map(values.map((v) => [v.userId, v.value]));

    const admin = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!admin) {
      throw new ForbiddenException('Not a group member');
    }

    const expenses: any[] = [];

    for (const member of members) {
      let amount = 0;

      switch (rule.type) {
        case 'equal':
          continue;
        case 'fixed':
          amount = valuesMap.get(member.userId) || 0;
          break;
        case 'salary_ratio': {
          const salaries = await this.getSalaries(groupId);
          const totalSalary = salaries.reduce((s, p) => s + p.salary, 0);
          const ratio = totalSalary > 0 ? (salaries.find((s) => s.userId === member.userId)?.salary || 0) / totalSalary : 0;
          amount = ratio > 0 ? this.roundTo(10000 * ratio) : 0;
          break;
        }
        case 'percentage':
          amount = valuesMap.get(member.userId) || 0;
          break;
      }

      if (amount > 0) {
        const expense = await this.prisma.groupExpense.create({
          data: {
            groupId,
            paidByMemberId: admin.id,
            description: description || `Contribution: ${rule.name}`,
            amount,
            category: category || 'contribution',
            splitType: 'exact',
            date: date ? new Date(date) : new Date(),
            splits: {
              create: {
                memberId: member.id,
                amount,
              },
            },
          },
          include: {
            paidBy: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            splits: {
              include: {
                member: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        });
        expenses.push(expense);
      }
    }

    this.logger.log(`Applied rule ${ruleId} to group ${groupId}: ${expenses.length} expenses created`);
    return expenses;
  }

  async fairnessEngine(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        paidExpenses: {
          where: { deletedAt: null },
          select: { amount: true, date: true },
        },
        expenseSplits: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
    });

    const salaries = await this.getSalaries(groupId);
    const salaryMap = new Map(salaries.map((s) => [s.userId, s.salary]));
    const totalSalary = salaries.reduce((s, p) => s + p.salary, 0);

    const totalPaid = members.reduce((s, m) => {
      return s + m.paidExpenses.reduce((p, e) => p + Number(e.amount), 0);
    }, 0);

    const suggestions: FairnessSuggestion[] = [];

    for (const member of members) {
      const paid = member.paidExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const owed = member.expenseSplits.reduce((s, e) => s + Number(e.amount), 0);
      const currentShare = totalPaid > 0 ? (paid / totalPaid) * 100 : 0;
      const salary = salaryMap.get(member.userId) || 0;
      const expectedShare = totalSalary > 0 ? (salary / totalSalary) * 100 : 0;
      const userName = `${member.user.firstName} ${member.user.lastName}`.trim();

      if (salary > 0 && expectedShare > 0) {
        const difference = currentShare - expectedShare;
        if (Math.abs(difference) > 5) {
          suggestions.push({
            userId: member.userId,
            userName,
            currentShare: Math.round(currentShare * 100) / 100,
            suggestedShare: Math.round(expectedShare * 100) / 100,
            difference: Math.round(difference * 100) / 100,
            reason: difference > 0
              ? `${userName} is paying ${Math.abs(Math.round(difference))}% more than their income share`
              : `${userName} is paying ${Math.abs(Math.round(difference))}% less than their income share`,
          });
        }
      }

      const hasRecurring = member.paidExpenses.filter(
        (e) => e.date > new Date(new Date().setMonth(new Date().getMonth() - 3)),
      ).length > 5;

      if (hasRecurring && currentShare > 60) {
        suggestions.push({
          userId: member.userId,
          userName,
          currentShare: Math.round(currentShare * 100) / 100,
          suggestedShare: Math.round(Math.min(currentShare, 50) * 100) / 100,
          difference: Math.round((currentShare - Math.min(currentShare, 50)) * 100) / 100,
          reason: `${userName} bears most recurring expenses, consider redistributing`,
        });
      }
    }

    const notSet = members.filter((m) => !salaryMap.has(m.userId));
    for (const member of notSet) {
      const userName = `${member.user.firstName} ${member.user.lastName}`.trim();
      suggestions.push({
        userId: member.userId,
        userName,
        currentShare: 0,
        suggestedShare: 0,
        difference: 0,
        reason: `${userName} has not set a salary profile`,
      });
    }

    return {
      suggestions,
      summary: {
        totalMembers: members.length,
        profilesSet: salaries.length,
        profilesMissing: members.length - salaries.length,
        suggestedChanges: suggestions.length,
      },
    };
  }

  private calculateEqual(members: any[], totalAmount?: number) {
    const count = members.length;
    const share = totalAmount ? this.roundTo(totalAmount / count) : 0;
    return members.map((m) => ({
      userId: m.user.id,
      userName: `${m.user.firstName} ${m.user.lastName}`.trim(),
      amount: share,
      percentage: this.roundTo(100 / count),
      type: 'equal',
    }));
  }

  private calculatePercentage(members: any[], totalAmount: number | undefined, valuesMap: Map<string, number>) {
    return members.map((m) => {
      const pct = valuesMap.get(m.user.id) || 0;
      const amount = totalAmount ? this.roundTo(totalAmount * pct / 100) : 0;
      return {
        userId: m.user.id,
        userName: `${m.user.firstName} ${m.user.lastName}`.trim(),
        amount,
        percentage: pct,
        type: 'percentage',
      };
    });
  }

  private async calculateSalaryRatio(groupId: string, members: any[], totalAmount?: number) {
    const salaries = await this.getSalaries(groupId);
    const salaryMap = new Map(salaries.map((s) => [s.userId, s.salary]));
    const totalSalary = salaries.reduce((s, p) => s + p.salary, 0);

    return members.map((m) => {
      const salary = salaryMap.get(m.user.id) || 0;
      const ratio = totalSalary > 0 ? salary / totalSalary : 0;
      const amount = totalAmount ? this.roundTo(totalAmount * ratio) : 0;
      return {
        userId: m.user.id,
        userName: `${m.user.firstName} ${m.user.lastName}`.trim(),
        amount,
        percentage: this.roundTo(ratio * 100),
        salary,
        type: 'salary_ratio',
      };
    });
  }

  private calculateFixed(members: any[], valuesMap: Map<string, number>) {
    return members.map((m) => {
      const amount = valuesMap.get(m.user.id) || 0;
      return {
        userId: m.user.id,
        userName: `${m.user.firstName} ${m.user.lastName}`.trim(),
        amount,
        percentage: 0,
        type: 'fixed',
      };
    });
  }

  private async getSalaries(groupId: string) {
    const profiles = await this.prisma.salaryProfile.findMany({
      where: { groupId, isActive: true },
      select: { userId: true, salary: true },
    });
    return profiles.map((p) => ({ userId: p.userId, salary: Number(p.salary) }));
  }

  private roundTo(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  private async validateGroupMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive || member.deletedAt) {
      throw new ForbiddenException('Not a group member');
    }
    return member;
  }

  private async validateAdmin(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive || member.deletedAt) {
      throw new ForbiddenException('Not a group member');
    }
    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
