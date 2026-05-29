import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, UpdateMemberRoleDto, SalaryProfileDto, AddMemberByEmailDto } from './groups.dto';
import * as crypto from 'crypto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGroupDto) {
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const group = await this.prisma.sharedFinanceGroup.create({
      data: {
        name: dto.name,
        type: dto.type || 'friends',
        description: dto.description,
        currency: dto.currency || 'INR',
        maxMembers: dto.maxMembers || 20,
        inviteCode,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
            },
          },
        },
      },
    });

    this.logger.log(`Shared finance group created: ${group.name} by user ${userId}`);
    return { data: group };
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const groups = memberships.map((m) => m.group);
    return { data: groups };
  }

  async findOne(groupId: string, userId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, phone: true },
            },
          },
        },
        tempMembers: {
          where: { isActive: true },
          include: {
            tempUser: {
              select: { id: true, email: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group.deletedAt) throw new NotFoundException('Group not found');
    await this.validateMember(group.id, userId);

    const balances = await this.calculateBalances(group.id);

    return { data: { ...group, balances } };
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateAdmin(group.id, userId);

    const updated = await this.prisma.sharedFinanceGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.maxMembers !== undefined && { maxMembers: dto.maxMembers }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
      },
    });

    return { data: updated };
  }

  async remove(groupId: string, userId: string) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateAdmin(group.id, userId);

    await this.prisma.sharedFinanceGroup.update({
      where: { id: groupId },
      data: { deletedAt: new Date(), status: 'archived' },
    });

    this.logger.log(`Group archived: ${groupId}`);
    return { message: 'Group archived' };
  }

  async generateInviteCode(groupId: string, userId: string) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateAdmin(group.id, userId);

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    await this.prisma.sharedFinanceGroup.update({
      where: { id: groupId },
      data: { inviteCode },
    });

    return { data: { inviteCode } };
  }

  async joinByCode(userId: string, groupId: string, inviteCode: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group || group.deletedAt) throw new NotFoundException('Group not found');
    if (group.status !== 'active') throw new BadRequestException('Group is no longer active');
    if (group.inviteCode !== inviteCode) throw new BadRequestException('Invalid invite code');

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      if (existingMember.deletedAt) {
        const updated = await this.prisma.groupMember.update({
          where: { id: existingMember.id },
          data: { deletedAt: null, isActive: true, leftAt: null },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
          },
        });
        this.logger.log(`User re-joined group ${group.name}`);
        return { data: updated };
      }
      throw new ConflictException('Already a member of this group');
    }

    if (group._count.members >= group.maxMembers) {
      throw new BadRequestException('Group member limit reached');
    }

    const member = await this.prisma.groupMember.create({
      data: { groupId, userId, role: 'member' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
    });

    this.logger.log(`User joined group ${group.name} via invite code`);
    return { data: member };
  }

  async leave(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) throw new NotFoundException('Not a member of this group');
    if (member.role === 'owner') {
      throw new BadRequestException('Transfer ownership before leaving');
    }

    await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { isActive: false, leftAt: new Date(), deletedAt: new Date() },
    });

    return { message: 'Left the group' };
  }

  async removeMember(groupId: string, userId: string, memberId: string) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateAdmin(group.id, userId);

    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') throw new BadRequestException('Cannot remove the owner');

    await this.prisma.groupMember.update({
      where: { id: memberId },
      data: { isActive: false, leftAt: new Date(), deletedAt: new Date() },
    });

    this.logger.log(`Member ${memberId} removed from group ${groupId}`);
    return { message: 'Member removed' };
  }

  async updateMemberRole(groupId: string, userId: string, memberId: string, dto: UpdateMemberRoleDto) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateAdmin(group.id, userId);

    const requester = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!requester || requester.role !== 'owner') {
      throw new ForbiddenException('Only the owner can change roles');
    }

    const target = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new BadRequestException('Cannot change the owner role');

    const updated = await this.prisma.groupMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return { data: updated };
  }

  async getDashboard(groupId: string, userId: string) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateMember(group.id, userId);

    const [expenses, balances, memberCount, recentSettlements] = await Promise.all([
      this.prisma.groupExpense.findMany({
        where: { groupId, deletedAt: null },
        include: {
          paidBy: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
          splits: {
            include: {
              member: {
                include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.calculateBalances(groupId),
      this.prisma.groupMember.count({ where: { groupId, isActive: true, deletedAt: null } }),
      this.prisma.settlement.findMany({
        where: { groupId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          fromMember: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
          toMember: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
        },
      }),
    ]);

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(e.amount);
    });

    const monthlyTrend: Record<string, number> = {};
    expenses.forEach((e) => {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] = (monthlyTrend[key] || 0) + Number(e.amount);
    });

    const pendingSettlements = balances.filter((b) => b.netBalance !== 0);

    return {
      data: {
        summary: {
          totalSpent,
          totalExpenses: expenses.length,
          memberCount,
          currency: group.currency,
        },
        categoryBreakdown: Object.entries(categoryBreakdown)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        monthlyTrend: Object.entries(monthlyTrend)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, amount]) => ({ month, amount })),
        memberBalances: balances,
        pendingSettlements: pendingSettlements.map((b) => ({
          memberId: b.memberId,
          name: b.name,
          avatarUrl: b.avatarUrl,
          netBalance: b.netBalance,
        })),
        recentSettlements,
      },
    };
  }

  async upsertSalaryProfile(userId: string, groupId: string, dto: SalaryProfileDto) {
    await this.validateMember(groupId, userId);

    const profile = await this.prisma.salaryProfile.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: {
        userId,
        groupId,
        salary: dto.salary,
        currency: dto.currency || 'INR',
      },
      update: {
        salary: dto.salary,
        currency: dto.currency || 'INR',
      },
    });

    return { data: profile };
  }

  async getSalaryProfiles(groupId: string, userId: string) {
    await this.validateMember(groupId, userId);

    const profiles = await this.prisma.salaryProfile.findMany({
      where: { groupId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return { data: profiles };
  }

  private async calculateBalances(groupId: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        paidExpenses: {
          where: { deletedAt: null },
          select: { amount: true },
        },
        expenseSplits: {
          where: { deletedAt: null },
          select: { amount: true, isSettled: true },
        },
        sentSettlements: {
          where: { status: 'completed', deletedAt: null },
          select: { amount: true },
        },
        receivedSettlements: {
          where: { status: 'completed', deletedAt: null },
          select: { amount: true },
        },
      },
    });

    return members.map((m) => {
      const totalPaid = m.paidExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const totalOwed = m.expenseSplits.reduce((s, e) => s + Number(e.amount), 0);
      const sentSettlements = m.sentSettlements.reduce((s, e) => s + Number(e.amount), 0);
      const receivedSettlements = m.receivedSettlements.reduce((s, e) => s + Number(e.amount), 0);

      const netBalance = totalPaid - totalOwed - sentSettlements + receivedSettlements;

      return {
        memberId: m.id,
        userId: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        avatarUrl: m.user.avatarUrl,
        totalPaid,
        totalOwed,
        netBalance,
      };
    });
  }

  async addMemberByEmail(groupId: string, requesterId: string, dto: AddMemberByEmailDto) {
    const group = await this.findGroupOrThrow(groupId);
    await this.validateAdmin(group.id, requesterId);

    let tempUser = await this.prisma.tempUser.findFirst({
      where: { email: dto.email, isActive: true },
    });

    if (!tempUser) {
      tempUser = await this.prisma.tempUser.create({
        data: {
          email: dto.email,
          displayName: dto.displayName ?? dto.email.split('@')[0],
          loginMethod: 'email_otp',
          sessionCount: 0,
          lastActiveAt: new Date(),
        },
      });
    }

    const existingMember = await this.prisma.groupMemberTemp.findFirst({
      where: { groupId, tempUserId: tempUser.id, isActive: true },
    });

    if (existingMember) {
      throw new ConflictException('This email is already a member of the group');
    }

    await this.prisma.groupMemberTemp.create({
      data: {
        groupId,
        tempUserId: tempUser.id,
        role: 'member',
        canAddExpenses: true,
        canSettle: true,
        canChat: true,
        canUploadBills: true,
        nickname: dto.displayName ?? dto.email.split('@')[0],
      },
    });

    await this.prisma.tempUser.update({
      where: { id: tempUser.id },
      data: { groupCount: { increment: 1 } },
    });

    this.logger.log(`Member added by email ${dto.email} to group ${group.name}`);

    return {
      data: {
        id: tempUser.id,
        email: tempUser.email,
        displayName: tempUser.displayName,
        role: 'member',
      },
    };
  }

  private async findGroupOrThrow(groupId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
    });
    if (!group || group.deletedAt) throw new NotFoundException('Group not found');
    return group;
  }

  private async validateMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || member.deletedAt || !member.isActive) {
      throw new ForbiddenException('Not a member of this group');
    }
  }

  private async validateAdmin(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || member.deletedAt || !member.isActive) {
      throw new ForbiddenException('Not a member of this group');
    }
    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
