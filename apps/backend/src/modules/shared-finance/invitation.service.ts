import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createInvitation(groupId: string, invitedByUserId: string, email: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
    });
    if (!group || group.deletedAt) {
      throw new NotFoundException('Group not found');
    }
    if (group.status !== 'active') {
      throw new BadRequestException('Group is no longer active');
    }

    const memberCount = await this.prisma.groupMember.count({
      where: { groupId, isActive: true, deletedAt: null },
    });
    if (memberCount >= group.maxMembers) {
      const requester = await this.prisma.user.findUnique({
        where: { id: invitedByUserId },
        select: { role: true },
      });
      const isPremium =
        requester?.role === 'premium' ||
        requester?.role === 'admin' ||
        requester?.role === 'super_admin';
      if (isPremium) {
        throw new BadRequestException(
          `Group member limit of ${group.maxMembers} reached. Upgrade to increase limit.`,
        );
      }
      throw new BadRequestException(
        `Free plan limit of ${group.maxMembers} members reached. Upgrade to Premium to add up to 30 members.`,
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
    });

    if (existingUser) {
      const existingMember = await this.prisma.groupMember.findFirst({
        where: { groupId, userId: existingUser.id, deletedAt: null },
      });
      if (existingMember && existingMember.isActive) {
        throw new ConflictException('This email is already a member of the group');
      }
    }

    const pendingInvitation = await this.prisma.groupInvitation.findFirst({
      where: { groupId, email, status: 'pending', expiresAt: { gte: new Date() } },
    });
    if (pendingInvitation) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.groupInvitation.create({
      data: {
        groupId,
        email,
        invitedBy: invitedByUserId,
        expiresAt,
      },
    });

    if (existingUser) {
      await this.notificationService.create({
        userId: existingUser.id,
        type: 'family' as any,
        title: `You're invited to "${group.name}"`,
        body: `You have been invited to join "${group.name}" on Dabbu. Accept or decline the invitation in the app.`,
        data: {
          groupId,
          groupName: group.name,
          invitationId: invitation.id,
          action: 'group_invitation',
        },
      });
    }

    this.logger.log(`Invitation created for ${email} to group ${group.name}`);

    return {
      data: {
        id: invitation.id,
        groupId: invitation.groupId,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    };
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { group: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation is no longer pending');
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.email !== invitation.email) {
      throw new ForbiddenException('This invitation was sent to a different email');
    }

    const existingMember = await this.prisma.groupMember.findFirst({
      where: { groupId: invitation.groupId, userId, deletedAt: null },
    });
    if (existingMember && existingMember.isActive) {
      await this.prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' },
      });
      return { data: { message: 'Already a member of this group', memberId: existingMember.id } };
    }

    if (existingMember) {
      await this.prisma.groupMember.update({
        where: { id: existingMember.id },
        data: { isActive: true, deletedAt: null, leftAt: null },
      });
    } else {
      await this.prisma.groupMember.create({
        data: { groupId: invitation.groupId, userId, role: 'member' },
      });
    }

    await this.prisma.groupInvitation.update({
      where: { id: invitationId },
      data: { status: 'accepted' },
    });

    this.logger.log(`User ${userId} accepted invitation to group ${invitation.groupId}`);

    return { data: { message: 'Invitation accepted' } };
  }

  async rejectInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation is no longer pending');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.email !== invitation.email) {
      throw new ForbiddenException('This invitation was sent to a different email');
    }

    await this.prisma.groupInvitation.update({
      where: { id: invitationId },
      data: { status: 'rejected' },
    });

    this.logger.log(`User ${userId} rejected invitation to group ${invitation.groupId}`);

    return { data: { message: 'Invitation rejected' } };
  }

  async getPendingInvitations(email: string) {
    const invitations = await this.prisma.groupInvitation.findMany({
      where: {
        email,
        status: 'pending',
        expiresAt: { gte: new Date() },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            avatarUrl: true,
            memberCount: true,
            ownerId: true,
          },
        },
      },
    });

    const invitationsWithMemberCount = await Promise.all(
      invitations.map(async (inv) => ({
        ...inv,
        group: {
          ...inv.group,
          memberCount: await this.prisma.groupMember.count({
            where: { groupId: inv.groupId, isActive: true, deletedAt: null },
          }),
        },
      })),
    );

    return { data: invitationsWithMemberCount };
  }

  async cancelInvitation(groupId: string, userId: string, invitationId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || member.deletedAt || !member.isActive) {
      throw new ForbiddenException('Not a member of this group');
    }
    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Only admins can cancel invitations');
    }

    const invitation = await this.prisma.groupInvitation.findFirst({
      where: { id: invitationId, groupId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation is no longer pending');
    }

    await this.prisma.groupInvitation.update({
      where: { id: invitationId },
      data: { status: 'expired' },
    });

    this.logger.log(`Invitation ${invitationId} cancelled by user ${userId}`);

    return { data: { message: 'Invitation cancelled' } };
  }
}
