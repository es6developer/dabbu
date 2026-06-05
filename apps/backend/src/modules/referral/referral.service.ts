import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

const REFERRER_REWARD = 100;
const REFEREE_REWARD = 50;
const MIN_ACTIVITY_DAYS = 3;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  async getOrCreateReferralCode(userId: string): Promise<{ code: string; link: string }> {
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.referralCode) {
      const code = this.generateCode();
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    }

    return {
      code: user.referralCode!,
      link: `https://dabbu.app/refer/${user.referralCode}`,
    };
  }

  async getDashboard(userId: string) {
    const referrals = await this.prisma.referralProgram.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    const rewards = await this.prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      signedUp: referrals.filter((r) => r.status === 'signed_up').length,
      converted: referrals.filter((r) => r.status === 'converted').length,
      rejected: referrals.filter((r) => r.status === 'rejected').length,
      totalEarned: rewards
        .filter((r) => r.status === 'approved')
        .reduce((s, r) => s + Number(r.amount), 0),
      pendingRewards: rewards
        .filter((r) => r.status === 'pending')
        .reduce((s, r) => s + Number(r.amount), 0),
    };

    return { referrals, rewards, stats };
  }

  async getRewardHistory(userId: string) {
    return this.prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referral: {
          select: {
            code: true,
            referee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async trackClick(dto: { code: string; deviceId?: string; ipAddress?: string }) {
    const referrer = await this.prisma.user.findUnique({ where: { referralCode: dto.code } });
    if (!referrer) {
      return null;
    }

    const existing = await this.prisma.referralProgram.findFirst({
      where: { code: dto.code, status: 'pending' },
    });

    if (existing) {
      await this.prisma.referralProgram.update({
        where: { id: existing.id },
        data: {
          linkClickedAt: existing.linkClickedAt ?? new Date(),
          deviceId: existing.deviceId ?? dto.deviceId,
          ipAddress: existing.ipAddress ?? dto.ipAddress,
        },
      });
      return existing;
    }

    return this.prisma.referralProgram.create({
      data: {
        referrerId: referrer.id,
        refereeEmail: '',
        code: dto.code,
        status: 'pending',
        deviceId: dto.deviceId,
        ipAddress: dto.ipAddress,
        linkClickedAt: new Date(),
        referrerRewardAmount: REFERRER_REWARD,
        refereeRewardAmount: REFEREE_REWARD,
      },
    });
  }

  async trackInstall(dto: { code: string; deviceId?: string }) {
    const referral = await this.prisma.referralProgram.findFirst({
      where: { code: dto.code, status: 'pending' },
    });
    if (!referral) {
      return null;
    }

    return this.prisma.referralProgram.update({
      where: { id: referral.id },
      data: {
        appInstalledAt: new Date(),
        deviceId: dto.deviceId ?? referral.deviceId,
      },
    });
  }

  async redeemReferral(dto: {
    code: string;
    userId: string;
    deviceId?: string;
    ipAddress?: string;
  }) {
    const referee = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!referee) {
      throw new BadRequestException('User not found');
    }

    const referrer = await this.prisma.user.findUnique({ where: { referralCode: dto.code } });
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }
    if (referrer.id === dto.userId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    let referral = await this.prisma.referralProgram.findFirst({
      where: { code: dto.code, refereeId: dto.userId },
    });
    if (referral) {
      throw new ConflictException('Referral already redeemed');
    }

    referral = await this.prisma.referralProgram.findFirst({
      where: { code: dto.code, status: 'pending' },
    });

    if (!referral) {
      referral = await this.prisma.referralProgram.create({
        data: {
          referrerId: referrer.id,
          refereeEmail: referee.email,
          code: dto.code,
          status: 'signed_up',
          refereeId: dto.userId,
          deviceId: dto.deviceId,
          ipAddress: dto.ipAddress,
          signedUpAt: new Date(),
          referrerRewardAmount: REFERRER_REWARD,
          refereeRewardAmount: REFEREE_REWARD,
        },
      });
    } else {
      const fraudCheck = await this.runFraudCheck(
        dto.userId,
        referrer.id,
        dto.deviceId,
        dto.ipAddress,
      );
      if (fraudCheck.fraud) {
        await this.prisma.referralProgram.update({
          where: { id: referral.id },
          data: { status: 'rejected', rejectReason: fraudCheck.reason, rejectedAt: new Date() },
        });
        throw new BadRequestException(fraudCheck.reason);
      }

      referral = await this.prisma.referralProgram.update({
        where: { id: referral.id },
        data: {
          refereeId: dto.userId,
          refereeEmail: referee.email,
          status: 'signed_up',
          signedUpAt: new Date(),
          deviceId: dto.deviceId ?? referral.deviceId,
          ipAddress: dto.ipAddress ?? referral.ipAddress,
        },
      });
    }

    return referral;
  }

  async approveReferral(referralId: string) {
    const referral = await this.prisma.referralProgram.findUnique({
      where: { id: referralId },
      include: { referee: true },
    });
    if (!referral || referral.status !== 'signed_up') {
      throw new BadRequestException('Referral not eligible for approval');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const ref = await tx.referralProgram.update({
        where: { id: referralId },
        data: { status: 'converted', convertedAt: new Date() },
      });

      await tx.referralReward.create({
        data: {
          userId: referral.referrerId,
          referralId,
          type: 'referrer_bonus',
          amount: referral.referrerRewardAmount,
          status: 'approved',
          description: `Referral bonus for ${referral.referee?.firstName || 'new user'}`,
          paidAt: new Date(),
        },
      });

      await tx.referralReward.create({
        data: {
          userId: referral.refereeId!,
          referralId,
          type: 'referee_welcome',
          amount: referral.refereeRewardAmount,
          status: 'approved',
          description: 'Welcome bonus for joining via referral',
          paidAt: new Date(),
        },
      });

      await tx.referralProgram.update({
        where: { id: referralId },
        data: {
          referrerRewardPaid: true,
          referrerRewardPaidAt: new Date(),
          refereeRewardPaid: true,
          refereeRewardPaidAt: new Date(),
        },
      });

      return ref;
    });

    return updated;
  }

  async rejectReferral(referralId: string, reason: string) {
    return this.prisma.referralProgram.update({
      where: { id: referralId },
      data: { status: 'rejected', rejectReason: reason, rejectedAt: new Date() },
    });
  }

  async getUserReferrals(userId: string) {
    return this.prisma.referralProgram.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referralProgram.findMany({
      where: { referrerId: userId },
    });

    const totalEarned = await this.prisma.referralReward.aggregate({
      where: { userId, status: 'approved' },
      _sum: { amount: true },
    });

    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      signedUp: referrals.filter((r) => r.status === 'signed_up').length,
      converted: referrals.filter((r) => r.status === 'converted').length,
      rejected: referrals.filter((r) => r.status === 'rejected').length,
      totalEarned: Number(totalEarned._sum.amount || 0),
    };
  }

  private async runFraudCheck(
    refereeId: string,
    referrerId: string,
    deviceId?: string,
    ipAddress?: string,
  ): Promise<{ fraud: boolean; reason?: string }> {
    const existingReferral = await this.prisma.referralProgram.findFirst({
      where: { refereeId, status: { in: ['signed_up', 'converted'] } },
    });
    if (existingReferral) {
      return { fraud: true, reason: 'This account has already been referred by someone else' };
    }

    if (deviceId) {
      const existingDevice = await this.prisma.referralProgram.findFirst({
        where: {
          deviceId,
          status: { in: ['signed_up', 'converted'] },
          refereeId: { not: refereeId },
        },
      });
      if (existingDevice) {
        return { fraud: true, reason: 'Referral already used from this device' };
      }

      const userDevice = await this.prisma.device.findFirst({
        where: { deviceId, userId: referrerId },
      });
      if (userDevice) {
        return { fraud: true, reason: 'Cannot refer yourself (same device detected)' };
      }
    }

    const sameIpReferral = await this.prisma.referralProgram.findFirst({
      where: { ipAddress, status: { in: ['signed_up', 'converted'] }, referrerId },
    });
    if (sameIpReferral && ipAddress) {
      return { fraud: true, reason: 'Referral from same IP address detected' };
    }

    return { fraud: false };
  }

  async processReferralSignup(refereeId: string, code: string) {
    try {
      const result = await this.redeemReferral({ code, userId: refereeId });
      return result;
    } catch {
      return null;
    }
  }

  async claimReward(userId: string, referralId: string) {
    const reward = await this.prisma.referralReward.findFirst({
      where: { id: referralId, userId, status: 'pending' },
    });
    if (!reward) {
      throw new BadRequestException('No claimable reward found');
    }

    return this.prisma.referralReward.update({
      where: { id: reward.id },
      data: { status: 'approved', paidAt: new Date() },
    });
  }

  async claimAllRewards(userId: string) {
    const result = await this.prisma.referralReward.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'approved', paidAt: new Date() },
    });
    return { claimed: result.count };
  }
}
