import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, SplitType } from './dto/expenses.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(groupId: string, userId: string, dto: CreateExpenseDto) {
    const member = await this.validateGroupMember(groupId, userId);

    const activeMembers = await this.getActiveMemberIds(groupId);
    let splits = dto.splits;

    if (!splits || splits.length === 0) {
      splits = activeMembers.map((m) => ({
        memberId: m.groupMemberId,
        amount: undefined,
        percentage: undefined,
        weight: undefined,
      }));
    }

    this.validateSplits(
      dto.amount,
      dto.splitType,
      splits,
      activeMembers.map((m) => m.groupMemberId),
    );
    const calculatedSplits = this.calculateSplits(dto.amount, dto.splitType, splits);

    const expense = await this.prisma.groupExpense.create({
      data: {
        groupId,
        paidByMemberId: member.id,
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        splitType: dto.splitType,
        date: new Date(dto.date),
        notes: dto.notes,
        tripDayId: dto.tripDayId,
        isRecurring: dto.isRecurring || false,
        recurringFrequency: dto.recurringFrequency,
        recurringEndDate: dto.recurringEndDate ? new Date(dto.recurringEndDate) : null,
        splits: {
          create: calculatedSplits.map((s) => ({
            memberId: s.memberId,
            amount: s.amount,
            percentage: s.percentage ?? null,
            weight: s.weight ?? null,
          })),
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
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        attachments: true,
      },
    });

    await this.recalculateBalances(groupId);
    this.logger.log(`Expense ${expense.id} created in group ${groupId}`);

    const actorName = expense.paidBy?.user?.firstName || 'Someone';
    await this.notifyGroupMembers(
      groupId,
      member.userId,
      actorName,
      expense.description,
      Number(expense.amount),
      expense.id,
    );

    return expense;
  }

  private async notifyGroupMembers(
    groupId: string,
    actorUserId: string,
    actorName: string,
    description: string,
    amount: number,
    entityId: string,
  ) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null, userId: { not: actorUserId } },
      select: { userId: true },
    });

    const title = `${actorName} added an expense`;
    const body = `${description} — ₹${amount.toLocaleString('en-IN')}`;
    const data = { groupId, expenseId: entityId, type: 'group_expense' };

    for (const m of members) {
      await this.notificationService.sendPush(m.userId, title, body, data).catch((err) =>
        this.logger.warn(`Failed to notify user ${m.userId}: ${err.message}`),
      );
    }
  }

  async findAll(
    groupId: string,
    userId: string,
    query?: {
      category?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    await this.validateGroupMember(groupId, userId);

    const where: any = { groupId, deletedAt: null };
    if (query?.category) {
      where.category = query.category;
    }
    if (query?.fromDate || query?.toDate) {
      where.date = {};
      if (query.fromDate) {
        where.date.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.date.lte = new Date(query.toDate);
      }
    }

    const [expenses, total] = await Promise.all([
      this.prisma.groupExpense.findMany({
        where,
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
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          attachments: true,
          tripDay: true,
        },
        orderBy: { date: 'desc' },
        take: query?.limit || 50,
        skip: query?.offset || 0,
      }),
      this.prisma.groupExpense.count({ where }),
    ]);

    return { data: expenses, total, limit: query?.limit || 50, offset: query?.offset || 0 };
  }

  async findOne(groupId: string, expenseId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const expense = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
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
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        tripDay: true,
      },
    });

    if (!expense || expense.groupId !== groupId || expense.deletedAt) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(groupId: string, expenseId: string, userId: string, dto: UpdateExpenseDto) {
    await this.validateGroupMember(groupId, userId);

    const existing = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
    });

    if (!existing || existing.groupId !== groupId || existing.deletedAt) {
      throw new NotFoundException('Expense not found');
    }

    const amount = dto.amount ?? Number(existing.amount);
    const splitType = dto.splitType ?? (existing.splitType as SplitType);

    if (dto.splits && dto.splits.length > 0) {
      const activeMembers = await this.getActiveMemberIds(groupId);
      this.validateSplits(
        amount,
        splitType,
        dto.splits,
        activeMembers.map((m) => m.groupMemberId),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.splits) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } });

        const activeMembers = await this.getActiveMemberIds(groupId);
        const splitsToUse =
          dto.splits.length > 0
            ? dto.splits
            : activeMembers.map((m) => ({
                memberId: m.groupMemberId,
                amount: undefined,
                percentage: undefined,
                weight: undefined,
              }));

        const calculatedSplits = this.calculateSplits(amount, splitType, splitsToUse);

        await tx.expenseSplit.createMany({
          data: calculatedSplits.map((s) => ({
            expenseId,
            memberId: s.memberId,
            amount: s.amount,
            percentage: s.percentage ?? null,
            weight: s.weight ?? null,
          })),
        });
      }

      await tx.groupExpense.update({
        where: { id: expenseId },
        data: {
          description: dto.description,
          amount: dto.amount,
          category: dto.category,
          splitType: dto.splitType,
          date: dto.date ? new Date(dto.date) : undefined,
          notes: dto.notes,
          tripDayId: dto.tripDayId,
          isRecurring: dto.isRecurring,
          recurringFrequency: dto.recurringFrequency,
          recurringEndDate: dto.recurringEndDate ? new Date(dto.recurringEndDate) : undefined,
        },
      });
    });

    await this.recalculateBalances(groupId);
    this.logger.log(`Expense ${expenseId} updated in group ${groupId}`);
    return this.findOne(groupId, expenseId, userId);
  }

  async delete(groupId: string, expenseId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const expense = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.groupId !== groupId || expense.deletedAt) {
      throw new NotFoundException('Expense not found');
    }

    await this.prisma.groupExpense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date() },
    });
    await this.recalculateBalances(groupId);
    this.logger.log(`Expense ${expenseId} deleted from group ${groupId}`);
  }

  async addComment(groupId: string, expenseId: string, userId: string, content: string) {
    await this.validateGroupMember(groupId, userId);

    const expense = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.groupId !== groupId || expense.deletedAt) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expenseComment.create({
      data: { expenseId, userId, content },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async addAttachment(
    groupId: string,
    expenseId: string,
    userId: string,
    type: string,
    url: string,
  ) {
    await this.validateGroupMember(groupId, userId);

    const expense = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.groupId !== groupId || expense.deletedAt) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expenseAttachment.create({
      data: { expenseId, type, url, uploadedBy: userId },
    });
  }

  async getCategoryAnalytics(groupId: string, userId: string, fromDate?: string, toDate?: string) {
    await this.validateGroupMember(groupId, userId);

    const where: any = { groupId, deletedAt: null };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }
      if (toDate) {
        where.date.lte = new Date(toDate);
      }
    }

    const expenses = await this.prisma.groupExpense.findMany({
      where,
      select: { category: true, amount: true },
    });

    const categoryMap = new Map<string, { total: number; count: number }>();
    for (const exp of expenses) {
      const curr = categoryMap.get(exp.category) || { total: 0, count: 0 };
      curr.total += Number(exp.amount);
      curr.count += 1;
      categoryMap.set(exp.category, curr);
    }

    const totalAmount = Array.from(categoryMap.values()).reduce((s, c) => s + c.total, 0);

    return {
      categories: Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          total: data.total,
          count: data.count,
          percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      totalAmount,
      totalExpenses: expenses.length,
    };
  }

  // ─── Split Engine ───────────────────────────────────

  private validateSplits(
    totalAmount: number,
    splitType: SplitType,
    splits: { memberId: string; amount?: number; percentage?: number; weight?: number }[],
    activeMemberIds: string[],
  ) {
    const memberIds = splits.map((s) => s.memberId);
    const uniqueIds = new Set(memberIds);

    if (uniqueIds.size !== splits.length) {
      throw new BadRequestException('Duplicate member in splits');
    }

    const invalidMembers = memberIds.filter((id) => !activeMemberIds.includes(id));
    if (invalidMembers.length > 0) {
      throw new BadRequestException(`Invalid members: ${invalidMembers.join(', ')}`);
    }

    switch (splitType) {
      case SplitType.PERCENTAGE: {
        const totalPct = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
        if (Math.abs(totalPct - 100) > 0.01) {
          throw new BadRequestException(`Percentages must sum to 100 (got ${totalPct})`);
        }
        break;
      }
      case SplitType.EXACT: {
        const totalExact = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
        if (Math.abs(totalExact - totalAmount) > 0.01) {
          throw new BadRequestException(
            `Exact amounts must sum to ${totalAmount} (got ${totalExact})`,
          );
        }
        break;
      }
      case SplitType.WEIGHTED: {
        const hasWeights = splits.every((s) => s.weight !== undefined && s.weight > 0);
        if (!hasWeights) {
          throw new BadRequestException('All weighted splits must have a positive weight');
        }
        break;
      }
      case SplitType.EQUAL:
        break;
      default:
        throw new BadRequestException(`Invalid split type: ${splitType}`);
    }
  }

  private calculateSplits(
    totalAmount: number,
    splitType: SplitType,
    splits: { memberId: string; amount?: number; percentage?: number; weight?: number }[],
  ) {
    const count = splits.length;

    switch (splitType) {
      case SplitType.EQUAL: {
        const share = Math.round((totalAmount / count) * 100) / 100;
        const remainder = Math.round((totalAmount - share * count) * 100) / 100;
        return splits.map((s, i) => ({
          memberId: s.memberId,
          amount: i === 0 ? Math.round((share + remainder) * 100) / 100 : share,
          percentage: Math.round((100 / count) * 100) / 100,
        }));
      }
      case SplitType.PERCENTAGE: {
        return splits.map((s) => ({
          memberId: s.memberId,
          amount: Math.round(((totalAmount * (s.percentage || 0)) / 100) * 100) / 100,
          percentage: s.percentage,
        }));
      }
      case SplitType.EXACT: {
        return splits.map((s) => ({
          memberId: s.memberId,
          amount: s.amount || 0,
        }));
      }
      case SplitType.WEIGHTED: {
        const totalWeight = splits.reduce((sum, s) => sum + (s.weight || 0), 0);
        return splits.map((s) => ({
          memberId: s.memberId,
          amount: Math.round(((totalAmount * (s.weight || 0)) / totalWeight) * 100) / 100,
          weight: s.weight,
        }));
      }
      default:
        throw new BadRequestException(`Unhandled split type: ${splitType}`);
    }
  }

  // ─── Balance Recalculation ──────────────────────────

  private async recalculateBalances(groupId: string) {
    const expenses = await this.prisma.groupExpense.findMany({
      where: { groupId, deletedAt: null },
      include: { splits: true },
    });

    const balanceMap = new Map<string, number>();
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
    });
    members.forEach((m) => balanceMap.set(m.userId, 0));

    for (const expense of expenses) {
      const payer = await this.prisma.groupMember.findUnique({
        where: { id: expense.paidByMemberId },
      });
      if (payer) {
        balanceMap.set(payer.userId, (balanceMap.get(payer.userId) || 0) + Number(expense.amount));
      }

      for (const split of expense.splits) {
        const splitMember = await this.prisma.groupMember.findUnique({
          where: { id: split.memberId },
        });
        if (splitMember) {
          balanceMap.set(
            splitMember.userId,
            (balanceMap.get(splitMember.userId) || 0) - Number(split.amount),
          );
        }
      }
    }

    const balances = Array.from(balanceMap.entries()).map(([userId, amount]) => ({
      userId,
      amount: Math.round(amount * 100) / 100,
    }));

    return balances;
  }

  async getBalances(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);
    const balances = await this.recalculateBalances(groupId);

    const memberIds = balances.map((b) => b.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return balances.map((b) => ({
      ...b,
      user: userMap.get(b.userId) || null,
    }));
  }

  // ─── Helpers ───────────────────────────────────────

  private async validateGroupMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (member && member.isActive && !member.deletedAt) {
      return member;
    }
    const tempMember = await this.prisma.groupMemberTemp.findUnique({
      where: { groupId_tempUserId: { groupId, tempUserId: userId } },
    });
    if (!tempMember || !tempMember.isActive) {
      throw new ForbiddenException('Not a group member');
    }
    return tempMember;
  }

  private async getActiveMemberIds(
    groupId: string,
  ): Promise<{ userId: string; groupMemberId: string }[]> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      select: { id: true, userId: true },
    });
    return members.map((m) => ({ userId: m.userId, groupMemberId: m.id }));
  }
}
