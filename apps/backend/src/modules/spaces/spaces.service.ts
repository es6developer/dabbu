import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import * as crypto from 'crypto';

@Injectable()
export class SpacesService {
  private readonly logger = new Logger(SpacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async list(userId: string) {
    const lens = await this.lensData.getActiveLens(userId);
    const lensFilter = lens !== 'FULL' ? { space: { lensId: lens } } : {};
    const memberships = await this.prisma.spaceMember.findMany({
      where: { userId, ...lensFilter },
      include: {
        space: {
          include: {
            _count: { select: { members: true, transactions: true, goals: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({
      id: m.space.id,
      name: m.space.name,
      type: m.space.type,
      icon: m.space.icon,
      coverColor: m.space.coverColor,
      memberCount: m.space._count.members,
      transactionCount: m.space._count.transactions,
      goalCount: m.space._count.goals,
      role: m.role,
      createdAt: m.space.createdAt,
    }));
  }

  async getById(spaceId: string, userId: string) {
    const membership = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
      include: {
        space: {
          include: {
            members: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            _count: { select: { transactions: true, goals: true } },
          },
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this space');
    }
    const space = membership.space;
    return {
      id: space.id,
      name: space.name,
      type: space.type,
      icon: space.icon,
      coverColor: space.coverColor,
      memberCount: space.members.length,
      transactionCount: space._count.transactions,
      goalCount: space._count.goals,
      members: space.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      myRole: membership.role,
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    };
  }

  async getDashboard(spaceId: string, userId: string) {
    await this.getById(spaceId, userId);
    const [transactions, goals] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { spaceId, ...(await this.lensData.buildLensFilter(userId)) },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      this.prisma.goal.findMany({
        where: { spaceId, ...(await this.lensData.buildLensFilter(userId)) },
      }),
    ]);
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalGoals = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
    const totalSaved = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
    return {
      money: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: transactions.length,
      },
      goals: { total: totalGoals, saved: totalSaved, count: goals.length, items: goals },
      recentTransactions: transactions.slice(0, 5),
    };
  }

  async create(
    data: { name: string; type: string; icon?: string; coverColor?: string },
    userId: string,
  ) {
    const validTypes = [
      'PERSONAL',
      'COUPLE',
      'FAMILY',
      'TRIP',
      'HOME',
      'BABY',
      'WEDDING',
      'CAR',
      'EDUCATION',
      'VACATION',
      'RETIREMENT',
      'BUSINESS',
      'CUSTOM',
    ];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException('Invalid space type. Must be one of: ' + validTypes.join(', '));
    }
    const lensId = await this.lensData.getActiveLens(userId);
    const space = await this.prisma.space.create({
      data: {
        name: data.name,
        type: data.type,
        icon: data.icon,
        coverColor: data.coverColor,
        createdBy: userId,
        lensId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
    });

    if (data.type === 'FAMILY') {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      await this.prisma.family
        .create({
          data: {
            name: data.name,
            code,
            ownerId: userId,
            members: { create: { userId, role: 'owner' } },
          },
        })
        .catch((err) => {
          this.logger.warn(`Failed to create legacy Family for space ${space.id}: ${err.message}`);
        });
    }

    if (data.type === 'COUPLE') {
      await this.prisma.sharedGroup
        .create({
          data: {
            name: data.name,
            type: 'couple',
            icon: data.icon || 'heart',
            coverColor: data.coverColor || '#f7892c',
            status: 'ACTIVE',
            statusChangedAt: new Date(),
            statusChangedBy: userId,
            createdBy: userId,
            lensId,
            members: { create: { userId, role: 'admin' } },
          },
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to create legacy SharedGroup for space ${space.id}: ${err.message}`,
          );
        });
    }

    return space;
  }

  async createPersonalSpace(userId: string, firstName: string) {
    const existing = await this.prisma.space.findFirst({
      where: { createdBy: userId, type: 'PERSONAL' },
    });
    if (existing) {
      return existing;
    }
    const lensId = await this.lensData.getActiveLens(userId);
    return this.prisma.space.create({
      data: {
        name: `${firstName}'s Personal`,
        type: 'PERSONAL',
        icon: 'user',
        createdBy: userId,
        lensId,
        members: { create: { userId, role: 'owner' } },
      },
    });
  }

  async addMember(spaceId: string, userId: string, requesterId: string, role = 'member') {
    const membership = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: requesterId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owner or admin can add members');
    }
    const existing = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (existing) {
      throw new BadRequestException('User is already a member');
    }
    const member = await this.prisma.spaceMember.create({
      data: { spaceId, userId, role },
    });
    return member;
  }

  async removeMember(spaceId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      await this.prisma.spaceMember.delete({
        where: { spaceId_userId: { spaceId, userId } },
      });
      return { removed: true };
    }
    const membership = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: requesterId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owner or admin can remove members');
    }
    await this.prisma.spaceMember.delete({
      where: { spaceId_userId: { spaceId, userId } },
    });
    return { removed: true };
  }

  async update(
    spaceId: string,
    userId: string,
    data: { name?: string; icon?: string; coverColor?: string },
  ) {
    await this.getById(spaceId, userId);
    const space = await this.prisma.space.update({
      where: { id: spaceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.coverColor !== undefined && { coverColor: data.coverColor }),
      },
    });
    return space;
  }

  async deleteSpace(spaceId: string, userId: string) {
    const membership = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this space');
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owner or admin can delete a space');
    }
    await this.prisma.space.delete({ where: { id: spaceId } });
    return { deleted: true };
  }

  async activate(spaceId: string, userId: string) {
    await this.getById(spaceId, userId);
    await this.prisma.space.update({
      where: { id: spaceId },
      data: { updatedAt: new Date() },
    });
    return { activated: true };
  }

  async getTransactions(spaceId: string, userId: string) {
    await this.getById(spaceId, userId);
    return this.prisma.transaction.findMany({
      where: { spaceId, ...(await this.lensData.buildLensFilter(userId)) },
      orderBy: { date: 'desc' },
    });
  }

  async getGoals(spaceId: string, userId: string) {
    await this.getById(spaceId, userId);
    return this.prisma.goal.findMany({
      where: { spaceId, ...(await this.lensData.buildLensFilter(userId)) },
    });
  }

  async getBudgets(spaceId: string, userId: string) {
    await this.getById(spaceId, userId);
    return this.prisma.budget.findMany({
      where: { spaceId, ...(await this.lensData.buildLensFilter(userId)) },
    });
  }

  async createDefault(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });
    const name = user?.firstName ? `${user.firstName}'s Personal` : 'Personal Space';
    const existing = await this.prisma.space.findFirst({
      where: { createdBy: userId, type: 'PERSONAL' },
    });
    if (existing) {
      return existing;
    }
    const lensId = await this.lensData.getActiveLens(userId);
    return this.prisma.space.create({
      data: {
        name,
        type: 'PERSONAL',
        icon: 'user',
        createdBy: userId,
        lensId,
        members: { create: { userId, role: 'owner' } },
      },
    });
  }
}
