import { Injectable } from '@nestjs/common';

export interface UsageLimit {
  featureKey: string;
  freeLimit: number;
  premiumLimit: number | null;
  familyLimit: number | null;
}

@Injectable()
export class UsageEngine {
  private readonly LIMITS: UsageLimit[] = [
    { featureKey: 'family_hubs', freeLimit: 3, premiumLimit: null, familyLimit: null },
    { featureKey: 'goals', freeLimit: 3, premiumLimit: null, familyLimit: null },
    { featureKey: 'budgets', freeLimit: 3, premiumLimit: null, familyLimit: null },
    { featureKey: 'transactions', freeLimit: 100, premiumLimit: null, familyLimit: null },
    { featureKey: 'categories', freeLimit: 10, premiumLimit: null, familyLimit: null },
    { featureKey: 'attachments', freeLimit: 5, premiumLimit: null, familyLimit: null },
  ];

  async checkLimit(
    prisma: any,
    userId: string,
    featureKey: string,
    planCode: string = 'FREE',
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limitDef = this.LIMITS.find((l) => l.featureKey === featureKey);
    if (!limitDef) {
      return { allowed: true, current: 0, limit: -1 };
    }

    const limit = this.getLimit(featureKey, planCode);
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1 };
    }

    const usage = await prisma.subscriptionUsage.findUnique({
      where: { userId_featureKey: { userId, featureKey } },
    });

    const current = usage?.count ?? 0;
    return { allowed: current < limit, current, limit };
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

  getLimit(featureKey: string, planCode: string): number {
    const limitDef = this.LIMITS.find((l) => l.featureKey === featureKey);
    if (!limitDef) {
      return -1;
    }

    const isPremium =
      planCode === 'PREMIUM' || planCode === 'PREMIUM_MONTHLY' || planCode === 'PREMIUM_YEARLY';
    const isFamily =
      planCode === 'PREMIUM_FAMILY' ||
      planCode === 'FAMILY_MONTHLY' ||
      planCode === 'FAMILY_YEARLY';

    if (isFamily && limitDef.familyLimit !== null) {
      return limitDef.familyLimit;
    }
    if (isPremium && limitDef.premiumLimit !== null) {
      return limitDef.premiumLimit;
    }
    if (isFamily && limitDef.familyLimit === null) {
      return -1;
    }
    if (isPremium && limitDef.premiumLimit === null) {
      return -1;
    }

    return limitDef.freeLimit;
  }
}
