import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AddMemberContactDto } from './dto/add-member-contact.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import * as crypto from 'crypto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: string, dto: CreateFamilyDto) {
    const existingOwnerFamily = await this.prisma.family.findFirst({
      where: { ownerId: userId, isActive: true },
    });

    if (existingOwnerFamily) {
      throw new ConflictException('You already own a family group');
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        code,
        ownerId: userId,
        maxMembers: dto.maxMembers || 5,
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

    this.logger.log(`Family created: ${family.name} by user ${userId}`);
    return family;
  }

  async getFamily(familyId: string, userId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
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
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }
    this.validateMember(family, userId);
    return family;
  }

  async getUserFamilies(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });
    return memberships.map((m) => m.family);
  }

  async addMemberFromContact(userId: string, dto: AddMemberContactDto) {
    const family = await this.prisma.family.findUnique({ where: { id: dto.familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    const existingUser = await this.prisma.user.findFirst({ where: { phone: dto.phone } });
    if (existingUser) {
      const alreadyMember = await this.prisma.familyMember.findUnique({
        where: { familyId_userId: { familyId: dto.familyId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        throw new ConflictException('User is already a family member');
      }
      return this.prisma.familyMember.create({
        data: {
          familyId: dto.familyId,
          userId: existingUser.id,
          role: 'member',
          ...(dto.relationship ? { relationship: dto.relationship } : {}),
        },
      });
    }
    return this.prisma.familyMember.create({
      data: {
        familyId: dto.familyId,
        userId,
        role: 'member',
        ...(dto.relationship ? { relationship: dto.relationship } : {}),
      },
    });
  }

  async inviteMember(familyId: string, userId: string, dto: InviteMemberDto) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: { _count: { select: { members: true } } },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }
    await this.validateAdmin(family, userId);

    if (family._count.members >= family.maxMembers) {
      throw new BadRequestException('Family member limit reached');
    }

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: invitedUser.id } },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member');
    }

    const member = await this.prisma.familyMember.create({
      data: {
        familyId,
        userId: invitedUser.id,
        role: dto.role || 'member',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    this.logger.log(`User ${invitedUser.email} added to family ${family.name}`);

    const inviterName = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const inviterStr =
      [inviterName?.firstName, inviterName?.lastName].filter(Boolean).join(' ') || 'Someone';
    this.notificationService
      .sendPush(invitedUser.id, 'Added to Family', `${inviterStr} added you to "${family.name}"`, {
        type: 'family_invite',
        familyId,
      })
      .catch((err) => this.logger.error(`Push failed for family invite: ${err.message}`));

    return member;
  }

  async joinByCode(userId: string, code: string) {
    const family = await this.prisma.family.findUnique({
      where: { code },
      include: { _count: { select: { members: true } } },
    });

    if (!family) {
      throw new NotFoundException('Invalid invite code');
    }
    if (!family.isActive) {
      throw new BadRequestException('Family is no longer active');
    }
    if (family._count.members >= family.maxMembers) {
      throw new BadRequestException('Family is full');
    }

    const existingMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: family.id, userId } },
    });

    if (existingMember) {
      throw new ConflictException('Already a member');
    }

    const member = await this.prisma.familyMember.create({
      data: { familyId: family.id, userId, role: 'member' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    this.logger.log(`User joined family ${family.name} via code`);
    return member;
  }

  async regenerateCode(familyId: string, userId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    await this.validateAdmin(family, userId);

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    return this.prisma.family.update({
      where: { id: familyId },
      data: { code },
    });
  }

  async removeMember(familyId: string, userId: string, memberId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    await this.validateAdmin(family, userId);

    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.role === 'owner') {
      throw new BadRequestException('Cannot remove the owner');
    }

    const removedMember = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    await this.prisma.familyMember.delete({ where: { id: memberId } });

    this.notificationService
      .sendPush(
        removedMember!.userId,
        'Removed from Family',
        `You were removed from "${family.name}"`,
        { type: 'family_remove', familyId },
      )
      .catch((err) => this.logger.error(`Push failed for family remove: ${err.message}`));

    this.logger.log(`Member ${memberId} removed from family ${familyId}`);
  }

  async updateMemberRole(familyId: string, userId: string, dto: UpdateMemberRoleDto) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const requester = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!requester || requester.role !== 'owner') {
      throw new ForbiddenException('Only the owner can change roles');
    }

    if (requester.userId === dto.memberId) {
      throw new BadRequestException('Cannot change your own role');
    }

    return this.prisma.familyMember.update({
      where: { id: dto.memberId },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async leaveFamily(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Not a member');
    }
    if (member.role === 'owner') {
      throw new BadRequestException('Transfer ownership before leaving');
    }

    const familyInfo = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true },
    });

    await this.prisma.familyMember.delete({ where: { id: member.id } });

    const leaverName =
      [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') || 'A member';
    const admins = await this.prisma.familyMember.findMany({
      where: { familyId, role: { in: ['owner', 'admin'] }, userId: { not: userId } },
      select: { userId: true },
    });
    for (const admin of admins) {
      this.notificationService
        .sendPush(
          admin.userId,
          'Member Left',
          `${leaverName} left "${familyInfo?.name || 'a family'}"`,
          { type: 'family_leave', familyId },
        )
        .catch((err) => this.logger.error(`Push failed for family leave: ${err.message}`));
    }
  }

  // ─── Shared Tasks ─────────────────────────────────
  async createTask(
    familyId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      assignedToId?: string;
      priority?: string;
      dueDate?: string;
    },
  ) {
    await this.validateMember(await this.getFamilyOrThrow(familyId), userId);
    return this.prisma.sharedTask.create({
      data: {
        familyId,
        createdById: userId,
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId,
        priority: data.priority || 'medium',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async getTasks(familyId: string, userId: string) {
    await this.validateMember(await this.getFamilyOrThrow(familyId), userId);
    return this.prisma.sharedTask.findMany({
      where: { familyId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTaskStatus(familyId: string, taskId: string, userId: string, status: string) {
    await this.validateMember(await this.getFamilyOrThrow(familyId), userId);
    return this.prisma.sharedTask.update({
      where: { id: taskId, familyId },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        completedById: status === 'completed' ? userId : null,
      },
    });
  }

  // ─── Shared Reminders ────────────────────────────
  async createReminder(
    familyId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      remindAt: string;
      isRecurring?: boolean;
      frequency?: string;
    },
  ) {
    await this.validateMember(await this.getFamilyOrThrow(familyId), userId);
    return this.prisma.sharedReminder.create({
      data: {
        familyId,
        createdById: userId,
        title: data.title,
        description: data.description,
        remindAt: new Date(data.remindAt),
        isRecurring: data.isRecurring || false,
        frequency: data.frequency,
      },
    });
  }

  async getReminders(familyId: string, userId: string) {
    await this.validateMember(await this.getFamilyOrThrow(familyId), userId);
    return this.prisma.sharedReminder.findMany({
      where: { familyId },
      orderBy: { remindAt: 'asc' },
    });
  }

  // ─── Shared Subscriptions ────────────────────────
  async getSharedSubscriptions(familyId: string, userId: string) {
    await this.validateMember(await this.getFamilyOrThrow(familyId), userId);
    const memberIds = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });

    return this.prisma.subscription.findMany({
      where: {
        userId: { in: memberIds.map((m) => m.userId) },
        status: 'active',
      },
      include: {
        plan: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────
  private async getFamilyOrThrow(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    return family;
  }

  private async validateMember(family: { id: string; isActive: boolean }, userId: string) {
    if (!family.isActive) {
      throw new BadRequestException('Family is inactive');
    }
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: family.id, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Not a family member');
    }
  }

  private async validateAdmin(family: { id: string }, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: family.id, userId } },
    });
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
