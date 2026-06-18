import { Injectable } from '@nestjs/common';

export interface UsageLimit {
  featureKey: string;
  freeLimit: number;
  premiumLimit: number | null;
  familyLimit: number | null;
  period: 'monthly' | 'all_time' | 'rolling_days';
  periodValue?: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  period: string;
}

@Injectable()
export class UsageEngine {
  private readonly LIMITS: UsageLimit[] = [
    {
      featureKey: 'goals',
      freeLimit: 3,
      premiumLimit: null,
      familyLimit: null,
      period: 'all_time',
    },
    {
      featureKey: 'budgets',
      freeLimit: 3,
      premiumLimit: null,
      familyLimit: null,
      period: 'all_time',
    },
    {
      featureKey: 'transactions',
      freeLimit: 100,
      premiumLimit: null,
      familyLimit: null,
      period: 'monthly',
    },
    {
      featureKey: 'history_days',
      freeLimit: 90,
      premiumLimit: null,
      familyLimit: null,
      period: 'rolling_days',
      periodValue: 90,
    },
    {
      featureKey: 'couple_spaces',
      freeLimit: 1,
      premiumLimit: null,
      familyLimit: null,
      period: 'all_time',
    },
    {
      featureKey: 'categories',
      freeLimit: 10,
      premiumLimit: null,
      familyLimit: null,
      period: 'all_time',
    },
    {
      featureKey: 'attachments',
      freeLimit: 5,
      premiumLimit: null,
      familyLimit: null,
      period: 'all_time',
    },
    {
      featureKey: 'family_members',
      freeLimit: 0,
      premiumLimit: 0,
      familyLimit: 6,
      period: 'all_time',
    },
    {
      featureKey: 'exports',
      freeLimit: 0,
      premiumLimit: null,
      familyLimit: null,
      period: 'monthly',
    },
    {
      featureKey: 'investments',
      freeLimit: 0,
      premiumLimit: null,
      familyLimit: null,
      period: 'all_time',
    },
    {
      featureKey: 'documents',
      freeLimit: 0,
      premiumLimit: 50,
      familyLimit: 100,
      period: 'all_time',
    },
  ];

  getPlanTier(planCode: string): 'free' | 'premium' | 'family' {
    if (planCode === 'FAMILY_MONTHLY' || planCode === 'FAMILY_YEARLY') {
      return 'family';
    }
    if (planCode === 'PREMIUM' || planCode === 'PREMIUM_MONTHLY' || planCode === 'PREMIUM_YEARLY') {
      return 'premium';
    }
    return 'free';
  }

  getLimit(featureKey: string, planCode: string): number {
    const def = this.LIMITS.find((l) => l.featureKey === featureKey);
    if (!def) {
      return -1;
    }
    const tier = this.getPlanTier(planCode);
    if (tier === 'family' && def.familyLimit !== null) {
      return def.familyLimit;
    }
    if (tier === 'family' && def.familyLimit === null) {
      return -1;
    }
    if (tier === 'premium' && def.premiumLimit !== null) {
      return def.premiumLimit;
    }
    if (tier === 'premium' && def.premiumLimit === null) {
      return -1;
    }
    return def.freeLimit;
  }

  async checkUsage(
    prisma: any,
    userId: string,
    featureKey: string,
    planCode: string = 'FREE',
  ): Promise<UsageCheckResult> {
    const def = this.LIMITS.find((l) => l.featureKey === featureKey);
    if (!def) {
      return { allowed: true, current: 0, limit: -1, remaining: -1, period: 'all_time' };
    }

    const limit = this.getLimit(featureKey, planCode);
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1, remaining: -1, period: def.period };
    }

    let usage = 0;
    if (def.period === 'monthly') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const records = await prisma.subscriptionUsage.findMany({
        where: { userId, featureKey, updatedAt: { gte: startOfMonth } },
      });
      usage = records.reduce((s: number, r: any) => s + (r.count || 0), 0);
    } else if (def.period === 'rolling_days') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (def.periodValue || 90));
      const records = await prisma.subscriptionUsage.findMany({
        where: { userId, featureKey, updatedAt: { gte: startDate } },
      });
      usage = records.reduce((s: number, r: any) => s + (r.count || 0), 0);
    } else {
      const record = await prisma.subscriptionUsage.findUnique({
        where: { userId_featureKey: { userId, featureKey } },
      });
      usage = record?.count ?? 0;
    }

    const remaining = Math.max(0, limit - usage);
    return { allowed: usage < limit, current: usage, limit, remaining, period: def.period };
  }

  async incrementUsage(prisma: any, userId: string, featureKey: string): Promise<void> {
    await prisma.subscriptionUsage.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      create: { userId, featureKey, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  async decrementUsage(prisma: any, userId: string, featureKey: string): Promise<void> {
    await prisma.subscriptionUsage.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      create: { userId, featureKey, count: 0 },
      update: { count: { decrement: 1 } },
    });
  }

  async resetUsage(prisma: any, userId: string): Promise<void> {
    await prisma.subscriptionUsage.deleteMany({ where: { userId } });
  }

  async getUsage(prisma: any, userId: string): Promise<Record<string, number>> {
    const records = await prisma.subscriptionUsage.findMany({ where: { userId } });
    const result: Record<string, number> = {};
    for (const r of records) {
      result[r.featureKey] = r.count;
    }
    return result;
  }

  async getRemainingUsage(
    prisma: any,
    userId: string,
    planCode: string = 'FREE',
  ): Promise<Record<string, { used: number; limit: number; remaining: number; period: string }>> {
    const result: Record<
      string,
      { used: number; limit: number; remaining: number; period: string }
    > = {};
    for (const def of this.LIMITS) {
      const check = await this.checkUsage(prisma, userId, def.featureKey, planCode);
      result[def.featureKey] = {
        used: check.current,
        limit: check.limit,
        remaining: check.remaining,
        period: def.period,
      };
    }
    return result;
  }

  getLimitsForPlan(planCode: string): Record<string, { limit: number; period: string }> {
    const result: Record<string, { limit: number; period: string }> = {};
    for (const def of this.LIMITS) {
      const limit = this.getLimit(def.featureKey, planCode);
      result[def.featureKey] = { limit, period: def.period };
    }
    return result;
  }
}
