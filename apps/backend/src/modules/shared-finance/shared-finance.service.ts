import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

const PLAN_LIMITS = {
  free: { maxGroups: 3, maxMembersPerGroup: 10 },
  premium: { maxGroups: 100, maxMembersPerGroup: 100 },
  gold: { maxGroups: 9999, maxMembersPerGroup: 9999 },
};
import { SettlementEngine } from './engines/settlement.engine';
import { AiInsightsEngine } from './engines/ai-insights.engine';
import { GroupLifecycleService } from './engines/group-lifecycle.service';
import { AccessRevocationEngine } from './engines/access-revocation.engine';
import { TripCostForecastEngine } from './engines/trip-forecast.engine';
import { DuplicateDetectionEngine } from './engines/duplicate-detection.engine';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
import { Server } from 'socket.io';
import {
  CreateGroupDto,
  UpdateGroupDto,
  InviteMemberDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  CreateCoupleProfileDto,
  UpdateSalaryProfileDto,
  CreateTripDto,
  AddTripExpenseDto,
  CreateHouseholdBillDto,
  CreateContributionRuleDto,
  CreateSharedGoalDto,
  SendMessageDto,
  CreateWalletDto,
  ContributeToWalletDto,
  SpendFromWalletDto,
  TransferWalletDto,
  CreateAdvanceContributionDto,
  ContributeToAdvanceDto,
  RequestApprovalDto,
  ApproveExpenseDto,
  UploadDocumentDto,
  UpdateDocumentPermissionDto,
  CreateCalendarEventDto,
  CreateSplitTemplateDto,
  CreateFromTemplateDto,
  UploadCreditCardBillDto,
  CreateCashPoolDto,
  CashPoolTransactionDto,
  CreateEmergencyFundDto,
  ContributeToEmergencyFundDto,
  WithdrawFromEmergencyFundDto,
  CreateNetWorthSnapshotDto,
  ExportDataDto,
  TripForecastDto,
  CreateCoupleIncomeDto,
  CoupleSavingsContributeDto,
  UpdateGroupSettingsDto,
} from './dto/shared-finance.dto';

@Injectable()
export class SharedFinanceService {
  private readonly logger = new Logger(SharedFinanceService.name);

  private socketServer: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementEngine: SettlementEngine,
    private readonly aiInsightsEngine: AiInsightsEngine,
    private readonly lifecycleService: GroupLifecycleService,
    private readonly revocationEngine: AccessRevocationEngine,
    private readonly tripForecastEngine: TripCostForecastEngine,
    private readonly duplicateEngine: DuplicateDetectionEngine,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  setSocketServer(server: Server) {
    this.socketServer = server;
  }

  // ─── Group Management ──────────────────────────────────────

  private async getUserPlan(
    userId: string,
  ): Promise<{ maxGroups: number; maxMembersPerGroup: number; tier: string }> {
    const [user, subscription] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: { select: { name: true, code: true } } },
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

