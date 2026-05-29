import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(groupId: string, userId: string, dto: CreateIncomeDto) {
    const member = await this.validateGroupMember(groupId, userId);

    const income = await this.prisma.groupIncome.create({
      data: {
        groupId,
        addedByMemberId: member.id,
        amount: dto.amount,
        source: dto.source || 'other',
        description: dto.description,
        date: new Date(dto.date),
        notes: dto.notes,
      },
      include: {
        addedBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    this.logger.log(`Income ${income.id} created in group ${groupId}`);

    const actorName = income.addedBy?.user?.firstName || 'Someone';
    const otherMembers = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null, userId: { not: userId } },
      select: { userId: true },
    });
    const title = `${actorName} added income`;
    const body = `${income.description} — ₹${Number(income.amount).toLocaleString('en-IN')}`;
    const data = { groupId, incomeId: income.id, type: 'group_income' };

    for (const m of otherMembers) {
      await this.notificationService.sendPush(m.userId, title, body, data).catch((err) =>
        this.logger.warn(`Failed to notify user ${m.userId}: ${err.message}`),
      );
    }

    return income;
  }

  async findAll(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const incomes = await this.prisma.groupIncome.findMany({
      where: { groupId, deletedAt: null },
      include: {
        addedBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return { data: incomes };
  }

  async findOne(groupId: string, incomeId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const income = await this.prisma.groupIncome.findUnique({
      where: { id: incomeId },
      include: {
        addedBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!income || income.groupId !== groupId || income.deletedAt) {
      throw new NotFoundException('Income entry not found');
    }

    return income;
  }

  async update(groupId: string, incomeId: string, userId: string, dto: UpdateIncomeDto) {
    await this.validateGroupMember(groupId, userId);

    const income = await this.prisma.groupIncome.findUnique({
      where: { id: incomeId },
    });

    if (!income || income.groupId !== groupId || income.deletedAt) {
      throw new NotFoundException('Income entry not found');
    }

    const updated = await this.prisma.groupIncome.update({
      where: { id: incomeId },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        addedBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    this.logger.log(`Income ${incomeId} updated in group ${groupId}`);
    return updated;
  }

  async delete(groupId: string, incomeId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const income = await this.prisma.groupIncome.findUnique({
      where: { id: incomeId },
    });

    if (!income || income.groupId !== groupId || income.deletedAt) {
      throw new NotFoundException('Income entry not found');
    }

    await this.prisma.groupIncome.update({
      where: { id: incomeId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Income ${incomeId} deleted from group ${groupId}`);
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
}
