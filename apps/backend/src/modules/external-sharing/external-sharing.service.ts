import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InviteExternalMemberDto } from './dto/external-sharing.dto';

export interface TempTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class ExternalSharingService {
  private readonly logger = new Logger(ExternalSharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async inviteExternalMember(
    dto: InviteExternalMemberDto,
  ): Promise<{ inviteToken: string; tempUserId: string }> {
    const group = await this.prisma.sharedGroup.findUnique({ where: { id: dto.groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    let tempUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (tempUser) {
      if (tempUser.status === 'active') {
        const alreadyMember = await this.prisma.sharedGroupMember.findUnique({
          where: { groupId_userId: { groupId: dto.groupId, userId: tempUser.id } },
        });
        if (alreadyMember) {
          throw new ConflictException('User is already a member of this group');
        }
        await this.prisma.sharedGroupMember.create({
          data: { groupId: dto.groupId, userId: tempUser.id, role: 'member' },
        });
        return { inviteToken: '', tempUserId: tempUser.id };
      }
      if (tempUser.status === 'temporary' && tempUser.tempGroupId !== dto.groupId) {
        throw new ConflictException('This email is already linked to a different group invitation');
      }
    }

    if (!tempUser) {
      tempUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: crypto.randomBytes(32).toString('hex'),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'user',
          status: 'temporary',
          authProvider: 'google',
          tempGroupId: dto.groupId,
        },
      });
    }

    await this.prisma.sharedGroupMember.create({
      data: { groupId: dto.groupId, userId: tempUser.id, role: 'member' },
    });

    const inviteToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.tempInvite.create({
      data: {
        token: inviteToken,
        userId: tempUser.id,
        groupId: dto.groupId,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    return { inviteToken, tempUserId: tempUser.id };
  }

  async googleAuthAsTemp(
    idToken: string,
    groupId: string,
  ): Promise<{ user: any; tokens: TempTokens }> {
    const googlePayload = await this.verifyGoogleToken(idToken);
    if (!googlePayload || !googlePayload.email) {
      throw new BadRequestException('Invalid Google token');
    }

    let user = await this.prisma.user.findUnique({ where: { email: googlePayload.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googlePayload.email,
          password: crypto.randomBytes(32).toString('hex'),
          firstName: googlePayload.given_name || 'Guest',
          lastName: googlePayload.family_name || 'User',
          role: 'user',
          status: 'temporary',
          authProvider: 'google',
          tempGroupId: groupId,
          avatarUrl: googlePayload.picture || null,
        },
      });

      await this.prisma.sharedGroupMember.create({
        data: { groupId, userId: user.id, role: 'member' },
      });
    }

    if (user.status !== 'temporary' && user.authProvider !== 'google') {
      throw new ConflictException(
        'An active account already exists with this email. Please log in through the mobile app.',
      );
    }

    if (user.status === 'temporary' && user.tempGroupId !== groupId) {
      const membership = await this.prisma.sharedGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });
      if (!membership) {
        await this.prisma.sharedGroupMember.create({
          data: { groupId, userId: user.id, role: 'member' },
        });
      }
    }

    const tokens = await this.generateTempTokens(user.id, user.email, groupId);

    const { password, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async getTempProfile(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        status: true,
        authProvider: true,
        tempGroupId: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async validateInviteToken(
    token: string,
  ): Promise<{ valid: boolean; groupId?: string; userId?: string }> {
    const invite = await this.prisma.tempInvite.findUnique({ where: { token } });
    if (!invite || invite.expiresAt < new Date() || invite.usedAt) {
      return { valid: false };
    }
    return { valid: true, groupId: invite.groupId, userId: invite.userId };
  }

  async convertTempToFullUser(tempUserId: string, fullUserId: string): Promise<void> {
    const tempUser = await this.prisma.user.findUnique({ where: { id: tempUserId } });
    if (!tempUser || tempUser.status !== 'temporary') {
      throw new BadRequestException('Invalid temporary user');
    }

    const fullUser = await this.prisma.user.findUnique({ where: { id: fullUserId } });
    if (!fullUser || fullUser.status !== 'active') {
      throw new BadRequestException('Target account is not an active full user');
    }

    if (tempUser.email !== fullUser.email) {
      throw new BadRequestException('Email must match between temporary and full account');
    }

    await this.prisma.$transaction(async (tx) => {
      const tempMemberships = await tx.sharedGroupMember.findMany({
        where: { userId: tempUserId },
      });

      for (const membership of tempMemberships) {
        const existing = await tx.sharedGroupMember.findUnique({
          where: { groupId_userId: { groupId: membership.groupId, userId: fullUserId } },
        });
        if (!existing) {
          await tx.sharedGroupMember.create({
            data: {
              groupId: membership.groupId,
              userId: fullUserId,
              role: membership.role,
            },
          });
        }
      }

      await tx.transaction.updateMany({
        where: { userId: tempUserId },
        data: { userId: fullUserId },
      });

      await tx.sharedGroupMember.deleteMany({ where: { userId: tempUserId } });

      await tx.user.update({
        where: { id: tempUserId },
        data: {
          status: 'merged',
          mergedIntoId: fullUserId,
          mergedAt: new Date(),
          isActive: false,
        },
      });
    });

    this.logger.log(`Temporary user ${tempUserId} merged into full user ${fullUserId}`);
  }

  async getGroupLifecycleStatus(groupId: string, userId?: string): Promise<any> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      return { groupId, status: 'CLOSED', hasAccess: false, revocationReason: 'group_closed' };
    }

    const member = userId
      ? await this.prisma.sharedGroupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        })
      : null;

    const hasAccess = member?.isActive ?? false;

    return {
      groupId,
      status: group.status,
      hasAccess,
      revocationReason: hasAccess ? undefined : member ? 'member_removed' : 'invite_expired',
      data: {
        groupName: group.name,
        groupType: group.type,
        totalSpent: Number(group.totalSpent || 0),
        memberCount: await this.prisma.sharedGroupMember.count({
          where: { groupId, isActive: true },
        }),
      },
    };
  }