  async createGroup(userId: string, dto: CreateGroupDto) {
    const plan = await this.getUserPlan(userId);
    const groupCount = await this.prisma.sharedGroupMember.count({
      where: { userId, isActive: true, role: 'admin' },
    });
    if (groupCount >= plan.maxGroups) {
      throw new BadRequestException(
        `Free plan limit of ${plan.maxGroups} shared spaces reached. Upgrade to Premium for unlimited spaces.`,
      );
    }

    const group = await this.prisma.sharedGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || 'friends',
        icon: dto.icon || 'people',
        coverColor: dto.coverColor || '#f7892c',
        currency: dto.currency || 'INR',
        monthlyBudget: dto.monthlyBudget,
        monthlyIncome: dto.monthlyIncome,
        status: 'ACTIVE',
        statusChangedAt: new Date(),
        statusChangedBy: userId,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'admin',
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

    if (dto.upiId) {
      await this.prisma.user
        .update({
          where: { id: userId },
          data: { upiId: dto.upiId },
        })
        .catch(() => {});
    }

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId: group.id,
        eventType: 'created',
        toStatus: 'ACTIVE',
        triggeredBy: userId,
        metadata: { name: group.name, type: group.type },
      },
    });

    return group;
  }

  async getGroup(groupId: string, userId: string) {
    const { readable, reason } = await this.lifecycleService.getAccessibleGroupData(
      groupId,
      userId,
    );
    if (!readable) {
      throw new ForbiddenException(reason || 'Access denied');
    }

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                status: true,
              },
            },
          },
        },
        trip: true,
        coupleProfile: {
          include: {
            partner1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            partner2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        contributionRules: {
          where: { isActive: true },
        },
        _count: {
          select: {
            expenses: true,
            settlements: true,
            groupMessages: true,
            sharedGoals: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async getUserGroups(userId: string) {
    const plan = await this.getUserPlan(userId);
    let memberships = await this.prisma.sharedGroupMember.findMany({
      where: { userId, isActive: true },
      include: {
        group: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
            _count: {
              select: { members: true, expenses: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const hasCoupleGroup = memberships.some((m) => m.group.type === 'couple');
    if (!hasCoupleGroup) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.isCouple && user?.partnerId) {
        try {
          const partner = await this.prisma.user.findUnique({
            where: { id: user.partnerId },
            select: { firstName: true },
          });
          const group = await this.createGroup(userId, {
            name: `${user.firstName || 'You'} & ${partner?.firstName || 'Partner'}'s Space`,
            type: 'couple',
            currency: 'INR',
          });
          await this.prisma.sharedGroupMember.create({
            data: { groupId: group.id, userId: user.partnerId, role: 'member', isActive: true },
          });
          await this.prisma.coupleFinanceProfile.upsert({
            where: { groupId: group.id },
            create: { groupId: group.id, partner1Id: userId, partner2Id: user.partnerId },
            update: {},
          });
          memberships = await this.prisma.sharedGroupMember.findMany({
            where: { userId, isActive: true },
            include: {
              group: {
                include: {
                  members: {
                    where: { isActive: true },
                    include: {
                      user: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                      },
                    },
                  },
                  _count: {
                    select: { members: true, expenses: true },
                  },
                },
              },
            },
            orderBy: { joinedAt: 'desc' },
          });
        } catch (err) {
          this.logger.warn(`Failed to auto-create couple group for user ${userId}: ${err}`);
        }
      }
    }

    return memberships.map((m) => ({
      ...m.group,
      role: m.role,
      nickname: m.nickname,
      joinedAt: m.joinedAt,
      totalSpent: Number(m.group.totalSpent || 0),
      monthlyBudget: Number(m.group.monthlyBudget || 0),
      monthlyIncome: Number(m.group.monthlyIncome || 0),
      aiTip: getGroupAiTip(m.group.type, m.group._count.expenses, m.group._count.members),
      _plan: {
        tier: plan.tier,
        maxGroups: plan.maxGroups,
        maxMembersPerGroup: plan.maxMembersPerGroup,
      },
    }));
  }

  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.verifyAdmin(groupId, userId);

    const group = await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.coverColor !== undefined && { coverColor: dto.coverColor }),
        ...(dto.monthlyBudget !== undefined && { monthlyBudget: dto.monthlyBudget }),
        ...(dto.monthlyIncome !== undefined && { monthlyIncome: dto.monthlyIncome }),
      },
    });

    return group;
  }

  async deleteGroup(groupId: string, userId: string) {
    await this.verifyAdmin(groupId, userId);

    await this.prisma.sharedGroup.delete({ where: { id: groupId } });

    return { message: 'Group deleted successfully' };
  }

  async addMember(groupId: string, targetUserId: string, adminId: string) {
    await this.verifyAdmin(groupId, adminId);

    const existing = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (existing) {
      throw new BadRequestException('User is already a member');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupInfo = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { type: true },
    });
    if (groupInfo?.type === 'couple') {
      const memberCount = await this.prisma.sharedGroupMember.count({
        where: { groupId, isActive: true },
      });
      if (memberCount >= 2) {
        throw new BadRequestException('Couple space can only have 2 members');
      }
    }

    const member = await this.prisma.sharedGroupMember.create({
      data: { groupId, userId: targetUserId, role: 'member' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: { totalSpent: undefined },
    });

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    const memberName = user.firstName || user.email;
    this.notificationService
      .sendPush(targetUserId, 'Added to Group', `You were added to "${group?.name || 'a group'}"`, {
        type: 'member_added',
        groupId,
      })
      .catch((err) => this.logger.error(`Push failed for added member: ${err.message}`));

    this.notificationService
      .sendPush(
        adminId,
        'Member Added',
        `${memberName} was added to "${group?.name || 'a group'}"`,
        {
          type: 'member_added',
          groupId,
        },
      )
      .catch((err) => this.logger.error(`Push failed for admin: ${err.message}`));

    // Auto-create CoupleFinanceProfile when 2nd member joins a couple group
    if (groupInfo?.type === 'couple') {
      const existingProfile = await this.prisma.coupleFinanceProfile.findUnique({
        where: { groupId },
      });
      if (!existingProfile) {
        const members = await this.prisma.sharedGroupMember.findMany({
          where: { groupId, isActive: true },
          select: { userId: true },
          orderBy: { joinedAt: 'asc' },
        });
        await this.prisma.coupleFinanceProfile.create({
          data: {
            groupId,
            partner1Id: members[0].userId,
            partner2Id: members[1].userId,
            splitRatio: '50:50',
            contributionType: 'equal',
          },
        });
      }
    }

    return member;
  }

  async addMemberByEmail(
    groupId: string,
    email: string,
    role: string | undefined,
    adminId: string,
  ) {
    await this.verifyAdmin(groupId, adminId);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(`No user found with email ${email}. They need to sign up first.`);
    }

    const existing = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) {
      throw new BadRequestException(`${email} is already a member`);
    }

    const groupInfo = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { type: true },
    });
    if (groupInfo?.type === 'couple') {
      const memberCount = await this.prisma.sharedGroupMember.count({
        where: { groupId, isActive: true },
      });
      if (memberCount >= 2) {
        throw new BadRequestException('Couple space can only have 2 members');
      }
    }

    const member = await this.prisma.sharedGroupMember.create({
      data: { groupId, userId: user.id, role: role || 'member' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: { totalSpent: undefined },
    });

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    const memberName = user.firstName || user.email;
    this.notificationService
      .sendPush(user.id, 'Added to Group', `You were added to "${group?.name || 'a group'}"`, {
        type: 'member_added',
        groupId,
      })
      .catch((err) => this.logger.error(`Push failed for added member: ${err.message}`));

    this.notificationService
      .sendPush(
        adminId,
        'Member Added',
        `${memberName} was added to "${group?.name || 'a group'}"`,
        {
          type: 'member_added',
          groupId,
        },
      )
      .catch((err) => this.logger.error(`Push failed for admin: ${err.message}`));

    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'An admin'
      : 'An admin';
    this.emailService
      .sendGroupInviteEmail(user.email, memberName, group?.name || 'a group', inviterName)
      .catch((err) => this.logger.error(`Failed to send group invite email: ${err.message}`));

    // Auto-create CoupleFinanceProfile when 2nd member joins a couple group
    if (groupInfo?.type === 'couple') {
      const existingProfile = await this.prisma.coupleFinanceProfile.findUnique({
        where: { groupId },
      });
      if (!existingProfile) {
        const members = await this.prisma.sharedGroupMember.findMany({
          where: { groupId, isActive: true },
          select: { userId: true },
          orderBy: { joinedAt: 'asc' },
        });
        await this.prisma.coupleFinanceProfile.create({
          data: {
            groupId,
            partner1Id: members[0].userId,
            partner2Id: members[1].userId,
            splitRatio: '50:50',
            contributionType: 'equal',
          },
        });
      }
    }

    return member;
  }

  async addMemberByPhone(
    groupId: string,
    phone: string,
    role: string | undefined,
    adminId: string,
  ) {
    await this.verifyAdmin(groupId, adminId);

    const digits = phone.replace(/\D/g, '').slice(-10);
    const user = await this.prisma.user.findFirst({
      where: {
        phone: { endsWith: digits },
        isActive: true,
        status: 'active',
      },
    });
    if (!user) {
      throw new NotFoundException(`No user found with phone ${phone}. They need to sign up first.`);
    }

    const existing = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) {
      throw new BadRequestException(`User with phone ${phone} is already a member`);
    }

    const groupInfo = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { type: true },
    });
    if (groupInfo?.type === 'couple') {
      const memberCount = await this.prisma.sharedGroupMember.count({
        where: { groupId, isActive: true },
      });
      if (memberCount >= 2) {
        throw new BadRequestException('Couple space can only have 2 members');
      }
    }

    const member = await this.prisma.sharedGroupMember.create({
      data: { groupId, userId: user.id, role: role || 'member' },
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

    await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: { totalSpent: undefined },
    });

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    const memberName = user.firstName || user.phone || user.email;
    this.notificationService
      .sendPush(user.id, 'Added to Group', `You were added to "${group?.name || 'a group'}"`, {
        type: 'member_added',
        groupId,
      })
      .catch((err) => this.logger.error(`Push failed for added member: ${err.message}`));

    this.notificationService
      .sendPush(
        adminId,
        'Member Added',
        `${memberName} was added to "${group?.name || 'a group'}"`,
        {
          type: 'member_added',
          groupId,
        },
      )
      .catch((err) => this.logger.error(`Push failed for admin: ${err.message}`));

    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'An admin'
      : 'An admin';
    this.emailService
      .sendGroupInviteEmail(user.email, memberName, group?.name || 'a group', inviterName)
      .catch((err) => this.logger.error(`Failed to send group invite email: ${err.message}`));

    if (groupInfo?.type === 'couple') {
      const existingProfile = await this.prisma.coupleFinanceProfile.findUnique({
        where: { groupId },
      });
      if (!existingProfile) {
        const members = await this.prisma.sharedGroupMember.findMany({
          where: { groupId, isActive: true },
          select: { userId: true },
          orderBy: { joinedAt: 'asc' },
        });
        await this.prisma.coupleFinanceProfile.create({
          data: {
            groupId,
            partner1Id: members[0].userId,
            partner2Id: members[1].userId,
            splitRatio: '50:50',
            contributionType: 'equal',
          },
        });
      }
    }

    return member;
  }

  async removeMember(groupId: string, memberId: string, adminId: string) {
    await this.verifyAdmin(groupId, adminId);

    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.groupId !== groupId) {
      throw new BadRequestException('Member not in this group');
    }
    if (member.role === 'admin') {
      throw new BadRequestException('Cannot remove an admin. Demote first.');
    }

    // Check if the member has outstanding balance
    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: { splits: true },
    });
    const allMembers = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    const balances = this.settlementEngine.calculateBalances(expenses, allMembers);
    const memberBalance = balances.find((b) => b.userId === member.userId);
    const hasOutstandingBalance = memberBalance && Math.abs(memberBalance.balance) > 0.01;

    // Deactivate member (soft delete)
    await this.prisma.sharedGroupMember.update({
      where: { id: memberId },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: adminId,
        removalReason: 'Removed by admin',
      },
    });

    // Revoke access (sessions, invites, sockets)
    const revocationResult = await this.revocationEngine.revokeMemberAccess(
      groupId,
      member.userId,
      adminId,
      `Removed from group by admin`,
      this.socketServer || undefined,
    );

    // Log the removal
    await this.prisma.memberRemovalLog.create({
      data: {
        groupId,
        memberId: member.userId,
        removedBy: adminId,
        reason: 'Removed by admin',
        hadOutstandingBalance: hasOutstandingBalance || false,
        balanceAtRemoval: hasOutstandingBalance ? Math.abs(memberBalance!.balance) : undefined,
        invalidationToken: revocationResult.invalidationToken,
      },
    });

    // Log lifecycle event
    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'member_removed',
        triggeredBy: adminId,
        metadata: {
          removedUserId: member.userId,
          removedUserEmail: member.user.email,
          hadOutstandingBalance: hasOutstandingBalance,
          sessionsTerminated: revocationResult.sessionsTerminated,
        },
      },
    });

    this.logger.warn(
      `Member ${member.user.email} (${member.userId}) removed from group ${groupId} by admin ${adminId}. ` +
        `Balance outstanding: ${hasOutstandingBalance}. Sessions invalidated: ${revocationResult.sessionsTerminated}`,
    );

    const [groupInfo, adminUser] = await Promise.all([
      this.prisma.sharedGroup.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: adminId },
        select: { firstName: true, lastName: true },
      }),
    ]);
    const adminName =
      [adminUser?.firstName, adminUser?.lastName].filter(Boolean).join(' ') || 'An admin';
    this.notificationService
      .sendPush(
        member.userId,
        'Removed from Group',
        `You were removed from "${groupInfo?.name || 'a group'}" by ${adminName}`,
        { type: 'group_remove', groupId },
      )
      .catch((err) => this.logger.error(`Push failed for member removal: ${err.message}`));

    return {
      message: 'Member removed successfully. Access revoked.',
      sessionsTerminated: revocationResult.sessionsTerminated,
      hadOutstandingBalance: hasOutstandingBalance || false,
    };
  }

  async leaveGroup(groupId: string, userId: string) {
    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new NotFoundException('You are not a member of this group');
    }

    const adminCount = await this.prisma.sharedGroupMember.count({
      where: { groupId, role: 'admin', isActive: true },
    });

    if (member.role === 'admin' && adminCount <= 1) {
      throw new BadRequestException('You are the only admin. Transfer ownership before leaving.');
    }

    // Soft deactivate instead of hard delete
    await this.prisma.sharedGroupMember.update({
      where: { id: member.id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removalReason: 'Member left voluntarily',
      },
    });

    // Leave the socket room
    if (this.socketServer) {
      this.socketServer.to(`user:${userId}`).emit('leftGroup', {
        groupId,
        message: 'You have left the group.',
      });
    }

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'member_left',
        triggeredBy: userId,
        metadata: { userId, leftAt: new Date().toISOString() },
      },
    });

    const [groupInfo, leaverUser] = await Promise.all([
      this.prisma.sharedGroup.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
    ]);
    const leaverName =
      [leaverUser?.firstName, leaverUser?.lastName].filter(Boolean).join(' ') || 'A member';
    const admins = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, role: 'admin', isActive: true, userId: { not: userId } },
      select: { userId: true },
    });
    for (const admin of admins) {
      this.notificationService
        .sendPush(
          admin.userId,
          'Member Left',
          `${leaverName} left "${groupInfo?.name || 'a group'}"`,
          { type: 'group_leave', groupId },
        )
        .catch((err) => this.logger.error(`Push failed for member leave: ${err.message}`));
    }

    return { message: 'Left group successfully' };
  }

  async getGroupMembers(groupId: string) {
    return this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(groupId: string, memberId: string, userId: string, role: string) {
    await this.verifyAdmin(groupId, userId);

    const member = await this.prisma.sharedGroupMember.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.groupId !== groupId) {
      throw new BadRequestException('Member not in this group');
    }
    if (!['admin', 'member', 'viewer'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be admin, member, or viewer');
    }

    const updated = await this.prisma.sharedGroupMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    if (this.socketServer) {
      this.socketServer.to(`group:${groupId}`).emit('memberRoleUpdated', {
        memberId,
        userId: member.userId,
        role,
      });
    }

    return updated;
  }

  async inviteMember(groupId: string, invitedByUserId: string, dto: InviteMemberDto) {
    await this.verifyAdmin(groupId, invitedByUserId);
    await this.lifecycleService.assertCanInvite(groupId);

    const existingInvite = await this.prisma.groupInvite.findFirst({
      where: { groupId, email: dto.email, status: 'active', expiresAt: { gte: new Date() } },
    });
    if (existingInvite) {
      throw new BadRequestException('Active invite already exists for this email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    const invite = await this.prisma.groupInvite.create({
      data: {
        groupId,
        email: dto.email,
        invitedBy: invitedByUserId,
        token,
        expiresAt,
        status: 'active',
      },
      include: {
        group: { select: { name: true } },
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await this.notificationService
      .sendPush(
        invitedByUserId,
        'Invite Sent',
        `Invite link created for ${dto.email} to join "${invite.group.name}"`,
        { type: 'group_invite', groupId },
      )
      .catch(() => {});

    return invite;
  }

  async validateInvite(token: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            icon: true,
            type: true,
            description: true,
            currency: true,
            createdAt: true,
            totalSpent: true,
            _count: { select: { members: true } },
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite token');
    }
    if (invite.status !== 'active') {
      const reason =
        invite.status === 'revoked'
          ? 'This invite has been revoked by the group admin.'
          : invite.status === 'expired'
            ? 'This invite has expired.'
            : 'This invite is no longer valid.';
      throw new BadRequestException(reason);
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.groupInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Invite has expired');
    }

    return invite;
  }

  async joinViaInvite(token: string, userId: string) {
    const invite = await this.validateInvite(token);

    const existingMember = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId } },
    });
    if (existingMember) {
      return { message: 'Already a member', group: invite.group };
    }

    await this.prisma.sharedGroupMember.create({
      data: { groupId: invite.group.id, userId },
    });

    await this.prisma.groupInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), status: 'used' },
    });

    const [newMember, inviterUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({ where: { id: invite.invitedBy }, select: { id: true } }),
    ]);
    if (inviterUser) {
      const memberName = newMember
        ? `${newMember.firstName || ''} ${newMember.lastName || ''}`.trim()
        : 'Someone';
      await this.notificationService
        .sendPush(inviterUser.id, 'Member Joined', `${memberName} joined "${invite.group.name}"`, {
          type: 'member_joined',
          groupId: invite.group.id,
        })
        .catch(() => {});
    }

    return { message: 'Joined group successfully', group: invite.group };
  }

  // ─── Expense Management ────────────────────────────────────

  async createExpense(groupId: string, userId: string, dto: CreateExpenseDto) {
    await this.lifecycleService.assertCanAddExpense(groupId);

    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive) {
      throw new ForbiddenException('Not a group member');
    }

    const splitData = dto.splits || (await this.buildEqualSplits(groupId, dto.amount, dto.paidBy));
    const totalSplit = splitData.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalSplit - dto.amount) > 0.01) {
      throw new BadRequestException('Split amounts must equal the total expense amount');
    }

    const expense = await this.prisma.sharedExpense.create({
      data: {
        groupId,
        description: dto.description,
        amount: dto.amount,
        paidBy: dto.paidBy,
        category: dto.category || 'Other',
        date: dto.date ? new Date(dto.date) : new Date(),
        splitType: dto.splitType || 'equal',
        notes: dto.notes,
        splits: {
          create: splitData.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage || null,
            shares: s.shares || null,
          })),
        },
      },
      include: {
        splits: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        payer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await this.updateGroupTotalSpent(groupId);

    return expense;
  }

  async getGroupExpenses(groupId: string) {
    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: {
        splits: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        payer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return expenses;
  }

  async getExpense(expenseId: string) {
    const expense = await this.prisma.sharedExpense.findUnique({
      where: { id: expenseId },
      include: {
        splits: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        payer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        comments: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async updateExpense(expenseId: string, userId: string, dto: UpdateExpenseDto) {
    const expense = await this.prisma.sharedExpense.findUnique({
      where: { id: expenseId },
      select: { id: true, paidBy: true, groupId: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    if (expense.paidBy !== userId) {
      throw new ForbiddenException('Only the payer can edit this expense');
    }

    await this.lifecycleService.assertCanAddExpense(expense.groupId);

    const updated = await this.prisma.sharedExpense.update({
      where: { id: expenseId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        splits: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        payer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.updateGroupTotalSpent(expense.groupId);

    return updated;
  }

  async deleteExpense(expenseId: string, userId: string) {
    const expense = await this.prisma.sharedExpense.findUnique({
      where: { id: expenseId },
      select: { id: true, paidBy: true, groupId: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    if (expense.paidBy !== userId) {
      throw new ForbiddenException('Only the payer can delete this expense');
    }

    await this.lifecycleService.assertCanAddExpense(expense.groupId);

    await this.prisma.sharedExpense.delete({ where: { id: expenseId } });
    await this.updateGroupTotalSpent(expense.groupId);

    return { message: 'Expense deleted successfully' };
  }

  async getBalances(groupId: string) {
    const [expenses, members] = await Promise.all([
      this.prisma.sharedExpense.findMany({
        where: { groupId },
        include: {
          splits: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          payer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.sharedGroupMember.findMany({
        where: { groupId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return this.settlementEngine.calculateBalances(expenses, members);
  }

  // ─── Settlement Engine ─────────────────────────────────────

  async getSettlementPlan(groupId: string) {
    const balances = await this.getBalances(groupId);
    return this.settlementEngine.calculateOptimizedSettlements(balances);
  }

  async createSettlement(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    method?: string,
  ) {
    await this.lifecycleService.assertCanSettle(groupId);

    const fromMember = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: fromUserId } },
    });
    if (!fromMember || !fromMember.isActive) {
      throw new ForbiddenException('Debtor is not an active member');
    }

    const toMember = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: toUserId } },
    });
    if (!toMember || !toMember.isActive) {
      throw new ForbiddenException('Creditor is not an active member');
    }

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    const settlement = await this.prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount,
        method: method || 'cash',
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const fromName = `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim();
    this.notificationService
      .sendPush(
        toUserId,
        'Settlement Requested',
        `${fromName} requested ₹${amount.toLocaleString('en-IN')} from you in ${group?.name || 'a group'}`,
        { type: 'settlement_request', settlementId: settlement.id, groupId },
      )
      .catch((err) => this.logger.error(`Push failed for settlement request: ${err.message}`));

    return settlement;
  }

  async completeSettlement(settlementId: string, userId: string, method?: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        group: { select: { id: true, name: true, createdBy: true } },
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
      throw new ForbiddenException('Only involved parties can complete this settlement');
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'completed',
        settledAt: new Date(),
        ...(method ? { method } : {}),
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const amount = Number(settlement.amount);
    const fromName = `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim();
    const toName = `${settlement.toUser.firstName} ${settlement.toUser.lastName}`.trim();

    try {
      await this.notificationService.create({
        userId: settlement.group.createdBy,
        type: 'settlement_complete' as any,
        title: 'Settlement Completed',
        message: `${fromName} settled ₹${amount.toLocaleString('en-IN')} with ${toName} in ${settlement.group.name}`,
        data: {
          groupId: settlement.group.id,
          groupName: settlement.group.name,
          amount,
          paidBy: fromName,
          paidTo: toName,
        },
        priority: 'high',
      });

      const otherPartyId =
        settlement.fromUserId === userId ? settlement.toUserId : settlement.fromUserId;
      if (otherPartyId !== settlement.group.createdBy) {
        await this.notificationService.create({
          userId: otherPartyId,
          type: 'settlement_complete' as any,
          title: 'Settlement Completed',
          message: `₹${amount.toLocaleString('en-IN')} settled in ${settlement.group.name}`,
          data: {
            groupId: settlement.group.id,
            groupName: settlement.group.name,
            amount,
            paidBy: fromName,
            paidTo: toName,
          },
          priority: 'high',
        });
      }
    } catch (e) {
      this.logger.warn('Failed to send settlement notification', e);
    }

    return updated;
  }

  async getSettlementHistory(groupId: string) {
    const settlements = await this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        toUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements;
  }

  // ─── Couple Finance ────────────────────────────────────────

  async createCoupleProfile(
    groupId: string,
    partner1Id: string,
    partner2Id: string,
    dto: CreateCoupleProfileDto,
  ) {
    const existing = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
    });
    if (existing) {
      throw new BadRequestException('Couple profile already exists for this group');
    }

    const profile = await this.prisma.coupleFinanceProfile.create({
      data: {
        groupId,
        partner1Id,
        partner2Id,
        splitRatio: dto.splitRatio || '50:50',
        contributionType: dto.contributionType || 'equal',
        sharedBudget: dto.sharedBudget,
        savingsGoal: dto.savingsGoal,
      },
      include: {
        partner1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        partner2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
    });

    return profile;
  }

  async getCoupleDashboard(groupId: string) {
    let profile = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
            salaryProfile: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
            salaryProfile: true,
          },
        },
      },
    });

    if (!profile) {
      const members = await this.prisma.sharedGroupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
        orderBy: { joinedAt: 'asc' },
      });
      if (members.length >= 2) {
        profile = await this.prisma.coupleFinanceProfile.create({
          data: {
            groupId,
            partner1Id: members[0].userId,
            partner2Id: members[1].userId,
            splitRatio: '50:50',
            contributionType: 'equal',
          },
          include: {
            partner1: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                salaryProfile: true,
              },
            },
            partner2: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                salaryProfile: true,
              },
            },
          },
        });
      } else {
        throw new NotFoundException('Couple profile not found');
      }
    }

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: { splits: true },
      orderBy: { date: 'desc' },
    });

    const balances = this.settlementEngine.calculateBalances(expenses, [
      { userId: profile.partner1Id, user: profile.partner1 },
      { userId: profile.partner2Id, user: profile.partner2 },
    ]);

    const monthlyOverview = this.aiInsightsEngine.getMonthlyComparison(expenses);

    let salarySuggestion: any = null;
    if (profile.partner1.salaryProfile && profile.partner2.salaryProfile) {
      salarySuggestion = this.calculateRecommendedSplit(
        Number(profile.partner1.salaryProfile.salary),
        Number(profile.partner2.salaryProfile.salary),
      );
    }

    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthlySpending = expenses
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((s, e) => s + Number(e.amount), 0);

    const [bills, goals] = await Promise.all([
      this.prisma.householdBill.findMany({
        where: { groupId },
        include: { contributions: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.sharedGoal.findMany({
        where: { groupId },
        include: { contributions: true },
      }),
    ]);

    const upcomingBills = bills
      .filter((b) => !b.paidAt)
      .map((b) => ({
        id: b.id,
        type: b.type,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        paidBy: b.paidBy,
        period: b.period,
      }));

    const goalsWithProgress = goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount),
      deadline: g.deadline,
      category: g.category,
      progress:
        Number(g.targetAmount) > 0
          ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100)
          : 0,
    }));

    const partner1Paid = expenses
      .filter((e) => e.paidBy === profile.partner1Id)
      .reduce((s, e) => s + Number(e.amount), 0);
    const partner2Paid = expenses
      .filter((e) => e.paidBy === profile.partner2Id)
      .reduce((s, e) => s + Number(e.amount), 0);

    const insights: string[] = [];
    if (monthlyOverview) {
      const { totalChangePercent, currentMonthTotal, lastMonthTotal } = monthlyOverview;
      if (lastMonthTotal > 0) {
        if (totalChangePercent < 0) {
          insights.push(
            `You spent ${Math.abs(totalChangePercent).toFixed(0)}% less than last month.`,
          );
        } else if (totalChangePercent > 0) {
          insights.push(
            `Your spending increased by ${totalChangePercent.toFixed(0)}% compared to last month.`,
          );
        }
      }
      const topChanged = (monthlyOverview.categoryChanges || [])
        .filter((c) => c.current > 0)
        .sort((a, b) => b.change - a.change)[0];
      if (topChanged) {
        insights.push(
          `Your ${topChanged.category.toLowerCase()} spending ${topChanged.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(topChanged.change).toFixed(0)}%.`,
        );
      }
    }

    const onTrackGoal = goalsWithProgress.find((g) => g.progress >= 50);
    if (onTrackGoal) {
      insights.push(`You are on track for your ${onTrackGoal.name} goal.`);
    }

    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalSaved = goals.reduce((s, g) => s + Number(g.savedAmount), 0);

    if (totalSpent > 0 && monthlyOverview) {
      const pct =
        monthlyOverview.lastMonthTotal > 0
          ? ((totalSpent - monthlyOverview.lastMonthTotal) / monthlyOverview.lastMonthTotal) * 100
          : 0;
      if (pct < -5) {
        insights.push('Great job keeping spending down this month!');
      }
    }

    return {
      profile,
      balances,
      monthlyOverview,
      salarySuggestion,
      sharedBudget: {
        budget: Number(profile.sharedBudget || 0),
        spent: monthlySpending,
        remaining: Number(profile.sharedBudget || 0) - monthlySpending,
      },
      savingsProgress: profile.savingsGoal
        ? {
            goal: Number(profile.savingsGoal),
            saved: totalSaved,
            percentage:
              Number(profile.savingsGoal) > 0
                ? Math.round((totalSaved / Number(profile.savingsGoal)) * 100)
                : 0,
          }
        : null,
      upcomingBills,
      goals: goalsWithProgress,
      partnerStats: {
        partner1: { userId: profile.partner1Id, totalPaid: partner1Paid },
        partner2: { userId: profile.partner2Id, totalPaid: partner2Paid },
      },
      insights,
    };
  }

  async getFamilyDashboard(groupId: string) {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const [expenses, members, goals, bills] = await Promise.all([
      this.prisma.sharedExpense.findMany({
        where: { groupId },
        include: {
          splits: true,
          payer: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.sharedGroupMember.findMany({
        where: { groupId, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.sharedGoal.findMany({
        where: { groupId },
        include: { contributions: true },
      }),
      this.prisma.householdBill.findMany({
        where: { groupId },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySpending = expenses
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((s, e) => s + Number(e.amount), 0);

    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalSaved = goals.reduce((s, g) => s + Number(g.savedAmount), 0);

    const categoryBreakdown = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryBreakdown.set(cat, (categoryBreakdown.get(cat) || 0) + Number(exp.amount));
    }

    const memberStats = members.map((m) => ({
      userId: m.userId,
      name: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      totalPaid: expenses
        .filter((e) => e.paidBy === m.userId)
        .reduce((s, e) => s + Number(e.amount), 0),
      expenseCount: expenses.filter((e) => e.paidBy === m.userId).length,
    }));

    const upcomingBills = bills
      .filter((b) => !b.paidAt)
      .map((b) => ({
        id: b.id,
        type: b.type,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        period: b.period,
      }));

    const goalsWithProgress = goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount),
      deadline: g.deadline,
      category: g.category,
      progress:
        Number(g.targetAmount) > 0
          ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100)
          : 0,
    }));

    const ownerCount = members.filter((m) => m.role === 'admin').length;
    const adminCount = members.filter((m) => m.role === 'admin').length;
    const memberCount = members.filter((m) => m.role === 'member').length;
    const viewerCount = members.filter((m) => m.role === 'viewer').length;

    return {
      summary: {
        totalSpent,
        monthlySpending,
        monthlyBudget: Number(group.monthlyBudget || 0),
        budgetRemaining: Number(group.monthlyBudget || 0) - monthlySpending,
        totalExpenses: expenses.length,
        memberCount: members.length,
      },
      memberStats,
      roleCounts: {
        owner: ownerCount,
        admin: adminCount,
        member: memberCount,
        viewer: viewerCount,
      },
      goals: goalsWithProgress,
      goalsTotalSaved: totalSaved,
      upcomingBills,
      categoryBreakdown: Array.from(categoryBreakdown.entries()).map(([cat, total]) => ({
        category: cat,
        total,
        percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
      })),
      recentExpenses: expenses.slice(0, 5),
    };
  }

  async sendCoupleInvite(senderId: string, receiverEmail: string) {
    const receiver = await this.prisma.user.findUnique({
      where: { email: receiverEmail },
    });
    if (!receiver) {
      throw new NotFoundException('User not found with this email');
    }

    if (senderId === receiver.id) {
      throw new BadRequestException('Cannot send invite to yourself');
    }

    const existingSenderProfile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { OR: [{ partner1Id: senderId }, { partner2Id: senderId }] },
    });
    if (existingSenderProfile) {
      throw new BadRequestException('You already have a couple profile');
    }

    const existingReceiverProfile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { OR: [{ partner1Id: receiver.id }, { partner2Id: receiver.id }] },
    });
    if (existingReceiverProfile) {
      throw new BadRequestException('This user already has a couple profile');
    }

    const existing = await this.prisma.coupleFinanceInvite.findUnique({
      where: { senderId_receiverId: { senderId, receiverId: receiver.id } },
    });
    if (existing && existing.status === 'pending') {
      throw new BadRequestException('Active invite already sent to this user');
    }

    const invite = await this.prisma.coupleFinanceInvite.create({
      data: {
        senderId,
        receiverId: receiver.id,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return invite;
  }

  async acceptCoupleInvite(inviteId: string, groupId: string, userId: string) {
    const invite = await this.prisma.coupleFinanceInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.status !== 'pending') {
      throw new BadRequestException('Invite is no longer pending');
    }

    if (invite.receiverId !== userId) {
      throw new ForbiddenException('This invite was not sent to you');
    }

    const group = await this.prisma.sharedGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.type !== 'couple') {
      throw new BadRequestException('Invite can only be accepted for a couple group');
    }

    const existingProfile = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
    });
    if (existingProfile) {
      throw new BadRequestException('Couple profile already exists for this group');
    }

    const existingReceiverProfile = await this.prisma.coupleFinanceProfile.findFirst({
      where: { OR: [{ partner1Id: userId }, { partner2Id: userId }] },
    });
    if (existingReceiverProfile) {
      throw new BadRequestException('You already have a couple profile with another group');
    }

    await this.prisma.coupleFinanceProfile.create({
      data: {
        groupId,
        partner1Id: invite.senderId,
        partner2Id: invite.receiverId,
      },
    });

    await this.prisma.coupleFinanceInvite.update({
      where: { id: inviteId },
      data: { status: 'accepted', groupId },
    });

    await this.prisma.sharedGroupMember.upsert({
      where: { groupId_userId: { groupId, userId: invite.receiverId } },
      update: {},
      create: { groupId, userId: invite.receiverId, role: 'member' },
    });

    return { message: 'Couple invite accepted, group set up' };
  }

  async updateSalaryProfile(userId: string, dto: UpdateSalaryProfileDto) {
    const profile = await this.prisma.salaryProfile.upsert({
      where: { userId },
      update: {
        salary: dto.salary,
        currency: dto.currency || 'INR',
        frequency: dto.frequency || 'monthly',
      },
      create: {
        userId,
        salary: dto.salary,
        currency: dto.currency || 'INR',
        frequency: dto.frequency || 'monthly',
      },
    });

    return profile;
  }

  calculateRecommendedSplit(salary1: number, salary2: number) {
    const total = salary1 + salary2;
    if (total === 0) {
      return { ratio: '50:50', partner1Percent: 50, partner2Percent: 50 };
    }
    const p1Percent = Math.round((salary1 / total) * 100);
    const p2Percent = 100 - p1Percent;
    return {
      ratio: `${p1Percent}:${p2Percent}`,
      partner1Percent: p1Percent,
      partner2Percent: p2Percent,
      partner1Salary: salary1,
      partner2Salary: salary2,
    };
  }

  // ─── Trip Management ───────────────────────────────────────

  async createTrip(groupId: string, userId: string, dto: CreateTripDto) {
    await this.verifyAdmin(groupId, userId);

    const trip = await this.prisma.tripGroup.upsert({
      where: { groupId },
      update: {
        destination: dto.destination,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        totalBudget: dto.totalBudget,
        distanceKm: dto.distanceKm,
        transportMode: dto.transportMode,
        notes: dto.notes,
      },
      create: {
        groupId,
        destination: dto.destination,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        totalBudget: dto.totalBudget,
        distanceKm: dto.distanceKm,
        transportMode: dto.transportMode,
        notes: dto.notes,
      },
    });

    return trip;
  }

  async getTripDashboard(groupId: string) {
    const trip = await this.prisma.tripGroup.findUnique({
      where: { groupId },
      include: {
        expenses: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found for this group');
    }

    const categoryBreakdown = new Map<string, { total: number; count: number; items: any[] }>();
    for (const exp of trip.expenses) {
      const cat = exp.category || 'other';
      if (!categoryBreakdown.has(cat)) {
        categoryBreakdown.set(cat, { total: 0, count: 0, items: [] });
      }
      const entry = categoryBreakdown.get(cat)!;
      entry.total += Number(exp.amount);
      entry.count++;
      entry.items.push(exp);
    }

    return {
      ...trip,
      totalBudget: Number(trip.totalBudget || 0),
      totalSpent: Number(trip.totalSpent || 0),
      remaining: Number(trip.totalBudget || 0) - Number(trip.totalSpent || 0),
      categoryBreakdown: Array.from(categoryBreakdown.entries()).map(([category, data]) => ({
        category,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        items: data.items,
      })),
    };
  }

  async addTripExpense(tripId: string, userId: string, dto: AddTripExpenseDto) {
    const trip = await this.prisma.tripGroup.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const expense = await this.prisma.tripExpense.create({
      data: {
        tripId,
        category: dto.category,
        amount: dto.amount,
        paidBy: dto.paidBy,
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const totalSpent = await this.prisma.tripExpense.aggregate({
      where: { tripId },
      _sum: { amount: true },
    });

    await this.prisma.tripGroup.update({
      where: { id: tripId },
      data: { totalSpent: totalSpent._sum.amount || 0 },
    });

    return expense;
  }

  // ─── Household ─────────────────────────────────────────────

  async createHouseholdBill(groupId: string, userId: string, dto: CreateHouseholdBillDto) {
    const bill = await this.prisma.householdBill.create({
      data: {
        groupId,
        type: dto.type,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paidBy: dto.paidBy,
        period: dto.period,
        notes: dto.notes,
        contributions: {
          create: dto.shares.map((s) => ({
            userId: s.userId,
            amount: s.amount,
          })),
        },
      },
      include: {
        contributions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        payer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return bill;
  }

  async getHouseholdBills(groupId: string, period?: string) {
    const where: any = { groupId };
    if (period) {
      where.period = period;
    }

    const bills = await this.prisma.householdBill.findMany({
      where,
      include: {
        contributions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        payer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return bills;
  }

  async markBillPaid(billId: string, userId: string) {
    const bill = await this.prisma.householdBill.findUnique({ where: { id: billId } });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const contribution = await this.prisma.householdContribution.findUnique({
      where: { billId_userId: { billId, userId } },
    });
    if (!contribution) {
      throw new NotFoundException('Contribution not found for this user');
    }

    const updated = await this.prisma.householdContribution.update({
      where: { id: contribution.id },
      data: { isPaid: true },
    });

    const allPaid = await this.prisma.householdContribution.findMany({
      where: { billId, isPaid: false },
    });

    if (allPaid.length === 0) {
      await this.prisma.householdBill.update({
        where: { id: billId },
        data: { isPaid: true, paidAt: new Date() },
      });
    }

    return updated;
  }

  // ─── Contribution Rules ────────────────────────────────────

  async createContributionRule(groupId: string, userId: string, dto: CreateContributionRuleDto) {
    await this.verifyAdmin(groupId, userId);

    const rule = await this.prisma.contributionRule.create({
      data: {
        groupId,
        name: dto.name,
        type: dto.type || 'equal',
        values: dto.values,
        frequency: dto.frequency || 'monthly',
        autoApply: dto.autoApply || false,
      },
    });

    return rule;
  }

  async getContributionRules(groupId: string) {
    const rules = await this.prisma.contributionRule.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });

    return rules;
  }

  async applyContributionRule(groupId: string, ruleId: string) {
    const rule = await this.prisma.contributionRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const values = rule.values as Record<string, number>;
    const totalValue = Object.values(values).reduce((s, v) => s + v, 0);
    if (totalValue <= 0) {
      throw new BadRequestException('Invalid rule values');
    }

    const expenseAmount = totalValue;
    const splits = members
      .map((m) => {
        const share = values[m.userId] || 0;
        return {
          userId: m.userId,
          amount: share,
        };
      })
      .filter((s) => s.amount > 0);

    const expense = await this.prisma.sharedExpense.create({
      data: {
        groupId,
        description: `Auto: ${rule.name} (${rule.frequency})`,
        amount: expenseAmount,
        paidBy: members[0]?.userId || '',
        category: 'Contribution',
        splitType: rule.type,
        splits: {
          create: splits,
        },
      },
      include: {
        splits: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    await this.updateGroupTotalSpent(groupId);

    return expense;
  }

  // ─── Shared Goals ──────────────────────────────────────────

  async createSharedGoal(groupId: string, userId: string, dto: CreateSharedGoalDto) {
    const goal = await this.prisma.sharedGoal.create({
      data: {
        groupId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        category: dto.category || 'savings',
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        contributions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return goal;
  }

  async getSharedGoals(groupId: string) {
    const goals = await this.prisma.sharedGoal.findMany({
      where: { groupId },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        contributions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    });

    return goals.map((g) => ({
      ...g,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount),
      progress:
        Number(g.targetAmount) > 0
          ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100)
          : 0,
    }));
  }

  async contributeToGoal(goalId: string, userId: string, amount: number) {
    const goal = await this.prisma.sharedGoal.findUnique({ where: { id: goalId } });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const contribution = await this.prisma.sharedGoalContribution.create({
      data: {
        goalId,
        userId,
        amount,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const totalSaved = await this.prisma.sharedGoalContribution.aggregate({
      where: { goalId },
      _sum: { amount: true },
    });

    await this.prisma.sharedGoal.update({
      where: { id: goalId },
      data: {
        savedAmount: totalSaved._sum.amount || 0,
      },
    });

    return contribution;
  }

  // ─── Chat ──────────────────────────────────────────────────

  async sendMessage(groupId: string, userId: string, dto: SendMessageDto) {
    const message = await this.prisma.groupChatMessage.create({
      data: {
        groupId,
        senderId: userId,
        message: dto.message,
        type: dto.type || 'text',
        imageUrl: dto.imageUrl,
        expenseId: dto.expenseId,
        metadata: dto.metadata || undefined,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        expense: {
          select: { id: true, description: true, amount: true, category: true },
        },
      },
    });

    return message;
  }

  async getMessages(groupId: string, limit: number = 50, before?: string) {
    const where: any = { groupId };
    if (before) {
      const cursor = await this.prisma.groupChatMessage.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (cursor) {
        where.createdAt = { lt: cursor.createdAt };
      }
    }

    const messages = await this.prisma.groupChatMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        expense: {
          select: { id: true, description: true, amount: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async pinMessage(messageId: string, groupId: string) {
    const message = await this.prisma.groupChatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.groupId !== groupId) {
      throw new BadRequestException('Message not in this group');
    }

    const updated = await this.prisma.groupChatMessage.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
    });

    return updated;
  }

  // ─── Dashboard ─────────────────────────────────────────────

  async getGroupDashboard(groupId: string) {
    const [group, expenses, settlements, members, goals] = await Promise.all([
      this.prisma.sharedGroup.findUnique({
        where: { id: groupId },
        include: {
          trip: true,
          coupleProfile: true,
        },
      }),
      this.prisma.sharedExpense.findMany({
        where: { groupId },
        include: {
          splits: true,
          payer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: { select: { id: true, firstName: true, lastName: true } },
          toUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sharedGroupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.sharedGoal.findMany({
        where: { groupId },
        include: { contributions: true },
      }),
    ]);

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const balances = this.settlementEngine.calculateBalances(expenses, members);
    const settlementPlan = this.settlementEngine.calculateOptimizedSettlements(balances);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySpending = expenses
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((s, e) => s + Number(e.amount), 0);

    const categoryBreakdown = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryBreakdown.set(cat, (categoryBreakdown.get(cat) || 0) + Number(exp.amount));
    }

    const totalSpent = Number(group.totalSpent || 0);

    return {
      summary: {
        totalSpent,
        expenseCount: expenses.length,
        memberCount: members.length,
        monthlySpending,
        monthlyBudget: Number(group.monthlyBudget || 0),
        budgetRemaining: Number(group.monthlyBudget || 0) - monthlySpending,
      },
      balances,
      settlementPlan,
      recentExpenses: expenses.slice(0, 10),
      recentSettlements: settlements.slice(0, 10),
      categoryBreakdown: Array.from(categoryBreakdown.entries()).map(([category, total]) => ({
        category,
        total,
        percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
      })),
      memberStats: members.map((m) => ({
        userId: m.userId,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        totalPaid: expenses
          .filter((e) => e.paidBy === m.userId)
          .reduce((s, e) => s + Number(e.amount), 0),
        expenseCount: expenses.filter((e) => e.paidBy === m.userId).length,
      })),
      trip: group.trip
        ? {
            ...group.trip,
            totalBudget: Number(group.trip.totalBudget || 0),
            totalSpent: Number(group.trip.totalSpent || 0),
          }
        : null,
      goals: goals.map((g) => ({
        ...g,
        targetAmount: Number(g.targetAmount),
        savedAmount: Number(g.savedAmount),
        progress:
          Number(g.targetAmount) > 0
            ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100)
            : 0,
      })),
    };
  }

  async getGroupInsights(groupId: string, period?: string) {
    const [expenses, members, group] = await Promise.all([
      this.prisma.sharedExpense.findMany({
        where: { groupId },
        include: { splits: true, payer: true },
      }),
      this.prisma.sharedGroupMember.findMany({
        where: { groupId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.sharedGroup.findUnique({
        where: { id: groupId },
        include: { trip: true, coupleProfile: true },
      }),
    ]);

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.aiInsightsEngine.generateInsights(expenses, members, group, period);
  }

  // ─── Group Wallet System ─────────────────────────────────────

  async createWallet(groupId: string, userId: string, dto: CreateWalletDto) {
    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive) {
      throw new ForbiddenException('Not a group member');
    }

    const wallet = await this.prisma.groupWallet.create({
      data: {
        groupId,
        name: dto.name,
        description: dto.description,
        currency: dto.currency || 'INR',
        requiresApproval: dto.requiresApproval || false,
        createdBy: userId,
        members: {
          create: { userId, role: 'admin', share: 0 },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    return wallet;
  }

  async getGroupWallets(groupId: string) {
    return this.prisma.groupWallet.findMany({
      where: { groupId },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWallet(walletId: string) {
    const wallet = await this.prisma.groupWallet.findUnique({
      where: { id: walletId },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return { ...wallet, balance: Number(wallet.balance) };
  }

  async contributeToWallet(walletId: string, userId: string, dto: ContributeToWalletDto) {
    const wallet = await this.prisma.groupWallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked');
    }

    const previousBalance = Number(wallet.balance);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.groupWallet.update({
        where: { id: walletId },
        data: { balance: previousBalance + dto.amount },
      });

      const txn = await tx.groupWalletTransaction.create({
        data: {
          walletId,
          type: 'contribute',
          amount: dto.amount,
          balanceBefore: previousBalance,
          balanceAfter: Number(updated.balance),
          description: dto.description || 'Wallet contribution',
          performedBy: userId,
          status: 'completed',
        },
      });

      return txn;
    });

    if (this.socketServer) {
      this.socketServer.to(`group:${wallet.groupId}`).emit('walletUpdated', {
        walletId,
        balance: previousBalance + dto.amount,
      });
    }

    return result;
  }

  async spendFromWallet(walletId: string, userId: string, dto: SpendFromWalletDto) {
    const wallet = await this.prisma.groupWallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked');
    }

    const previousBalance = Number(wallet.balance);
    if (previousBalance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const status = wallet.requiresApproval ? 'pending' : 'completed';

    const txn = await this.prisma.groupWalletTransaction.create({
      data: {
        walletId,
        type: 'spend',
        amount: -dto.amount,
        balanceBefore: previousBalance,
        balanceAfter: previousBalance - dto.amount,
        description: dto.description,
        referenceId: dto.referenceId,
        performedBy: userId,
        status,
      },
    });

    if (status === 'completed') {
      await this.prisma.groupWallet.update({
        where: { id: walletId },
        data: { balance: previousBalance - dto.amount },
      });
    }

    return txn;
  }

  async approveWalletTransaction(transactionId: string, userId: string, action: string) {
    const txn = await this.prisma.groupWalletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    if (action === 'approved') {
      const walletBalance = Number(txn.wallet.balance);
      const txnAmount = Number(txn.amount);

      await this.prisma.$transaction(async (tx) => {
        await tx.groupWalletTransaction.update({
          where: { id: transactionId },
          data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
        });
        await tx.groupWallet.update({
          where: { id: txn.walletId },
          data: { balance: walletBalance + txnAmount },
        });
      });
    } else {
      await this.prisma.groupWalletTransaction.update({
        where: { id: transactionId },
        data: { status: 'rejected', approvedBy: userId, approvedAt: new Date() },
      });
    }

    if (this.socketServer) {
      this.socketServer.to(`group:${txn.wallet.groupId}`).emit('walletTransactionUpdated', {
        transactionId,
        status: action,
      });
    }

    return { message: `Transaction ${action}` };
  }

  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    userId: string,
    dto: TransferWalletDto,
  ) {
    const fromWallet = await this.prisma.groupWallet.findUnique({ where: { id: fromWalletId } });
    const toWallet = await this.prisma.groupWallet.findUnique({ where: { id: toWalletId } });
    if (!fromWallet || !toWallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (fromWallet.isLocked || toWallet.isLocked) {
      throw new BadRequestException('One of the wallets is locked');
    }

    const fromBalance = Number(fromWallet.balance);
    if (fromBalance < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupWallet.update({
        where: { id: fromWalletId },
        data: { balance: fromBalance - dto.amount },
      });
      await tx.groupWallet.update({
        where: { id: toWalletId },
        data: { balance: Number(toWallet.balance) + dto.amount },
      });
      await tx.groupWalletTransaction.create({
        data: {
          walletId: fromWalletId,
          type: 'transfer_out',
          amount: -dto.amount,
          balanceBefore: fromBalance,
          balanceAfter: fromBalance - dto.amount,
          description: dto.description || `Transfer to ${toWallet.name}`,
          referenceId: toWalletId,
          performedBy: userId,
        },
      });
      await tx.groupWalletTransaction.create({
        data: {
          walletId: toWalletId,
          type: 'transfer_in',
          amount: dto.amount,
          balanceBefore: Number(toWallet.balance),
          balanceAfter: Number(toWallet.balance) + dto.amount,
          description: dto.description || `Transfer from ${fromWallet.name}`,
          referenceId: fromWalletId,
          performedBy: userId,
        },
      });
    });

    return { message: 'Transfer completed' };
  }

  async toggleWalletLock(walletId: string, userId: string) {
    const wallet = await this.prisma.groupWallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updated = await this.prisma.groupWallet.update({
      where: { id: walletId },
      data: { isLocked: !wallet.isLocked },
    });

    return updated;
  }

  async getWalletReport(walletId: string) {
    const wallet = await this.prisma.groupWallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transactions = await this.prisma.groupWalletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
    });

    const totalContributed = transactions
      .filter((t) => t.type === 'contribute')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalSpent = transactions
      .filter((t) => t.type === 'spend' && t.status === 'completed')
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    return {
      wallet: { ...wallet, balance: Number(wallet.balance) },
      summary: { totalContributed, totalSpent, transactionCount: transactions.length },
      recentTransactions: transactions.slice(0, 20),
    };
  }

  // ─── Advance Contribution System ─────────────────────────────

  async createAdvanceContribution(
    groupId: string,
    userId: string,
    dto: CreateAdvanceContributionDto,
  ) {
    const advance = await this.prisma.advanceContribution.create({
      data: {
        groupId,
        paidBy: userId,
        description: dto.description,
        amount: dto.amount,
        category: dto.category || 'general',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        payer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return advance;
  }

  async getGroupAdvances(groupId: string) {
    const advances = await this.prisma.advanceContribution.findMany({
      where: { groupId },
      include: {
        payer: { select: { id: true, firstName: true, lastName: true } },
        contributions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return advances.map((a) => ({
      ...a,
      amount: Number(a.amount),
      settledAmount: a.contributions.reduce((s, c) => s + Number(c.amount), 0),
      remaining: Number(a.amount) - a.contributions.reduce((s, c) => s + Number(c.amount), 0),
    }));
  }

  async contributeToAdvance(advanceId: string, userId: string, dto: ContributeToAdvanceDto) {
    const advance = await this.prisma.advanceContribution.findUnique({ where: { id: advanceId } });
    if (!advance) {
      throw new NotFoundException('Advance not found');
    }

    const contribution = await this.prisma.advanceContributionHistory.create({
      data: {
        advanceId,
        userId,
        amount: dto.amount,
        note: dto.note,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    const totalContributed = await this.prisma.advanceContributionHistory.aggregate({
      where: { advanceId },
      _sum: { amount: true },
    });

    const totalAmount = Number(advance.amount);
    const contributed = Number(totalContributed._sum.amount || 0);

    if (contributed >= totalAmount) {
      await this.prisma.advanceContribution.update({
        where: { id: advanceId },
        data: { status: 'settled', settledAt: new Date() },
      });
    } else if (contributed > 0) {
      await this.prisma.advanceContribution.update({
        where: { id: advanceId },
        data: { status: 'partially_settled' },
      });
    }

    return contribution;
  }

  // ─── Expense Approval Workflow ──────────────────────────────

  async requestApproval(groupId: string, userId: string, dto: RequestApprovalDto) {
    const expense = await this.prisma.sharedExpense.findUnique({ where: { id: dto.expenseId } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const existing = await this.prisma.expenseApproval.findUnique({
      where: { expenseId: dto.expenseId },
    });
    if (existing) {
      throw new BadRequestException('Approval already requested');
    }

    const approval = await this.prisma.expenseApproval.create({
      data: {
        expenseId: dto.expenseId,
        groupId,
        requestedBy: userId,
        status: 'pending',
        history: {
          create: {
            fromStatus: 'none',
            toStatus: 'pending',
            changedBy: userId,
            comment: dto.comment || 'Approval requested',
          },
        },
      },
      include: {
        expense: { select: { id: true, description: true, amount: true } },
      },
    });

    return approval;
  }

  async approveExpense(approvalId: string, userId: string, dto: ApproveExpenseDto) {
    const approval = await this.prisma.expenseApproval.findUnique({ where: { id: approvalId } });
    if (!approval) {
      throw new NotFoundException('Approval not found');
    }
    if (approval.status !== 'pending') {
      throw new BadRequestException('Already processed');
    }

    const updated = await this.prisma.expenseApproval.update({
      where: { id: approvalId },
      data: {
        status: dto.action === 'approved' ? 'approved' : 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectReason: dto.action === 'rejected' ? dto.rejectReason || 'Rejected' : null,
        history: {
          create: {
            fromStatus: 'pending',
            toStatus: dto.action === 'approved' ? 'approved' : 'rejected',
            changedBy: userId,
            comment: dto.comment || `${dto.action === 'approved' ? 'Approved' : 'Rejected'}`,
          },
        },
      },
      include: {
        expense: { select: { id: true, description: true, amount: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (this.socketServer) {
      this.socketServer.to(`group:${approval.groupId}`).emit('expenseApprovalUpdated', {
        approvalId,
        status: dto.action,
      });
    }

    return updated;
  }

  async getPendingApprovals(groupId: string) {
    return this.prisma.expenseApproval.findMany({
      where: { groupId, status: 'pending' },
      include: {
        expense: {
          include: {
            payer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApprovalHistory(groupId: string) {
    return this.prisma.expenseApproval.findMany({
      where: { groupId },
      include: {
        expense: { select: { id: true, description: true, amount: true, category: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        history: {
          include: { changer: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  // ─── Group Document Vault ───────────────────────────────────

  async uploadDocument(groupId: string, userId: string, dto: UploadDocumentDto) {
    const doc = await this.prisma.groupDocument.create({
      data: {
        groupId,
        uploadedBy: userId,
        name: dto.name,
        type: dto.type,
        category: dto.category || 'other',
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        description: dto.description,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.documentAuditLog.create({
      data: {
        documentId: doc.id,
        action: 'upload',
        performedBy: userId,
      },
    });

    return doc;
  }

  async getGroupDocuments(groupId: string, type?: string) {
    const where: any = { groupId, isArchived: false };
    if (type) {
      where.type = type;
    }

    return this.prisma.groupDocument.findMany({
      where,
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(documentId: string) {
    const doc = await this.prisma.groupDocument.findUnique({
      where: { id: documentId },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        permissions: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.documentAuditLog.create({
      data: { documentId, action: 'view', performedBy: 'system' },
    });

    return doc;
  }

  async deleteDocument(documentId: string, userId: string) {
    const doc = await this.prisma.groupDocument.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.groupDocument.update({
      where: { id: documentId },
      data: { isArchived: true },
    });

    await this.prisma.documentAuditLog.create({
      data: { documentId, action: 'delete', performedBy: userId, metadata: { soft: true } },
    });

    return { message: 'Document archived' };
  }

  async shareDocument(
    documentId: string,
    userId: string,
    targetUserId: string,
    permissions?: UpdateDocumentPermissionDto,
  ) {
    const perm = await this.prisma.documentPermission.upsert({
      where: { documentId_userId: { documentId, userId: targetUserId } },
      update: {
        canView: permissions?.canView ?? true,
        canDownload: permissions?.canDownload ?? false,
        canShare: permissions?.canShare ?? false,
        canDelete: permissions?.canDelete ?? false,
      },
      create: {
        documentId,
        userId: targetUserId,
        canView: permissions?.canView ?? true,
        canDownload: permissions?.canDownload ?? false,
        canShare: permissions?.canShare ?? false,
        canDelete: permissions?.canDelete ?? false,
      },
    });

    await this.prisma.documentAuditLog.create({
      data: {
        documentId,
        action: 'share',
        performedBy: userId,
        metadata: { sharedWith: targetUserId },
      },
    });

    return perm;
  }

  // ─── Group Calendar ─────────────────────────────────────────

  async getOrCreateCalendar(groupId: string) {
    let calendar = await this.prisma.groupCalendar.findUnique({ where: { groupId } });
    if (!calendar) {
      calendar = await this.prisma.groupCalendar.create({
        data: { groupId },
      });
    }
    return calendar;
  }

  async createCalendarEvent(groupId: string, userId: string, dto: CreateCalendarEventDto) {
    const calendar = await this.getOrCreateCalendar(groupId);

    const event = await this.prisma.calendarEvent.create({
      data: {
        calendarId: calendar.id,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType || 'custom',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        allDay: dto.allDay || false,
        color: dto.color,
        recurrence: dto.recurrence,
        referenceId: dto.referenceId,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (this.socketServer) {
      this.socketServer.to(`group:${groupId}`).emit('calendarEventCreated', event);
    }

    return event;
  }

  async getCalendarEvents(groupId: string, startDate?: string, endDate?: string) {
    const calendar = await this.getOrCreateCalendar(groupId);

    const where: any = { calendarId: calendar.id };
    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.endDate = { ...where.endDate, lte: new Date(endDate) };
    }

    return this.prisma.calendarEvent.findMany({
      where,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async deleteCalendarEvent(eventId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
    return { message: 'Event deleted' };
  }

  // ─── Split Templates ────────────────────────────────────────

  async createSplitTemplate(userId: string, dto: CreateSplitTemplateDto) {
    const template = await this.prisma.splitTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        groupType: dto.groupType || 'friends',
        icon: dto.icon || 'documents',
        coverColor: dto.coverColor || '#f7892c',
        defaultBudget: dto.defaultBudget,
        createdBy: userId,
      },
      include: {
        categories: true,
        contributionRules: true,
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (this.socketServer) {
      this.socketServer.to(`user:${userId}`).emit('splitTemplateCreated', template);
    }

    return template;
  }

  async getSplitTemplates(groupType?: string) {
    const where: any = {};
    if (groupType) {
      where.groupType = groupType;
    }
    return this.prisma.splitTemplate.findMany({
      where,
      include: {
        categories: true,
        contributionRules: true,
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isOfficial: 'desc' }, { usageCount: 'desc' }],
    });
  }

  async getSplitTemplate(templateId: string) {
    const template = await this.prisma.splitTemplate.findUnique({
      where: { id: templateId },
      include: {
        categories: true,
        contributionRules: true,
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!template) {
      throw new NotFoundException('Split template not found');
    }
    return template;
  }

  async updateSplitTemplate(templateId: string, userId: string, dto: CreateSplitTemplateDto) {
    const existing = await this.prisma.splitTemplate.findUnique({ where: { id: templateId } });
    if (!existing) {
      throw new NotFoundException('Split template not found');
    }
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new ForbiddenException('You can only edit your own templates');
    }

    const updated = await this.prisma.splitTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        groupType: dto.groupType,
        icon: dto.icon,
        coverColor: dto.coverColor,
        defaultBudget: dto.defaultBudget,
      },
      include: {
        categories: true,
        contributionRules: true,
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (this.socketServer) {
      this.socketServer.to(`user:${userId}`).emit('splitTemplateUpdated', updated);
    }

    return updated;
  }

  async deleteSplitTemplate(templateId: string, userId: string) {
    const existing = await this.prisma.splitTemplate.findUnique({ where: { id: templateId } });
    if (!existing) {
      throw new NotFoundException('Split template not found');
    }
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.prisma.splitTemplate.delete({ where: { id: templateId } });

    if (this.socketServer) {
      this.socketServer.to(`user:${userId}`).emit('splitTemplateDeleted', { templateId });
    }

    return { message: 'Template deleted' };
  }

  async createGroupFromTemplate(groupId: string, templateId: string, dto: CreateFromTemplateDto) {
    const template = await this.prisma.splitTemplate.findUnique({
      where: { id: templateId },
      include: { categories: true, contributionRules: true },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.splitTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    if (this.socketServer) {
      this.socketServer.to(`group:${groupId}`).emit('templateApplied', {
        templateId,
        templateName: template.name,
        groupId,
      });
    }

    return { message: `Template "${template.name}" applied`, template };
  }

  // ─── Credit Card Bill Split ────────────────────────────────

  async uploadCreditCardBill(groupId: string, userId: string, dto: UploadCreditCardBillDto) {
    return this.prisma.creditCardBill.create({
      data: {
        groupId,
        uploadedBy: userId,
        cardHolder: dto.cardHolder,
        cardType: dto.cardType,
        lastFour: dto.lastFour,
        statementDate: dto.statementDate ? new Date(dto.statementDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        totalAmount: dto.totalAmount,
        currency: dto.currency || 'INR',
        fileUrl: dto.fileUrl,
        ocrText: dto.ocrText,
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getGroupCreditCardBills(groupId: string) {
    return this.prisma.creditCardBill.findMany({
      where: { groupId },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { transactions: true, splits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCreditCardTransactions(
    billId: string,
    transactions: {
      date: string;
      description: string;
      amount: number;
      category?: string;
      merchant?: string;
    }[],
  ) {
    const bill = await this.prisma.creditCardBill.findUnique({ where: { id: billId } });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const created = [];
    for (const t of transactions) {
      const tx = await this.prisma.creditCardTransaction.create({
        data: {
          billId,
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          category: t.category,
          merchant: t.merchant,
        },
      });
      (created as any[]).push(tx);
    }

    await this.prisma.creditCardBill.update({
      where: { id: billId },
      data: { status: 'parsed' },
    });

    return created;
  }

  async splitTransaction(transactionId: string, splits: { userId: string; amount: number }[]) {
    const txn = await this.prisma.creditCardTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    const totalSplit = splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(totalSplit - Number(txn.amount)) > 0.01) {
      throw new BadRequestException('Split amounts must equal the transaction amount');
    }

    const created = [];
    for (const sp of splits) {
      const split = await this.prisma.billSplit.create({
        data: {
          billId: txn.billId,
          transactionId,
          userId: sp.userId,
          amount: sp.amount,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });
      (created as any[]).push(split);
    }

    await this.prisma.creditCardTransaction.update({
      where: { id: transactionId },
      data: { isSplit: true },
    });

    return created;
  }

  // ─── Cash Pool ──────────────────────────────────────────────

  async createCashPool(groupId: string, userId: string, dto: CreateCashPoolDto) {
    return this.prisma.cashPool.create({
      data: {
        groupId,
        name: dto.name || 'Cash Pool',
        totalCash: dto.totalCash,
        remaining: dto.totalCash,
        currency: dto.currency || 'INR',
        custodian: dto.custodian,
      },
      include: {
        custodianRel: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getGroupCashPools(groupId: string) {
    return this.prisma.cashPool.findMany({
      where: { groupId, isActive: true },
      include: {
        custodianRel: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCashTransaction(poolId: string, userId: string, dto: CashPoolTransactionDto) {
    const pool = await this.prisma.cashPool.findUnique({ where: { id: poolId } });
    if (!pool) {
      throw new NotFoundException('Cash pool not found');
    }

    const remaining = Number(pool.remaining);
    let balanceAfter = remaining;

    if (dto.type === 'deposit') {
      balanceAfter = remaining + dto.amount;
    } else if (dto.type === 'spend') {
      if (remaining < dto.amount) {
        throw new BadRequestException('Insufficient cash');
      }
      balanceAfter = remaining - dto.amount;
    }

    const txn = await this.prisma.cashTransaction.create({
      data: {
        poolId,
        type: dto.type,
        amount: dto.type === 'spend' ? -dto.amount : dto.amount,
        description: dto.description,
        category: dto.category,
        performedBy: userId,
        balanceBefore: remaining,
        balanceAfter,
      },
    });

    await this.prisma.cashPool.update({
      where: { id: poolId },
      data: { remaining: balanceAfter },
    });

    return txn;
  }

  async getPoolTransactions(poolId: string) {
    return this.prisma.cashTransaction.findMany({
      where: { poolId },
      include: { performer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Emergency Fund ─────────────────────────────────────────

  async createEmergencyFund(groupId: string, userId: string, dto: CreateEmergencyFundDto) {
    return this.prisma.emergencyFund.create({
      data: {
        groupId,
        name: dto.name || 'Emergency Fund',
        targetAmount: dto.targetAmount,
        monthlyContribution: dto.monthlyContribution,
        currency: dto.currency || 'INR',
        createdBy: userId,
      },
    });
  }

  async getGroupEmergencyFunds(groupId: string) {
    const funds = await this.prisma.emergencyFund.findMany({
      where: { groupId, isActive: true },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { contributions: true, withdrawals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return funds.map((f) => ({
      ...f,
      targetAmount: Number(f.targetAmount),
      savedAmount: Number(f.savedAmount),
      monthlyContribution: Number(f.monthlyContribution),
      progress:
        Number(f.targetAmount) > 0
          ? Math.round((Number(f.savedAmount) / Number(f.targetAmount)) * 100)
          : 0,
    }));
  }

  async contributeToEmergencyFund(
    fundId: string,
    userId: string,
    dto: ContributeToEmergencyFundDto,
  ) {
    const fund = await this.prisma.emergencyFund.findUnique({ where: { id: fundId } });
    if (!fund) {
      throw new NotFoundException('Emergency fund not found');
    }

    const [contribution] = await this.prisma.$transaction(async (tx) => {
      const c = await tx.emergencyContribution.create({
        data: { fundId, userId, amount: dto.amount, note: dto.note },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });

      await tx.emergencyFund.update({
        where: { id: fundId },
        data: { savedAmount: Number(fund.savedAmount) + dto.amount },
      });

      return [c];
    });

    return contribution;
  }

  async requestEmergencyWithdrawal(
    fundId: string,
    userId: string,
    dto: WithdrawFromEmergencyFundDto,
  ) {
    const fund = await this.prisma.emergencyFund.findUnique({ where: { id: fundId } });
    if (!fund) {
      throw new NotFoundException('Emergency fund not found');
    }
    if (Number(fund.savedAmount) < dto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    return this.prisma.emergencyWithdrawal.create({
      data: {
        fundId,
        withdrawnBy: userId,
        amount: dto.amount,
        reason: dto.reason,
        status: 'pending',
      },
      include: {
        withdrawer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async approveEmergencyWithdrawal(withdrawalId: string, userId: string, action: string) {
    const withdrawal = await this.prisma.emergencyWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { fund: true },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (action === 'approved') {
      await this.prisma.$transaction(async (tx) => {
        await tx.emergencyWithdrawal.update({
          where: { id: withdrawalId },
          data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
        });
        await tx.emergencyFund.update({
          where: { id: withdrawal.fundId },
          data: { savedAmount: Number(withdrawal.fund.savedAmount) - Number(withdrawal.amount) },
        });
      });
    } else {
      await this.prisma.emergencyWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'rejected', approvedBy: userId, approvedAt: new Date() },
      });
    }

    return { message: `Withdrawal ${action}` };
  }

  // ─── Family Net Worth ───────────────────────────────────────

  async createNetWorthSnapshot(groupId: string, userId: string, dto: CreateNetWorthSnapshotDto) {
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const item of dto.items) {
      if (item.category === 'asset') {
        totalAssets += item.amount;
      } else {
        totalLiabilities += item.amount;
      }
    }

    const netWorth = totalAssets - totalLiabilities;
    const savingsRatio =
      totalAssets > 0 ? ((totalAssets - totalLiabilities) / totalAssets) * 100 : 0;

    const snapshot = await this.prisma.familyNetWorthSnapshot.create({
      data: {
        groupId,
        totalAssets,
        totalLiabilities,
        netWorth,
        savingsRatio: Math.round(savingsRatio * 100) / 100,
        items: {
          create: dto.items.map((item) => ({
            type: item.type,
            name: item.name,
            amount: item.amount,
            category: item.category,
          })),
        },
      },
      include: { items: true },
    });

    return snapshot;
  }

  async getNetWorthHistory(groupId: string) {
    const snapshots = await this.prisma.familyNetWorthSnapshot.findMany({
      where: { groupId },
      include: { items: true },
      orderBy: { snapshotDate: 'desc' },
      take: 12,
    });

    return snapshots.map((s) => ({
      ...s,
      totalAssets: Number(s.totalAssets),
      totalLiabilities: Number(s.totalLiabilities),
      netWorth: Number(s.netWorth),
      savingsRatio: Number(s.savingsRatio),
    }));
  }

  async getLatestNetWorth(groupId: string) {
    const latest = await this.prisma.familyNetWorthSnapshot.findFirst({
      where: { groupId },
      include: { items: true },
      orderBy: { snapshotDate: 'desc' },
    });

    if (!latest) {
      return null;
    }

    return {
      ...latest,
      totalAssets: Number(latest.totalAssets),
      totalLiabilities: Number(latest.totalLiabilities),
      netWorth: Number(latest.netWorth),
      savingsRatio: Number(latest.savingsRatio),
    };
  }

  // ─── Export System ──────────────────────────────────────────

  async exportGroupData(groupId: string, userId: string, dto: ExportDataDto) {
    await this.verifyAdmin(groupId, userId);

    const group = await this.prisma.sharedGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const exportRecord = await this.prisma.exportHistory.create({
      data: {
        groupId,
        exportedBy: userId,
        exportType: dto.exportType,
        reportType: dto.reportType,
        status: 'completed',
      },
    });

    return { message: `Export ${dto.exportType} generated`, exportId: exportRecord.id };
  }

  async getExportHistory(groupId: string) {
    return this.prisma.exportHistory.findMany({
      where: { groupId },
      include: { exporter: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Trip Cost Forecast ─────────────────────────────────────

  async forecastTripCost(dto: TripForecastDto): Promise<any> {
    return this.tripForecastEngine.forecast(dto);
  }

  // ─── Duplicate Detection ────────────────────────────────────

  async checkDuplicateExpense(groupId: string, dto: CreateExpenseDto): Promise<any> {
    const existing = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: { payer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return this.duplicateEngine.detect(
      {
        description: dto.description,
        amount: dto.amount,
        paidBy: dto.paidBy,
        category: dto.category,
        date: dto.date,
        notes: dto.notes,
      },
      existing as any,
    );
  }

  // ─── Auto-OCR Expense Creation ─────────────────────────────

  async createExpenseFromOcr(groupId: string, userId: string, ocrText: string) {
    // Simple inline OCR parser
    const lines = ocrText.split('\n').filter(Boolean);
    let description = '';
    let amount = 0;
    const category = 'Other';
    const merchant = '';

    const amountMatch = ocrText.match(/[₹$€£]\s*([0-9,]+\.?\d*)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    if (lines.length > 0) {
      description = lines[0].trim().substring(0, 200);
    }

    if (!description || !amount) {
      throw new BadRequestException('Could not extract expense details from OCR text');
    }

    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    const splitAmount = members.length > 0 ? amount / members.length : amount;
    const splits = members.map((m) => ({
      userId: m.userId,
      amount: Math.round(splitAmount * 100) / 100,
    }));

    const expense = await this.prisma.sharedExpense.create({
      data: {
        groupId,
        description,
        amount,
        paidBy: userId,
        category: category || 'Other',
        date: new Date(),
        splitType: 'equal',
        notes: `Auto-created from OCR: ${merchant || ''}`,
        splits: { create: splits },
      },
      include: {
        splits: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        payer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await this.updateGroupTotalSpent(groupId);

    return { expense, draft: { description, amount, category, merchant } };
  }

  // ─── Gamification & Achievements ───────────────────────────

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: [{ isEarned: 'desc' }, { progress: 'desc' }],
    });
  }

  async getAllBadges() {
    return this.prisma.badge.findMany({
      orderBy: [{ tier: 'asc' }, { category: 'asc' }],
    });
  }

  async getGroupGamificationStats(groupId: string) {
    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      select: { userId: true },
    });

    const memberBadges = [];
    for (const m of members) {
      const badges = await this.prisma.userBadge.findMany({
        where: { userId: m.userId, isEarned: true },
        include: { badge: true },
      });
      (memberBadges as any[]).push({ userId: m.userId, badges });
    }

    return { memberBadges };
  }

  // ─── Analytics ─────────────────────────────────────────────

  async getAdvancedAnalytics(groupId: string) {
    const [expenses, members, settlements, goals] = await Promise.all([
      this.prisma.sharedExpense.findMany({ where: { groupId } }),
      this.prisma.sharedGroupMember.findMany({
        where: { groupId, isActive: true },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.settlement.findMany({ where: { groupId } }),
      this.prisma.sharedGoal.findMany({ where: { groupId } }),
    ]);

    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const monthlySpending = this.aiInsightsEngine.getMonthlyComparison(expenses);

    const categoryTrends = new Map<string, { total: number; count: number }>();
    for (const e of expenses) {
      const cat = e.category || 'Other';
      if (!categoryTrends.has(cat)) {
        categoryTrends.set(cat, { total: 0, count: 0 });
      }
      const c = categoryTrends.get(cat)!;
      c.total += Number(e.amount);
      c.count++;
    }

    const memberSpending = members.map((m) => {
      const paid = expenses
        .filter((e: any) => e.paidBy === m.userId)
        .reduce((s: number, e: any) => s + Number(e.amount), 0);
      const owed = expenses
        .filter((e: any) => e.splits?.some((s: any) => s.userId === m.userId))
        .reduce((s: number, e: any) => s + Number(e.amount), 0);
      return {
        userId: m.userId,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        totalPaid: paid,
        totalOwed: owed,
        netPosition: paid - owed,
      };
    });

    const completedSettlements = settlements.filter((s) => s.status === 'completed').length;
    const pendingSettlements = settlements.filter((s) => s.status === 'pending').length;
    const settlementScore =
      settlements.length > 0 ? Math.round((completedSettlements / settlements.length) * 100) : 100;

    const goalProgress =
      goals.length > 0
        ? goals.reduce(
            (s, g) => s + (Number(g.savedAmount) / Number(g.targetAmount || 1)) * 100,
            0,
          ) / goals.length
        : 0;
    const healthScore = Math.round(
      settlementScore * 0.4 +
        goalProgress * 0.3 +
        (memberSpending.filter((m) => m.netPosition >= 0).length / Math.max(members.length, 1)) *
          100 *
          0.3,
    );

    return {
      summary: {
        totalSpent,
        totalExpenses: expenses.length,
        averageExpense: expenses.length > 0 ? totalSpent / expenses.length : 0,
        monthlyAverage:
          (monthlySpending as unknown as any[]).length > 0
            ? totalSpent / Math.max((monthlySpending as unknown as any[]).length, 1)
            : 0,
      },
      categoryTrends: Array.from(categoryTrends.entries()).map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalSpent > 0 ? Math.round((data.total / totalSpent) * 100) : 0,
      })),
      memberSpending: memberSpending.sort((a, b) => b.totalPaid - a.totalPaid),
      fairnessScore: this.calculateGiniFairness(memberSpending.map((m) => m.totalPaid)),
      settlementScore,
      healthScore,
    };
  }

  private calculateGiniFairness(values: number[]): number {
    if (values.length === 0) {
      return 1;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((s, v) => s + v, 0);
    if (sum === 0) {
      return 1;
    }
    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sorted[i];
    }
    gini /= n * sum;
    return Math.max(0, Math.min(1, Math.round((1 - gini) * 100) / 100));
  }

  // ─── Group Lifecycle ─────────────────────────────────────────

  async transitionGroupStatus(groupId: string, userId: string, newStatus: string) {
    return this.lifecycleService.transitionGroupStatus(
      groupId,
      userId,
      newStatus as any,
      this.socketServer || undefined,
    );
  }

  async finalizeGroupSettlements(groupId: string, userId: string) {
    return this.lifecycleService.finalizeSettlements(groupId, userId);
  }

  async getGroupLifecycleHistory(groupId: string) {
    return this.lifecycleService.getLifecycleHistory(groupId);
  }

  async getMemberRemovalLogs(groupId: string) {
    return this.lifecycleService.getMemberRemovalLogs(groupId);
  }

  async revokeAllInvites(groupId: string, userId: string) {
    await this.verifyAdmin(groupId, userId);

    const result = await this.prisma.groupInvite.updateMany({
      where: { groupId, status: 'active' },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: userId,
      },
    });

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'invite_revoked',
        triggeredBy: userId,
        metadata: { count: result.count },
      },
    });

    if (this.socketServer) {
      this.socketServer.to(`group:${groupId}`).emit('invitesRevoked', {
        groupId,
        message: 'All active invites have been revoked.',
      });
    }

    return { message: `${result.count} invites revoked`, count: result.count };
  }

  async getGroupStatus(groupId: string) {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        status: true,
        statusChangedAt: true,
        statusChangedBy: true,
        completedAt: true,
        archivedAt: true,
        closedAt: true,
        pausedAt: true,
        frozenAt: true,
        settlementsFinalized: true,
        finalizedAt: true,
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async exportGroupReport(groupId: string, userId: string) {
    await this.verifyAdmin(groupId, userId);

    const [group, expenses, settlements, members, messages] = await Promise.all([
      this.prisma.sharedGroup.findUnique({ where: { id: groupId } }),
      this.prisma.sharedExpense.findMany({
        where: { groupId },
        include: {
          splits: { include: { user: { select: { firstName: true, lastName: true } } } },
          payer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: { select: { firstName: true, lastName: true } },
          toUser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sharedGroupMember.findMany({
        where: { groupId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.groupChatMessage.findMany({
        where: { groupId },
        include: { sender: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'report_exported',
        triggeredBy: userId,
        metadata: { exportedAt: new Date().toISOString() },
      },
    });

    return {
      group: {
        name: group.name,
        type: group.type,
        status: group.status,
        createdAt: group.createdAt,
      },
      summary: {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((s, e) => s + Number(e.amount), 0),
        totalSettlements: settlements.length,
        members: members.length,
        messages: messages.length,
        completedSettlements: settlements.filter((s) => s.status === 'completed').length,
      },
      expenses: expenses.map((e) => ({
        date: e.date,
        description: e.description,
        amount: Number(e.amount),
        category: e.category,
        paidBy: `${e.payer.firstName} ${e.payer.lastName}`,
        splitType: e.splitType,
        splits: e.splits.map((s) => ({
          user: `${s.user.firstName} ${s.user.lastName}`,
          amount: Number(s.amount),
        })),
      })),
      settlements: settlements.map((s) => ({
        from: `${s.fromUser.firstName} ${s.fromUser.lastName}`,
        to: `${s.toUser.firstName} ${s.toUser.lastName}`,
        amount: Number(s.amount),
        status: s.status,
        method: s.method,
        date: s.createdAt,
      })),
      members: members.map((m) => ({
        name: `${m.user.firstName} ${m.user.lastName}`,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
        isActive: m.isActive,
      })),
    };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private async verifyAdmin(groupId: string, userId: string) {
    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Group not found or not a member');
    }
    if (member.role !== 'admin') {
      throw new ForbiddenException('Only admins can perform this action');
    }
    return member;
  }

  private async buildEqualSplits(groupId: string, amount: number, excludeUserId: string) {
    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true, userId: { not: excludeUserId } },
      select: { userId: true },
    });
    const allSplitUsers = [excludeUserId, ...members.map((m) => m.userId)];
    const perPerson = amount / allSplitUsers.length;
    return allSplitUsers.map((userId) => ({
      userId,
      amount: perPerson,
      percentage: null,
      shares: null,
    }));
  }

  // ─── Couple Incomes ──────────────────────────────────────────

  async getCoupleIncomes(groupId: string) {
    const profile = await this.getCoupleProfileOrThrow(groupId);
    const incomes = await this.prisma.coupleFinanceIncome.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    const totalMonthlyIncome = incomes
      .filter((i) => {
        const d = new Date(i.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + Number(i.amount), 0);

    const partner1Incomes = incomes
      .filter((i) => i.assignedTo === profile.partner1Id)
      .reduce((s, i) => s + Number(i.amount), 0);

    const partner2Incomes = incomes
      .filter((i) => i.assignedTo === profile.partner2Id)
      .reduce((s, i) => s + Number(i.amount), 0);

    const unassignedIncomes = incomes
      .filter((i) => !i.assignedTo)
      .reduce((s, i) => s + Number(i.amount), 0);

    return {
      incomes: incomes.map((i) => ({ ...i, amount: Number(i.amount) })),
      summary: {
        totalMonthly: totalMonthlyIncome,
        partner1Total: partner1Incomes,
        partner2Total: partner2Incomes,
        unassignedTotal: unassignedIncomes,
      },
    };
  }

  async createCoupleIncome(groupId: string, userId: string, dto: CreateCoupleIncomeDto) {
    await this.getCoupleProfileOrThrow(groupId);

    const income = await this.prisma.coupleFinanceIncome.create({
      data: {
        groupId,
        amount: dto.amount,
        source: dto.source,
        type: dto.type || 'salary',
        categoryId: dto.categoryId || null,
        assignedTo: dto.assignedTo || null,
        date: dto.date ? new Date(dto.date) : new Date(),
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return { ...income, amount: Number(income.amount) };
  }

  // ─── Couple Budgets ──────────────────────────────────────────

  async getCoupleBudgets(groupId: string) {
    const profile = await this.getCoupleProfileOrThrow(groupId);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyExpenses = expenses.filter((e) => new Date(e.date) >= startOfMonth);
    const totalSpent = monthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalBudget = Number(profile.sharedBudget || 0);

    const categoryMap = new Map<string, number>();
    for (const exp of monthlyExpenses) {
      const cat = exp.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
    }

    const categoryBudgets = await this.prisma.coupleBudgetCategory.findMany({
      where: { groupId, period },
    });

    const categories = Array.from(categoryMap.entries()).map(([category, spent]) => {
      const budgetRow = categoryBudgets.find((cb) => cb.category === category);
      const budget = budgetRow
        ? Number(budgetRow.budgetAmount)
        : Math.round(totalBudget / Math.max(categoryMap.size, 1));
      return {
        category,
        budget,
        spent: Math.round(spent),
        percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
        status:
          budget > 0
            ? spent / budget > 0.9
              ? 'Exceeded'
              : spent / budget > 0.7
                ? 'Warning'
                : 'Normal'
            : 'Normal',
      };
    });

    return {
      currentMonth: {
        period,
        totalBudget,
        totalSpent: Math.round(totalSpent),
        remaining: Math.max(totalBudget - Math.round(totalSpent), 0),
        percentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      },
      categories,
    };
  }

  // ─── Couple Savings ──────────────────────────────────────────

  async getCoupleSavings(groupId: string) {
    const profile = await this.getCoupleProfileOrThrow(groupId);

    const savingsEntries = await this.prisma.coupleFinanceSaving.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      include: {
        contributor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const goal = Number(profile.savingsGoal || 0);
    const totalSaved = savingsEntries.reduce((s, e) => s + Number(e.amount), 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthSaved = savingsEntries
      .filter((e) => e.date >= startOfMonth)
      .reduce((s, e) => s + Number(e.amount), 0);

    const partner1Id = profile.partner1Id;
    const partner1Contributed = savingsEntries
      .filter((e) => e.contributedBy === partner1Id)
      .reduce((s, e) => s + Number(e.amount), 0);
    const partner2Contributed = savingsEntries
      .filter((e) => e.contributedBy === profile.partner2Id)
      .reduce((s, e) => s + Number(e.amount), 0);

    return {
      goal: {
        targetAmount: goal,
        savedAmount: totalSaved,
        percentage: goal > 0 ? Math.round((totalSaved / goal) * 100) : 0,
      },
      partners: {
        partner1: {
          name:
            `${profile.partner1.firstName || ''} ${profile.partner1.lastName || ''}`.trim() ||
            'Partner 1',
          contributed: partner1Contributed,
        },
        partner2: {
          name:
            `${profile.partner2.firstName || ''} ${profile.partner2.lastName || ''}`.trim() ||
            'Partner 2',
          contributed: partner2Contributed,
        },
      },
      contributions: savingsEntries.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        date: e.date,
        notes: e.notes,
        contributor: e.contributor,
      })),
      stats: {
        totalSaved,
        thisMonthSaved,
        remaining: Math.max(goal - totalSaved, 0),
      },
    };
  }

  async contributeToCoupleSavings(
    groupId: string,
    userId: string,
    dto: CoupleSavingsContributeDto,
  ) {
    await this.getCoupleProfileOrThrow(groupId);

    const saving = await this.prisma.coupleFinanceSaving.create({
      data: {
        groupId,
        amount: dto.amount,
        contributedBy: userId,
        notes: dto.notes,
      },
      include: {
        contributor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { ...saving, amount: Number(saving.amount) };
  }

  // ─── Couple Settlements ──────────────────────────────────────

  async getCoupleSettlements(groupId: string) {
    const profile = await this.getCoupleProfileOrThrow(groupId);

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: { splits: true },
      orderBy: { date: 'desc' },
    });

    const settlements = await this.prisma.settlement.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const balances = this.settlementEngine.calculateBalances(expenses, [
      { userId: profile.partner1Id, user: profile.partner1 },
      { userId: profile.partner2Id, user: profile.partner2 },
    ]);

    const partner1Balance = balances.find((b) => b.userId === profile.partner1Id);
    const partner2Balance = balances.find((b) => b.userId === profile.partner2Id);

    let owes: 'partner1' | 'partner2' | null = null;
    let netAmount = 0;
    if (partner1Balance && partner2Balance) {
      const diff = partner1Balance.balance - partner2Balance.balance;
      if (diff > 0) {
        owes = 'partner2';
        netAmount = Math.abs(diff);
      } else if (diff < 0) {
        owes = 'partner1';
        netAmount = Math.abs(diff);
      }
    }

    const outstanding = expenses
      .filter((e) => {
        const hasUnsettledSplit = e.splits?.some((s) => !s.isPaid && s.userId !== e.paidBy);
        return hasUnsettledSplit;
      })
      .map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        paidBy: e.paidBy,
        date: e.date,
      }));

    return {
      balance: {
        owes,
        netAmount,
        partner1Balance: partner1Balance?.balance || 0,
        partner2Balance: partner2Balance?.balance || 0,
      },
      settlements: settlements.map((s) => ({
        id: s.id,
        fromUserId: s.fromUserId,
        toUserId: s.toUserId,
        amount: Number(s.amount),
        status: s.status,
        method: s.method,
        date: s.createdAt,
        fromUser: s.fromUser,
        toUser: s.toUser,
      })),
      outstanding,
    };
  }

  async coupleSettleUp(groupId: string, userId: string) {
    const profile = await this.getCoupleProfileOrThrow(groupId);
    const partnerId = profile.partner1Id === userId ? profile.partner2Id : profile.partner1Id;

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { name: true, createdBy: true },
    });

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: { splits: true },
    });

    const balances = this.settlementEngine.calculateBalances(expenses, [
      { userId: profile.partner1Id, user: profile.partner1 },
      { userId: profile.partner2Id, user: profile.partner2 },
    ]);

    const currentBalance = balances.find((b) => b.userId === userId);
    if (!currentBalance || currentBalance.balance >= 0) {
      throw new BadRequestException('You have no outstanding balance to settle');
    }

    const amount = Math.abs(currentBalance.balance);
    const fromUserId = currentBalance.userId;
    const toUserId = partnerId;

    const settlement = await this.prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount,
        method: 'couple_settle_up',
        status: 'completed',
        settledAt: new Date(),
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.expenseSplit.updateMany({
      where: {
        expense: { groupId },
        user: { id: fromUserId },
        isPaid: false,
      },
      data: { isPaid: true },
    });

    const fromName = `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim();
    try {
      await this.notificationService.create({
        userId: group?.createdBy || partnerId,
        type: 'settlement_complete' as any,
        title: 'Settlement Completed',
        message: `Couple settled up ₹${amount.toLocaleString('en-IN')}`,
        data: {
          groupId,
          groupName: group?.name || 'Couple',
          amount,
          paidBy: fromName,
          paidTo: settlement.toUser.firstName,
        },
        priority: 'high',
      });
      await this.notificationService.create({
        userId: partnerId,
        type: 'settlement_complete' as any,
        title: 'Settlement Completed',
        message: `${fromName} settled ₹${amount.toLocaleString('en-IN')} with you`,
        data: {
          groupId,
          groupName: group?.name || 'Couple',
          amount,
          paidBy: fromName,
          paidTo: settlement.toUser.firstName,
        },
        priority: 'high',
      });
    } catch (e) {
      this.logger.warn('Failed to send couple settlement notification', e);
    }

    return { ...settlement, amount: Number(settlement.amount) };
  }

  // ─── Couple Reports ──────────────────────────────────────────

  async getCoupleReports(groupId: string, period: string) {
    const profile = await this.getCoupleProfileOrThrow(groupId);

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const expenses = await this.prisma.sharedExpense.findMany({
      where: {
        groupId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    const incomes = await this.prisma.coupleFinanceIncome.findMany({
      where: {
        groupId,
        date: { gte: startDate },
      },
    });

    const savings = await this.prisma.coupleFinanceSaving.findMany({
      where: {
        groupId,
        date: { gte: startDate },
      },
    });

    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalSaved = savings.reduce((s, e) => s + Number(e.amount), 0);

    const categoryBreakdown = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryBreakdown.set(cat, (categoryBreakdown.get(cat) || 0) + Number(exp.amount));
    }

    const sortedCategories = Array.from(categoryBreakdown.entries())
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);

    const partner1Paid = expenses
      .filter((e) => e.paidBy === profile.partner1Id)
      .reduce((s, e) => s + Number(e.amount), 0);
    const partner2Paid = expenses
      .filter((e) => e.paidBy === profile.partner2Id)
      .reduce((s, e) => s + Number(e.amount), 0);

    const budget = Number(profile.sharedBudget || 0);
    const budgetSpent = Math.round(totalExpense);
    let budgetStatus = 'On Track';
    if (budget > 0) {
      const pct = budgetSpent / budget;
      budgetStatus = pct > 1 ? 'Over Budget' : pct > 0.85 ? 'At Risk' : 'On Track';
    }

    return {
      period,
      totalIncome: Math.round(totalIncome),
      totalExpense: budgetSpent,
      netSavings: Math.round(totalIncome - totalExpense),
      categoryBreakdown: sortedCategories,
      partnerContribution: {
        partner1Name:
          `${profile.partner1.firstName || ''} ${profile.partner1.lastName || ''}`.trim() ||
          'Partner 1',
        partner1Amount: Math.round(partner1Paid),
        partner2Name:
          `${profile.partner2.firstName || ''} ${profile.partner2.lastName || ''}`.trim() ||
          'Partner 2',
        partner2Amount: Math.round(partner2Paid),
        totalExpense: budgetSpent,
      },
      budgetStatus: {
        status: budgetStatus,
        spent: budgetSpent,
        budget: Math.round(budget),
        percentage: budget > 0 ? Math.round((budgetSpent / budget) * 100) : 0,
      },
      totalSaved: Math.round(totalSaved),
      expenseCount: expenses.length,
      incomeCount: incomes.length,
    };
  }

  // ─── Group Settings ──────────────────────────────────────────

  async getGroupSettings(groupId: string) {
    const profile = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
      include: {
        partner1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        partner2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Couple profile not found');
    }

    const notificationPrefsRaw = await this.prisma.groupSetting.findUnique({
      where: { groupId },
    });

    return {
      monthlyBudget: Number(profile.sharedBudget || 0),
      splitRatio: profile.splitRatio,
      savingsGoal: Number(profile.savingsGoal || 0),
      contributionType: profile.contributionType,
      notificationPreferences: notificationPrefsRaw?.notificationPreferences || {
        newExpenses: true,
        budgetAlerts: true,
        billReminders: true,
        goalProgress: true,
      },
      profile: {
        partner1: profile.partner1,
        partner2: profile.partner2,
        startDate: profile.startDate,
      },
    };
  }

  async updateGroupSettings(groupId: string, userId: string, dto: UpdateGroupSettingsDto) {
    const profile = await this.getCoupleProfileOrThrow(groupId);

    const updateData: any = {};
    if (dto.monthlyBudget !== undefined) {
      updateData.sharedBudget = dto.monthlyBudget;
    }
    if (dto.splitRatio !== undefined) {
      updateData.splitRatio = dto.splitRatio;
    }
    if (dto.savingsGoal !== undefined) {
      updateData.savingsGoal = dto.savingsGoal;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.coupleFinanceProfile.update({
        where: { groupId },
        data: updateData,
      });
    }

    if (dto.notificationPreferences) {
      await this.prisma.groupSetting.upsert({
        where: { groupId },
        create: { groupId, notificationPreferences: dto.notificationPreferences },
        update: { notificationPreferences: dto.notificationPreferences },
      });
    }

    return { message: 'Settings updated successfully' };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async getCoupleProfileOrThrow(groupId: string) {
    const profile = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
      include: {
        partner1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        partner2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException('Couple profile not found. Create a couple group first.');
    }
    return profile;
  }

  private async updateGroupTotalSpent(groupId: string) {
    const result = await this.prisma.sharedExpense.aggregate({
      where: { groupId },
      _sum: { amount: true },
    });

    await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: { totalSpent: result._sum.amount || 0 },
    });
  }
}

function getGroupAiTip(type: string, expenseCount: number, memberCount: number): string {
  const tips: Record<string, string> = {
    couple: expenseCount > 0
      ? 'Track shared expenses to stay aligned on your financial goals.'
      : 'Start tracking shared expenses to see your combined spending patterns.',
    family: 'Set up a monthly budget to manage household expenses together.',
    trip: 'Split trip expenses as they happen to avoid awkward settlements later.',
    friends: 'Use the settle-up feature to keep group expenses fair and transparent.',
  };
  return tips[type] || 'Collaborate on shared goals and budgets to build wealth together.';
}
