import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LifecycleNotificationService } from './lifecycle-notification.service';
import { RevocationService } from './revocation.service';
import { RestrictionType, RemovalType, RevocationType } from './lifecycle.types';
import { AddRestrictionDto } from './dto/lifecycle.dto';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: LifecycleNotificationService,
    private readonly revocationService: RevocationService,
  ) {}

  async removeTempMember(groupId: string, tempId: string, removedBy: string, reason?: string) {
    const membership = await this.prisma.groupMemberTemp.findUnique({
      where: { id: tempId },
      include: {
        tempUser: true,
        group: { select: { id: true, name: true } },
      },
    });

    if (!membership || membership.groupId !== groupId) {
      throw new NotFoundException('Temp member not found in this group');
    }

    if (!membership.isActive) {
      throw new BadRequestException('Temp member is already inactive');
    }

    await this.prisma.groupMemberTemp.update({
      where: { id: membership.id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy,
        removalReason: reason || 'admin_removed',
      },
    });

    await this.revocationService.disconnectSocket(membership.tempUserId, groupId, 'member_removed');

    await this.prisma.sessionRevocation.create({
      data: {
        targetTempId: membership.tempUserId,
        groupId,
        revocationType: 'member_removed',
        revokedSessionToken: membership.tempUser.sessionToken,
        revokedSocketIds: this.revocationService.getTempSocketIds(membership.tempUserId),
        isProcessed: true,
        processedAt: new Date(),
      },
    });

    await this.prisma.groupMemberRemovalLog.create({
      data: {
        groupId,
        removedTempId: membership.tempUserId,
        removedBy,
        removalType: 'admin_removed',
        reason: reason || 'Removed by admin',
        wasTempUser: true,
        hadOutstandingBalance: false,
        settledBeforeRemoval: false,
      },
    });

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'member_removed',
        triggeredBy: removedBy,
        targetUserId: null,
        metadata: { tempUserId: membership.tempUserId, reason },
      },
    });

    await this.notificationService.notifyMemberRemoved(
      groupId,
      membership.group.name,
      null,
      membership.tempUserId,
      removedBy,
    );

    this.logger.log(`Temp member ${membership.tempUserId} removed from group ${groupId}`);

    return {
      success: true,
      tempId: membership.id,
      hadOutstandingBalance: false,
      outstandingAmount: null,
    };
  }

  async removeFullMember(groupId: string, userId: string, removedBy: string, reason?: string) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId, isActive: true, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this group');
    }

    if (membership.role === 'owner') {
      throw new BadRequestException('Cannot remove the group owner');
    }

    await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { isActive: false, leftAt: new Date() },
    });

    const balance = await this.getFullUserBalance(groupId, userId);
    const hadBalance = balance !== null && balance !== 0;
    const outstandingAmount = hadBalance ? Math.abs(balance) : null;

    await this.prisma.groupMemberRemovalLog.create({
      data: {
        groupId,
        removedUserId: userId,
        removedBy,
        removalType: 'admin_removed',
        reason: reason || 'Removed by admin',
        wasTempUser: false,
        hadOutstandingBalance: hadBalance,
        outstandingAmount,
        settledBeforeRemoval: false,
      },
    });

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'member_removed',
        triggeredBy: removedBy,
        targetUserId: userId,
        metadata: { reason, hadBalance, outstandingAmount },
      },
    });

    await this.notificationService.notifyMemberRemoved(
      groupId,
      membership.group.name,
      userId,
      null,
      removedBy,
    );

    this.logger.log(`Full member ${userId} removed from group ${groupId}`);

    return {
      success: true,
      memberId: membership.id,
      hadOutstandingBalance: hadBalance,
      outstandingAmount,
    };
  }

  async addAccessRestriction(groupId: string, appliedBy: string, dto: AddRestrictionDto) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 3600000)
      : null;

    const restriction = await this.prisma.groupAccessRestriction.create({
      data: {
        groupId,
        restrictionType: dto.restrictionType,
        appliedTo: dto.appliedTo,
        targetUserId: dto.targetUserId ?? null,
        targetTempId: dto.targetTempId ?? null,
        reason: dto.reason ?? null,
        appliedBy,
        expiresAt,
      },
    });

    this.logger.log(`Access restriction ${dto.restrictionType} added to group ${groupId}`);

    return restriction;
  }

  async listRestrictions(groupId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.groupAccessRestriction.findMany({
      where: { groupId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeRestriction(groupId: string, restrictionId: string) {
    const restriction = await this.prisma.groupAccessRestriction.findFirst({
      where: { id: restrictionId, groupId, isActive: true },
    });
    if (!restriction) throw new NotFoundException('Active restriction not found');

    await this.prisma.groupAccessRestriction.update({
      where: { id: restrictionId },
      data: { isActive: false, removedAt: new Date() },
    });

    return { success: true, message: 'Restriction removed' };
  }

  async revokeInvite(token: string, reason?: string) {
    await this.revocationService.revokeInvite(token, reason);
    return { success: true, message: 'Invite revoked successfully' };
  }

  async getRemovalLogs(groupId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.groupMemberRemovalLog.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getFullUserBalance(groupId: string, userId: string): Promise<number | null> {
    try {
      const member = await this.prisma.groupMember.findFirst({
        where: { groupId, userId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (!member) return null;

      const expenses = await this.prisma.groupExpense.aggregate({
        where: { groupId, paidByMemberId: member.id, deletedAt: null },
        _sum: { amount: true },
      });

      const paid = expenses._sum.amount ? Number(expenses._sum.amount) : 0;

      const sentSettlements = await this.prisma.settlement.aggregate({
        where: { groupId, fromMemberId: member.id },
        _sum: { amount: true },
      });

      const settled = sentSettlements._sum.amount ? Number(sentSettlements._sum.amount) : 0;

      return paid - settled;
    } catch {
      return null;
    }
  }
}
