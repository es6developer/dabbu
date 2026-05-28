import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSettlementDto, UpdateSettlementDto, SettlementStatus } from './dto/expenses.dto';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    return this.prisma.settlement.findMany({
      where: { groupId, deletedAt: null },
      include: {
        fromMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        toMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(groupId: string, userId: string, dto: CreateSettlementDto) {
    await this.validateGroupMember(groupId, userId);

    const fromMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: dto.fromMemberId } },
    });
    if (!fromMember || !fromMember.isActive || fromMember.deletedAt) {
      throw new BadRequestException('fromMemberId is not a group member');
    }

    const toMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: dto.toMemberId } },
    });
    if (!toMember || !toMember.isActive || toMember.deletedAt) {
      throw new BadRequestException('toMemberId is not a group member');
    }

    if (dto.fromMemberId === dto.toMemberId) {
      throw new BadRequestException('Cannot settle with yourself');
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        groupId,
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: dto.amount,
        method: dto.method || 'cash',
        note: dto.note,
        status: SettlementStatus.PENDING,
      },
      include: {
        fromMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        toMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    this.logger.log(`Settlement ${settlement.id} created in group ${groupId}`);
    return settlement;
  }

  async updateStatus(groupId: string, settlementId: string, userId: string, dto: UpdateSettlementDto) {
    await this.validateGroupMember(groupId, userId);

    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement || settlement.groupId !== groupId || settlement.deletedAt) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Settlement is already completed');
    }

    if (dto.status === SettlementStatus.COMPLETED) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.settlement.update({
          where: { id: settlementId },
          data: {
            status: SettlementStatus.COMPLETED,
            completedAt: new Date(),
          },
          include: {
            fromMember: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            toMember: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        });

        await tx.expenseSplit.updateMany({
          where: {
            memberId: settlement.fromMemberId,
            expense: {
              groupId,
              paidByMemberId: settlement.toMemberId,
            },
          },
          data: { isSettled: true, settledAt: new Date() },
        });

        this.logger.log(`Settlement ${settlementId} completed in group ${groupId}`);
        return updated;
      });
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: { status: dto.status },
      include: {
        fromMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        toMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return updated;
  }

  async getOptimizedDebts(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const expenses = await this.prisma.groupExpense.findMany({
      where: { groupId, deletedAt: null },
      include: { splits: true, paidBy: true },
    });

    const netBalance = new Map<string, number>();
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
    });
    members.forEach((m) => netBalance.set(m.userId, 0));

    for (const expense of expenses) {
      const payer = expense.paidBy;
      netBalance.set(payer.userId, (netBalance.get(payer.userId) || 0) + Number(expense.amount));

      for (const split of expense.splits) {
        const splitMember = members.find((m) => m.id === split.memberId);
        if (splitMember) {
          netBalance.set(splitMember.userId, (netBalance.get(splitMember.userId) || 0) - Number(split.amount));
        }
      }
    }

    const existingSettlements = await this.prisma.settlement.findMany({
      where: { groupId, status: { in: ['pending', 'completed'] }, deletedAt: null },
      include: { fromMember: true, toMember: true },
    });

    for (const settlement of existingSettlements) {
      if (settlement.status === 'completed') {
        if (netBalance.has(settlement.fromMember.userId)) {
          netBalance.set(settlement.fromMember.userId, netBalance.get(settlement.fromMember.userId)! - Number(settlement.amount));
        }
        if (netBalance.has(settlement.toMember.userId)) {
          netBalance.set(settlement.toMember.userId, netBalance.get(settlement.toMember.userId)! + Number(settlement.amount));
        }
      }
    }

    return Array.from(netBalance.entries())
      .map(([memberId, amount]) => ({ memberId, amount: Math.round(amount * 100) / 100 }))
      .filter((b) => Math.abs(b.amount) > 0.01);
  }

  async getSimplifiedSettlements(groupId: string, userId: string) {
    const balances = await this.getOptimizedDebts(groupId, userId);

    const creditors: { memberId: string; amount: number }[] = [];
    const debtors: { memberId: string; amount: number }[] = [];

    for (const b of balances) {
      if (b.amount > 0) creditors.push(b);
      else if (b.amount < 0) debtors.push({ memberId: b.memberId, amount: -b.amount });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];
    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];
      const amount = Math.min(creditor.amount, debtor.amount);
      const roundedAmount = Math.round(amount * 100) / 100;

      if (roundedAmount > 0) {
        transactions.push({ from: debtor.memberId, to: creditor.memberId, amount: roundedAmount });
      }

      creditor.amount -= roundedAmount;
      debtor.amount -= roundedAmount;

      if (creditor.amount < 0.01) ci++;
      if (debtor.amount < 0.01) di++;
    }

    const memberIds = [...new Set(transactions.flatMap((t) => [t.from, t.to]))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      transactions: transactions.map((t) => ({
        ...t,
        fromUser: userMap.get(t.from) || null,
        toUser: userMap.get(t.to) || null,
      })),
      totalOutstanding: transactions.reduce((s, t) => s + t.amount, 0),
      transactionCount: transactions.length,
    };
  }

  async getSettlementHistory(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    return this.prisma.settlement.findMany({
      where: { groupId, deletedAt: null },
      include: {
        fromMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        toMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  // ─── Helpers ───────────────────────────────────────

  private async validateGroupMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive || member.deletedAt) {
      throw new ForbiddenException('Not a group member');
    }
    return member;
  }
}
