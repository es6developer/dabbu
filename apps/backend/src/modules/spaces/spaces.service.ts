import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const memberships = await this.prisma.spaceMember.findMany({
      where: { userId },
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
              include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
            },
            _count: { select: { transactions: true, goals: true } },
          },
        },
      },
    });
    if (!membership) throw new ForbiddenException('Not a member of this space');
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
        where: { spaceId },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      this.prisma.goal.findMany({
        where: { spaceId },
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
      money: { totalIncome, totalExpense, balance: totalIncome - totalExpense, transactionCount: transactions.length },
      goals: { total: totalGoals, saved: totalSaved, count: goals.length, items: goals },
      recentTransactions: transactions.slice(0, 5),
    };
  }

  async create(data: { name: string; type: string; icon?: string; coverColor?: string }, userId: string) {
    const validTypes = ['COUPLE', 'FAMILY', 'TRIP', 'BUSINESS', 'CUSTOM'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException('Invalid space type. Must be one of: ' + validTypes.join(', '));
    }
    const space = await this.prisma.space.create({
      data: {
        name: data.name,
        type: data.type,
        icon: data.icon,
        coverColor: data.coverColor,
        createdBy: userId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
    });
    return space;
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
    if (existing) throw new BadRequestException('User is already a member');
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
}