  async getMemberAccessStatus(groupId: string, userId: string): Promise<any> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      return { isMember: false, restrictions: ['group_not_found'] };
    }

    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member || !member.isActive) {
      return { isMember: false, restrictions: ['no_access'] };
    }

    return { isMember: true, role: member.role, restrictions: [] };
  }

  async getLifecycleEvents(groupId: string): Promise<any[]> {
    return this.prisma.groupLifecycleEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeTempMember(groupId: string, tempUserId: string, reason: string): Promise<void> {
    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: tempUserId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.sharedGroupMember.update({
      where: { id: member.id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removalReason: reason,
      },
    });

    await this.prisma.sessionRevocation.create({
      data: {
        userId: tempUserId,
        groupId,
        reason: reason || 'member_removed',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 86400000),
      },
    });
  }

  async updateGroupStatus(groupId: string, newStatus: string, userId: string): Promise<any> {
    const group = await this.prisma.sharedGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const now = new Date();
    const updateData: any = {
      status: newStatus,
      statusChangedAt: now,
      statusChangedBy: userId,
    };

    switch (newStatus) {
      case 'PAUSED':
        updateData.pausedAt = now;
        break;
      case 'COMPLETED':
        updateData.completedAt = now;
        break;
      case 'ARCHIVED':
        updateData.archivedAt = now;
        break;
      case 'CLOSED':
        updateData.closedAt = now;
        break;
    }

    return this.prisma.sharedGroup.update({ where: { id: groupId }, data: updateData });
  }

  private async generateTempTokens(
    userId: string,
    email: string,
    groupId: string,
  ): Promise<TempTokens> {
    const payload = { sub: userId, email, tempGroupId: groupId, status: 'temporary' };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret')!,
      expiresIn: '7d',
      issuer: this.configService.get<string>('jwt.issuer') || 'dabbu',
      audience: 'dabbu-temp-users',
    });

    const decoded = this.jwtService.verify(accessToken, {
      secret: this.configService.get<string>('jwt.secret')!,
    }) as any;

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(decoded.exp * 1000),
    };
  }

  private async verifyGoogleToken(idToken: string): Promise<{
    email: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  } | null> {
    try {
      const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
      const payload = ticket.getPayload();
      if (!payload) {
        return null;
      }
      return {
        email: payload.email || '',
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };
    } catch (err) {
      this.logger.error('Google token verification failed', err);
      return null;
    }
  }
}
