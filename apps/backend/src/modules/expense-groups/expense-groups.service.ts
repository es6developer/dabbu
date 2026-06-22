import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { CreateExpenseGroupDto, UpdateExpenseGroupDto, AddMemberDto } from './expense-groups.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/create-notification.dto';

const PLAN_LIMITS = {
  free: { maxGroups: 5, maxMembersPerGroup: 2 },
  premium: { maxGroups: 30, maxMembersPerGroup: 30 },
  gold: { maxGroups: 9999, maxMembersPerGroup: 9999 },
};

@Injectable()
export class ExpenseGroupsService {
  private readonly logger = new Logger(ExpenseGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getUserPlan(
    userId: string,
  ): Promise<{ maxGroups: number; maxMembersPerGroup: number; tier: string }> {
    const [user, subscription] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: { select: { features: true, name: true, code: true } } },
      }),
    ]);

    const role = user?.role || 'user';
    if (role === 'super_admin' || role === 'admin') {
      return { ...PLAN_LIMITS.gold, tier: 'gold' };
    }

    const isActive =
      subscription?.status === 'active' &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > new Date();

    if (!isActive) {
      return { ...PLAN_LIMITS.free, tier: 'free' };
    }

    const isGold =
      subscription?.plan?.name?.toLowerCase().includes('gold') ||
      subscription?.plan?.code === 'GOLD';
    if (isGold) {
      return { ...PLAN_LIMITS.gold, tier: 'gold' };
    }

    const isPremium = subscription?.plan?.code !== 'FREE';
    if (isPremium) {
      return { ...PLAN_LIMITS.premium, tier: 'premium' };
    }
    return { ...PLAN_LIMITS.free, tier: 'free' };
  }

  private addExpiryInfo(group: any) {
    const createdAt = group.createdAt ? new Date(group.createdAt) : new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    return {
      ...group,
      expiresAt: expiresAt.toISOString(),
      isExpired: new Date() > expiresAt,
    };
  }

  async create(userId: string, dto: CreateExpenseGroupDto) {
    const plan = await this.getUserPlan(userId);

    const groupCount = await this.prisma.expenseGroup.count({
      where: { createdBy: userId },
    });
    if (groupCount >= plan.maxGroups) {
      throw new BadRequestException(
        `Free plan limit of ${plan.maxGroups} groups reached. Upgrade to Premium for up to ${PLAN_LIMITS.premium.maxGroups} groups or Gold for unlimited.`,
      );
    }

    const data: any = {
      name: dto.name,
      description: dto.description || null,
      icon: dto.icon || 'users',
      currency: dto.currency || 'INR',
      monthlyBudget: dto.monthlyBudget || null,
      createdBy: userId,
      members: {
        create: [{ userId, role: 'admin' }],
      },
    };

    if (dto.memberEmails?.length) {
      const users = await this.prisma.user.findMany({
        where: { email: { in: dto.memberEmails }, isActive: true },
      });
      for (const u of users) {
        if (u.id !== userId) {
          const currentMembers = data.members.create.length;
          if (currentMembers >= plan.maxMembersPerGroup) {
            throw new BadRequestException(
              `Free plan allows max ${plan.maxMembersPerGroup} members per group. Upgrade to Premium for up to ${PLAN_LIMITS.premium.maxMembersPerGroup} members or Gold for unlimited.`,
            );
          }
          data.members.create.push({ userId: u.id, role: 'member' });
        }
      }
    }

    if (dto.memberPhones?.length) {
      const users = await this.prisma.user.findMany({
        where: { phone: { in: dto.memberPhones }, isActive: true },
      });
      for (const u of users) {
        if (u.id !== userId) {
          const currentMembers = data.members.create.length;
          if (currentMembers >= plan.maxMembersPerGroup) {
            throw new BadRequestException(
              `Free plan allows max ${plan.maxMembersPerGroup} members per group. Upgrade to Premium for up to ${PLAN_LIMITS.premium.maxMembersPerGroup} members or Gold for unlimited.`,
            );
          }
          data.members.create.push({ userId: u.id, role: 'member' });
        }
      }
    }

    const group = await this.prisma.expenseGroup.create({
      data,
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

    this.logger.log(`Expense group created: ${group.name}`);
    return { data: this.addExpiryInfo(group) };
  }

  async findAll(userId: string) {
    const plan = await this.getUserPlan(userId);
    const memberships = await this.prisma.expenseGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
            _count: { select: { members: true, transactions: true } },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
    const groups = memberships.map((m) => ({
      ...this.addExpiryInfo(m.group),
      _plan: {
        tier: plan.tier,
        maxGroups: plan.maxGroups,
        maxMembersPerGroup: plan.maxMembersPerGroup,
      },
    }));
    return { data: groups };
  }

  async findDashboard(userId: string) {
    const plan = await this.getUserPlan(userId);
    const memberships = await this.prisma.expenseGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
            _count: { select: { members: true, transactions: true } },
            transactions: {
              take: 5,
              orderBy: { date: 'desc' },
              select: {
                id: true,
                amount: true,
                description: true,
                date: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    const groups = memberships.map((m) => ({
      ...this.addExpiryInfo(m.group),
      _plan: {
        tier: plan.tier,
        maxGroups: plan.maxGroups,
        maxMembersPerGroup: plan.maxMembersPerGroup,
      },
    }));

    return { data: groups };
  }

  async findOne(id: string, userId: string) {
    const plan = await this.getUserPlan(userId);
    const group = await this.prisma.expenseGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
            },
          },
        },
        _count: { select: { transactions: true } },
      },
    });
    if (!group) {
      throw new NotFoundException('Expense group not found');
    }
    this.validateMember(group, userId);
    return {
      data: {
        ...this.addExpiryInfo(group),
        _plan: {
          tier: plan.tier,
          maxGroups: plan.maxGroups,
          maxMembersPerGroup: plan.maxMembersPerGroup,
        },
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateExpenseGroupDto) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    const updated = await this.prisma.expenseGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.monthlyBudget !== undefined && { monthlyBudget: dto.monthlyBudget }),
      },
    });

    return { data: updated };
  }

  async remove(id: string, userId: string) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    await this.prisma.expenseGroup.delete({ where: { id } });
    this.logger.log(`Expense group deleted: ${id}`);
    return { message: 'Expense group deleted' };
  }

  async addMember(id: string, userId: string, dto: AddMemberDto) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    const plan = await this.getUserPlan(userId);

    const memberCount = await this.prisma.expenseGroupMember.count({ where: { groupId: id } });
    if (memberCount >= plan.maxMembersPerGroup) {
      throw new BadRequestException(
        `Plan allows max ${plan.maxMembersPerGroup} members per group. Upgrade to Premium for up to ${PLAN_LIMITS.premium.maxMembersPerGroup} members or Gold for unlimited.`,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    const existing = await this.prisma.expenseGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const member = await this.prisma.expenseGroupMember.create({
      data: { groupId: id, userId: user.id, role: 'member' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    await this.notifyMemberAdded(userId, user.id, group.name, id).catch((error) => {
      this.logger.warn(`Failed to notify added group member: ${error.message}`);
    });

    return { data: member };
  }

  async addMemberByUserId(id: string, adminId: string, targetUserId: string) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, adminId);

    const plan = await this.getUserPlan(adminId);

    const memberCount = await this.prisma.expenseGroupMember.count({ where: { groupId: id } });
    if (memberCount >= plan.maxMembersPerGroup) {
      throw new BadRequestException(
        `Plan allows max ${plan.maxMembersPerGroup} members per group. Upgrade to Premium for up to ${PLAN_LIMITS.premium.maxMembersPerGroup} members or Gold for unlimited.`,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.expenseGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const member = await this.prisma.expenseGroupMember.create({
      data: { groupId: id, userId: user.id, role: 'member' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    await this.notifyMemberAdded(adminId, user.id, group.name, id).catch((error) => {
      this.logger.warn(`Failed to notify added group member: ${error.message}`);
    });

    return { data: member };
  }

  async addMemberByPhone(id: string, userId: string, phone: string) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    const plan = await this.getUserPlan(userId);

    const memberCount = await this.prisma.expenseGroupMember.count({ where: { groupId: id } });
    if (memberCount >= plan.maxMembersPerGroup) {
      throw new BadRequestException(
        `Plan allows max ${plan.maxMembersPerGroup} members per group. Upgrade to Premium for up to ${PLAN_LIMITS.premium.maxMembersPerGroup} members or Gold for unlimited.`,
      );
    }

    const digits = phone.replace(/\D/g, '').slice(-10);
    const user = await this.prisma.user.findFirst({
      where: { phone: { endsWith: digits }, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('User not found with this phone number');
    }

    const existing = await this.prisma.expenseGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const member = await this.prisma.expenseGroupMember.create({
      data: { groupId: id, userId: user.id, role: 'member' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    await this.notifyMemberAdded(userId, user.id, group.name, id).catch((error) => {
      this.logger.warn(`Failed to notify added group member: ${error.message}`);
    });

    return { data: member };
  }

  async removeMember(id: string, userId: string, memberId: string, deleteTransactions?: boolean) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    const member = await this.prisma.expenseGroupMember.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (deleteTransactions) {
      await this.prisma.transaction.updateMany({
        where: { expenseGroupId: id, userId: member.userId, ...(await this.lensData.buildLensFilter(member.userId)) },
        data: { deletedAt: new Date() },
      });
    }

    await this.prisma.expenseGroupMember.delete({ where: { id: memberId } });
    return { message: 'Member removed' };
  }

  async updateMemberRole(id: string, userId: string, memberId: string, role: 'admin' | 'member') {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    const member = await this.prisma.expenseGroupMember.findFirst({
      where: { id: memberId, groupId: id },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.userId === group.createdBy && role !== 'admin') {
      throw new BadRequestException('Group owner must remain an admin');
    }

    const updated = await this.prisma.expenseGroupMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });
    return { data: updated };
  }

  async leave(id: string, userId: string, deleteTransactions?: boolean) {
    const group = await this.findGroupOrThrow(id);
    const member = group.members?.find((m: any) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }
    if (group.createdBy === userId) {
      throw new BadRequestException('Transfer ownership before leaving this group');
    }

    if (deleteTransactions) {
      await this.prisma.transaction.updateMany({
        where: { expenseGroupId: id, userId, ...(await this.lensData.buildLensFilter(userId)) },
        data: { deletedAt: new Date() },
      });
    }

    await this.prisma.expenseGroupMember.delete({ where: { id: member.id } });
    return { message: 'Left expense group' };
  }

  private async findGroupOrThrow(id: string) {
    const group = await this.prisma.expenseGroup.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!group) {
      throw new NotFoundException('Expense group not found');
    }
    return group;
  }

  private validateMember(group: any, userId: string) {
    const isMember = group.members?.some((m: any) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this group');
    }
  }

  private validateAdmin(group: any, userId: string) {
    const member = group.members?.find((m: any) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }
    if (member.role !== 'admin') {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  private async notifyMemberAdded(
    actorUserId: string,
    addedUserId: string,
    groupName: string,
    groupId: string,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { firstName: true, lastName: true, email: true },
    });
    const actorName =
      `${actor?.firstName || ''} ${actor?.lastName || ''}`.trim() || actor?.email || 'Someone';

    await this.notificationService.create({
      userId: addedUserId,
      type: NotificationType.GROUP_ADD,
      title: 'Added to a group',
      body: `${actorName} added you to ${groupName}`,
      data: {
        groupId,
        actorUserId,
        screen: 'GroupExpenses',
      },
    });
  }
}
