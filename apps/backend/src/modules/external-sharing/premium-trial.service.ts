import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StartTrialDto } from './dto/start-trial.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ClaimReferralDto } from './dto/claim-referral.dto';

const TRIAL_DURATION_DAYS: Record<string, number> = {
  first_month_free: 30,
  referral: 30,
  trip_completion: 14,
  conversion_reward: 30,
  onboarding_bonus: 7,
};

@Injectable()
export class PremiumTrialService {
  private readonly logger = new Logger(PremiumTrialService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startTrial(dto: StartTrialDto) {
    const tempUser = await this.prisma.tempUser.findUnique({ where: { id: dto.tempUserId } });
    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    if (tempUser.convertedToUserId) {
      throw new BadRequestException('User already converted, use full user account');
    }

    const existingActive = await this.prisma.premiumTrial.findFirst({
      where: { tempUserId: dto.tempUserId, status: 'active' },
    });

    if (existingActive) {
      throw new ConflictException('User already has an active trial');
    }

    const durationDays = TRIAL_DURATION_DAYS[dto.trialType] ?? 30;
    const startsAt = new Date();
    const expiresAt = new Date(Date.now() + durationDays * 86400000);

    const trial = await this.prisma.premiumTrial.create({
      data: {
        tempUserId: dto.tempUserId,
        trialType: dto.trialType,
        status: 'active',
        startsAt,
        expiresAt,
        activatedAt: new Date(),
        metadata: dto.metadata ?? undefined,
      },
    });

    this.logger.log(`Started ${dto.trialType} trial for temp user ${dto.tempUserId}, expires ${expiresAt}`);

    return trial;
  }

  async getActiveTrial(tempUserId: string) {
    const trial = await this.prisma.premiumTrial.findFirst({
      where: { tempUserId, status: 'active' },
    });

    if (!trial) {
      return { active: false, message: 'No active trial found' };
    }

    const daysRemaining = Math.max(0, Math.ceil((new Date(trial.expiresAt).getTime() - Date.now()) / 86400000));

    return {
      active: true,
      id: trial.id,
      trialType: trial.trialType,
      startsAt: trial.startsAt,
      expiresAt: trial.expiresAt,
      daysRemaining,
      isExpired: new Date(trial.expiresAt) < new Date(),
    };
  }

  async cancelTrial(trialId: string) {
    const trial = await this.prisma.premiumTrial.findUnique({ where: { id: trialId } });

    if (!trial) {
      throw new NotFoundException('Trial not found');
    }

    if (trial.status !== 'active') {
      throw new BadRequestException('Trial is not active');
    }

    const updated = await this.prisma.premiumTrial.update({
      where: { id: trialId },
      data: { status: 'cancelled' },
    });

    return updated;
  }

  async createReferralLink(dto: CreateReferralDto) {
    let referrerId: string | null = null;
    let referrerTempId: string | null = null;

    if (dto.tempUserId) {
      const tempUser = await this.prisma.tempUser.findUnique({ where: { id: dto.tempUserId } });
      if (!tempUser) {
        throw new NotFoundException('Temp user not found');
      }
      referrerTempId = dto.tempUserId;
    }

    const code = this.generateReferralCode();

    const link = await this.prisma.referralLink.create({
      data: {
        userId: referrerId,
        tempUserId: referrerTempId,
        code,
        isActive: true,
      },
    });

    return link;
  }

  async resolveReferralCode(code: string) {
    const link = await this.prisma.referralLink.findUnique({
      where: { code },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        tempUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    if (!link) {
      throw new NotFoundException('Referral code not found');
    }

    if (!link.isActive) {
      throw new BadRequestException('Referral code is no longer active');
    }

    await this.prisma.referralLink.update({
      where: { id: link.id },
      data: { totalClicks: { increment: 1 } },
    });

    const referrerName = link.tempUser?.displayName
      || (link.user ? `${link.user.firstName} ${link.user.lastName}`.trim() : null)
      || 'Someone';

    return {
      code: link.code,
      referrerName,
      referrerAvatar: link.user?.avatarUrl ?? link.tempUser?.avatarUrl ?? null,
      totalClicks: link.totalClicks + 1,
      totalSignups: link.totalSignups,
      totalConversions: link.totalConversions,
    };
  }

  async claimReferral(dto: ClaimReferralDto) {
    const link = await this.prisma.referralLink.findUnique({
      where: { code: dto.code },
    });

    if (!link) {
      throw new NotFoundException('Referral code not found');
    }

    if (!link.isActive) {
      throw new BadRequestException('Referral link is no longer active');
    }

    const existingClaim = await this.prisma.referralHistory.findFirst({
      where: {
        referralLinkId: link.id,
        referredTempId: dto.tempUserId ?? undefined,
      },
    });

    if (existingClaim) {
      throw new ConflictException('Referral already claimed by this user');
    }

    const history = await this.prisma.referralHistory.create({
      data: {
        referrerUserId: link.userId,
        referrerTempId: link.tempUserId,
        referredTempId: dto.tempUserId ?? null,
        referralLinkId: link.id,
        status: 'converted',
        rewardAmount: 0,
        rewardType: 'premium_month',
        rewardGivenAt: new Date(),
      },
    });

    await this.prisma.referralLink.update({
      where: { id: link.id },
      data: {
        totalSignups: { increment: 1 },
        totalConversions: { increment: 1 },
      },
    });

    if (dto.tempUserId) {
      const existingTrial = await this.prisma.premiumTrial.findFirst({
        where: { tempUserId: dto.tempUserId, trialType: 'referral', status: 'active' },
      });

      if (!existingTrial) {
        const expiresAt = new Date(Date.now() + TRIAL_DURATION_DAYS.referral * 86400000);

        await this.prisma.premiumTrial.create({
          data: {
            tempUserId: dto.tempUserId,
            trialType: 'referral',
            status: 'active',
            startsAt: new Date(),
            expiresAt,
            activatedAt: new Date(),
            metadata: { referredByCode: dto.code, referralHistoryId: history.id },
          },
        });
      }
    }

    return {
      success: true,
      rewardType: 'premium_month',
      message: 'Referral reward claimed successfully',
      historyId: history.id,
    };
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REF';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
