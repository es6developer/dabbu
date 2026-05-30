import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseGroupDto, UpdateExpenseGroupDto, AddMemberDto } from './expense-groups.dto';

const PLAN_LIMITS = {
  free: { maxGroups: 5, maxMembersPerGroup: 2 },
  premium: { maxGroups: 30, maxMembersPerGroup: 30 },
  gold: { maxGroups: 9999, maxMembersPerGroup: 9999 },
};

@Injectable()
export class ExpenseGroupsService {
  private readonly logger = new Logger(ExpenseGroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getUserPlan(
    userId: string,
  ): Promise<{ maxGroups: number; maxMembersPerGroup: number; tier: string }> {
    const [user, subscription] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: { select: { maxFamilyMembers: true, features: true, name: true } } },
      }),
    ]);

    const role = user?.role || 'user';
    if (role === 'super_admin' || role === 'admin') {
      return { ...PLAN_LIMITS.gold, tier: 'gold' };
    }

    const planName = subscription?.plan?.name?.toLowerCase() || '';
    if (planName.includes('gold')) {
      return { ...PLAN_LIMITS.gold, tier: 'gold' };
    }
    if (subscription && (subscription.plan?.maxFamilyMembers > 0 || planName.includes('premium'))) {
      return { ...PLAN_LIMITS.premium, tier: 'premium' };
    }
    return { ...PLAN_LIMITS.free, tier: 'free' };
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
    return { data: group };
  }

  async findAll(userId: string) {
    const plan = await this.getUserPlan(userId);
    const memberships = await this.prisma.expenseGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { members: true, transactions: true } },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
    const groups = memberships.map((m) => ({
      ...m.group,
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
        ...group,
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

    return { data: member };
  }

  async removeMember(id: string, userId: string, memberId: string) {
    const group = await this.findGroupOrThrow(id);
    this.validateAdmin(group, userId);

    const member = await this.prisma.expenseGroupMember.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.expenseGroupMember.delete({ where: { id: memberId } });
    return { message: 'Member removed' };
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
}
