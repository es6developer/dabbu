import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    return 'DABBU-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  async getOrCreateReferralCode(userId: string): Promise<string> {
    const existing = await this.prisma.referralProgram.findFirst({
      where: { referrerId: userId },
      select: { code: true },
    });
    if (existing) return existing.code;

    const code = this.generateCode();
    return code;
  }

  async createInvite(userId: string, refereeEmail: string) {
    const existing = await this.prisma.referralProgram.findFirst({
      where: { referrerId: userId, refereeEmail },
    });
    if (existing) {
      if (existing.status !== 'pending') {
        throw new Error('This email has already been invited');
      }
      return existing;
    }

    const code = this.generateCode();
    return this.prisma.referralProgram.create({
      data: {
        referrerId: userId,
        refereeEmail,
        code,
        rewardDays: 30,
        status: 'pending',
      },
    });
  }

  async getUserReferrals(userId: string) {
    return this.prisma.referralProgram.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referralProgram.findMany({
      where: { referrerId: userId },
    });

    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      signedUp: referrals.filter((r) => r.status === 'signed_up').length,
      converted: referrals.filter((r) => r.status === 'converted').length,
      totalRewardDays: referrals
        .filter((r) => r.rewardClaimed)
        .reduce((s, r) => s + r.rewardDays, 0),
      pendingRewardDays: referrals
        .filter((r) => (r.status === 'signed_up' || r.status === 'converted') && !r.rewardClaimed)
        .reduce((s, r) => s + r.rewardDays, 0),
    };
  }

  async processReferralSignup(refereeId: string, code: string) {
    const referral = await this.prisma.referralProgram.findUnique({
      where: { code },
      include: { referrer: { include: { subscription: true } } },
    });
    if (!referral) return null;
    if (referral.status !== 'pending') return null;

    await this.prisma.referralProgram.update({
      where: { id: referral.id },
      data: {
        refereeId,
        status: 'signed_up',
        convertedAt: new Date(),
      },
    });

    return referral;
  }

  async claimReward(userId: string, referralId: string) {
    const referral = await this.prisma.referralProgram.findFirst({
      where: { id: referralId, referrerId: userId, status: 'signed_up', rewardClaimed: false },
    });
    if (!referral) throw new Error('No claimable reward found');

    await this.grantPremiumDays(userId, referral.rewardDays);

    await this.prisma.referralProgram.update({
      where: { id: referralId },
      data: {
        status: 'converted',
        rewardClaimed: true,
        rewardClaimedAt: new Date(),
      },
    });

    return { grantedDays: referral.rewardDays };
  }

  async claimAllRewards(userId: string) {
    const unclaimed = await this.prisma.referralProgram.findMany({
      where: { referrerId: userId, status: 'signed_up', rewardClaimed: false },
    });

    if (unclaimed.length === 0) throw new Error('No claimable rewards');

    const totalDays = unclaimed.reduce((s, r) => s + r.rewardDays, 0);
    await this.grantPremiumDays(userId, totalDays);

    await this.prisma.referralProgram.updateMany({
      where: { id: { in: unclaimed.map((r) => r.id) } },
      data: {
        status: 'converted',
        rewardClaimed: true,
        rewardClaimedAt: new Date(),
      },
    });

    return { grantedDays: totalDays, claimedCount: unclaimed.length };
  }

  private async grantPremiumDays(userId: string, days: number) {
    const premiumPlan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: { not: 'FREE' }, isActive: true },
      orderBy: { price: 'asc' },
    });

    if (!premiumPlan) throw new Error('No premium plan configured');

    const sub = await this.prisma.subscription.findUnique({ where: { userId } });

    if (sub) {
      const now = new Date();
      const currentEnd = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
      const newEnd = new Date(currentEnd.getTime() + days * 86400000);

      await this.prisma.subscription.update({
        where: { userId },
        data: {
          planId: premiumPlan.id,
          status: 'active',
          currentPeriodEnd: newEnd,
          ...(sub.status !== 'active' ? { currentPeriodStart: now } : {}),
        },
      });
    } else {
      const now = new Date();
      await this.prisma.subscription.create({
        data: {
          userId,
          planId: premiumPlan.id,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + days * 86400000),
        },
      });
    }
  }
}
