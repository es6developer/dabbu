import {
  Injectable, Logger, BadRequestException, NotFoundException, ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createInvite(createdByUserId: string | null, createdByTempUserId: string | null, dto: CreateInviteDto) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: dto.groupId },
      select: { id: true, name: true, maxMembers: true, _count: { select: { members: true } } },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const token = this.generateToken();
    const shortCode = this.generateShortCode();
    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 3600000)
      : null;

    const permissions = {
      canAddExpenses: dto.permissions?.canAddExpenses ?? true,
      canSettle: dto.permissions?.canSettle ?? true,
      canChat: dto.permissions?.canChat ?? true,
      canUploadBills: dto.permissions?.canUploadBills ?? true,
      canViewHistory: dto.permissions?.canViewHistory ?? true,
      canInviteOthers: dto.permissions?.canInviteOthers ?? false,
    };

    const invite = await this.prisma.inviteLink.create({
      data: {
        groupId: dto.groupId,
        createdByUserId,
        createdByTempUserId,
        token,
        shortCode,
        maxUses: dto.maxUses ?? 0,
        expiresAt,
        ...permissions,
        utmSource: dto.utmSource ?? null,
        utmCampaign: dto.utmCampaign ?? null,
        utmMedium: null,
        deepLinkUrl: `dabbu://join/${shortCode}`,
      },
      include: {
        group: { select: { id: true, name: true, type: true, currency: true } },
      },
    });

    return invite;
  }

  async resolveInvite(token: string) {
    const invite = await this.prisma.inviteLink.findUnique({
      where: { token },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            avatarUrl: true,
            currency: true,
            maxMembers: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.isRevoked) {
      throw new BadRequestException('Invite has been revoked');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    if (invite.maxUses > 0 && invite.useCount >= invite.maxUses) {
      throw new BadRequestException('Invite has reached maximum uses');
    }

    return invite;
  }

  async joinGroup(token: string, tempUserId: string, nickname?: string) {
    const invite = await this.prisma.inviteLink.findUnique({
      where: { token },
      include: {
        group: { select: { id: true, name: true, maxMembers: true, _count: { select: { members: true } } } },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.isRevoked) {
      throw new BadRequestException('Invite has been revoked');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    if (invite.maxUses > 0 && invite.useCount >= invite.maxUses) {
      throw new BadRequestException('Invite has reached maximum uses');
    }

    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
    });

    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    const currentMemberCount = invite.group._count.members;
    if (currentMemberCount >= invite.group.maxMembers) {
      throw new BadRequestException('Group has reached maximum member capacity');
    }

    const existingMembership = await this.prisma.groupMemberTemp.findUnique({
      where: { groupId_tempUserId: { groupId: invite.groupId, tempUserId } },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('Already a member of this group');
      }

      await this.prisma.groupMemberTemp.update({
        where: { id: existingMembership.id },
        data: {
          isActive: true,
          leftAt: null,
          lastActiveAt: new Date(),
          nickname: nickname ?? existingMembership.nickname,
          canAddExpenses: invite.canAddExpenses,
          canSettle: invite.canSettle,
          canChat: invite.canChat,
          canUploadBills: invite.canUploadBills,
        },
      });
    } else {
      await this.prisma.groupMemberTemp.create({
        data: {
          groupId: invite.groupId,
          tempUserId,
          inviteLinkId: invite.id,
          nickname: nickname ?? null,
          role: 'member',
          canAddExpenses: invite.canAddExpenses,
          canSettle: invite.canSettle,
          canChat: invite.canChat,
          canUploadBills: invite.canUploadBills,
        },
      });
    }

    await this.prisma.inviteLink.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 } },
    });

    await this.prisma.tempUser.update({
      where: { id: tempUserId },
      data: {
        groupCount: { increment: 1 },
        lastActiveAt: new Date(),
      },
    });

    await this.prisma.groupActivityEvent.create({
      data: {
        groupId: invite.groupId,
        tempUserId,
        eventType: 'member_joined',
        metadata: { inviteToken: token, nickname },
      },
    });

    return {
      success: true,
      groupId: invite.groupId,
      groupName: invite.group.name,
      role: 'member',
      permissions: {
        canAddExpenses: invite.canAddExpenses,
        canSettle: invite.canSettle,
        canChat: invite.canChat,
        canUploadBills: invite.canUploadBills,
        canViewHistory: invite.canViewHistory,
        canInviteOthers: invite.canInviteOthers,
      },
    };
  }

  async updateInvite(token: string, updates: { maxUses?: number; expiresInHours?: number; permissions?: any }) {
    const invite = await this.prisma.inviteLink.findUnique({ where: { token } });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.isRevoked) {
      throw new BadRequestException('Cannot update a revoked invite');
    }

    const data: any = {};
    if (updates.maxUses !== undefined) data.maxUses = updates.maxUses;
    if (updates.expiresInHours !== undefined) {
      data.expiresAt = new Date(Date.now() + updates.expiresInHours * 3600000);
    }
    if (updates.permissions) {
      if (updates.permissions.canAddExpenses !== undefined) data.canAddExpenses = updates.permissions.canAddExpenses;
      if (updates.permissions.canSettle !== undefined) data.canSettle = updates.permissions.canSettle;
      if (updates.permissions.canChat !== undefined) data.canChat = updates.permissions.canChat;
      if (updates.permissions.canUploadBills !== undefined) data.canUploadBills = updates.permissions.canUploadBills;
      if (updates.permissions.canViewHistory !== undefined) data.canViewHistory = updates.permissions.canViewHistory;
      if (updates.permissions.canInviteOthers !== undefined) data.canInviteOthers = updates.permissions.canInviteOthers;
    }

    const updated = await this.prisma.inviteLink.update({
      where: { id: invite.id },
      data,
    });

    return updated;
  }

  async revokeInvite(token: string) {
    const invite = await this.prisma.inviteLink.findUnique({ where: { token } });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.inviteLink.update({
      where: { id: invite.id },
      data: { isRevoked: true },
    });

    return { success: true, message: 'Invite revoked successfully' };
  }

  async getQrCodeData(token: string) {
    const invite = await this.prisma.inviteLink.findUnique({
      where: { token },
      select: { id: true, token: true, shortCode: true, deepLinkUrl: true, groupId: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return {
      qrData: invite.deepLinkUrl || `dabbu://join/${invite.shortCode || invite.token}`,
      deepLink: invite.deepLinkUrl,
      shortCode: invite.shortCode,
      inviteUrl: `https://dabbu.app/join/${invite.shortCode || invite.token}`,
    };
  }

  async validateToken(token: string) {
    try {
      const invite = await this.resolveInvite(token);
      return {
        valid: true,
        groupId: invite.groupId,
        groupName: invite.group.name,
        permissions: {
          canAddExpenses: invite.canAddExpenses,
          canSettle: invite.canSettle,
          canChat: invite.canChat,
          canUploadBills: invite.canUploadBills,
          canViewHistory: invite.canViewHistory,
          canInviteOthers: invite.canInviteOthers,
        },
        expiresAt: invite.expiresAt,
        useCount: invite.useCount,
        maxUses: invite.maxUses,
      };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateShortCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
