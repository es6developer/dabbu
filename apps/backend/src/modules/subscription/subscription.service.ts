import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ListSubscriptionsQueryDto,
  ChangePlanDto,
  AddPaymentMethodDto,
  BillingHistoryQueryDto,
} from './dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('subscription-queue') private readonly subscriptionQueue: Queue,
  ) {}

  private getPeriodEnd(startDate: Date, interval: string) {
    const endDate = new Date(startDate);
    switch (interval) {
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'semiannual':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'monthly':
      default:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
    }
    return endDate;
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPlanById(id: string) {
    return this.prisma.subscriptionPlan.findUnique({ where: { id } });
  }

  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { userId },
    });

    return {
      ...subscription,
      paymentMethods,
    };
  }

  async createSubscription(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan not found`);
    }

    if (!plan.isActive) {
      throw new BadRequestException('Selected plan is not available');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (existing && existing.plan.id === dto.planId && existing.status === 'active') {
      throw new ConflictException('Already subscribed to this plan');
    }

    const now = new Date();
    const periodEnd = this.getPeriodEnd(now, plan.interval);

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.subscription.update({
          where: { userId },
          data: {
            planId: plan.id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: dto.stripePriceId ? existing.stripeSubscriptionId : null,
            razorpaySubscriptionId: dto.razorpayPlanId ? existing.razorpaySubscriptionId : null,
          },
        });
      } else {
        await tx.subscription.create({
          data: {
            userId,
            planId: plan.id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      const invoiceNumber = `INV-${Date.now()}-${userId.slice(0, 8)}`;

      await tx.invoice.create({
        data: {
          userId,
          subscriptionId: existing?.id || (await tx.subscription.findUnique({ where: { userId } }))!.id,
          invoiceNumber,
          amount: plan.price,
          currency: plan.currency,
          status: 'draft',
          dueDate: periodEnd,
          lineItems: [
            {
              description: `${plan.name} - ${plan.interval}`,
              amount: plan.price.toNumber(),
              currency: plan.currency,
              interval: plan.interval,
            },
          ],
        },
      });

      await this.subscriptionQueue.add('subscription-sync', {
        userId,
        planId: dto.planId,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      return tx.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });
    });
  }

  async cancelSubscription(userId: string, id: string, dto?: CancelSubscriptionDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, userId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      throw new BadRequestException('Subscription is already cancelled or expired');
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        metadata: dto?.reason ? { ...(subscription.metadata as Record<string, any> || {}), cancelReason: dto.reason } : undefined,
      },
      include: { plan: true },
    });

    await this.subscriptionQueue.add('subscription-sync', {
      userId,
      action: 'cancel',
      subscriptionId: id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return updated;
  }

  async changePlan(userId: string, subscriptionId: string, dto: ChangePlanDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new BadRequestException('Cannot change plan on a non-active subscription');
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!newPlan) {
      throw new NotFoundException(`Plan not found`);
    }

    if (!newPlan.isActive) {
      throw new BadRequestException('Selected plan is not available');
    }

    if (subscription.plan.id === dto.planId) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId: newPlan.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.getPeriodEnd(new Date(), newPlan.interval),
        },
        include: { plan: true },
      });

      await this.subscriptionQueue.add('subscription-sync', {
        userId,
        action: 'change-plan',
        oldPlanId: subscription.plan.id,
        newPlanId: dto.planId,
        subscriptionId,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      return updated;
    });
  }

  async getBillingHistory(userId: string, query: BillingHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { include: { plan: true } },
        },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoices(userId: string, query: BillingHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { include: { plan: true } },
        },
      }),
      this.prisma.invoice.count({ where: { userId } }),
    ]);

    return {
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async addPaymentMethod(userId: string, dto: AddPaymentMethodDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.paymentMethod.create({
        data: {
          userId,
          gateway: dto.gateway,
          type: dto.type,
          stripePaymentMethodId: dto.stripePaymentMethodId || null,
          razorpayInstrumentId: dto.razorpayInstrumentId || null,
          razorpayTokenId: dto.razorpayTokenId || null,
          lastFourDigits: dto.lastFourDigits || null,
          cardBrand: dto.cardBrand || null,
          expMonth: dto.expMonth || null,
          expYear: dto.expYear || null,
          cardHolderName: dto.cardHolderName || null,
          upiHandle: dto.upiHandle || null,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async removePaymentMethod(userId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prisma.paymentMethod.delete({ where: { id } });

    if (method.isDefault) {
      const remaining = await this.prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (remaining) {
        await this.prisma.paymentMethod.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Payment method removed successfully' };
  }

  async _checkFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== 'active') {
      return false;
    }

    const features = (subscription.plan.features as Record<string, boolean>) || {};
    if (features[featureKey]) {
      return true;
    }

    const featureFlag = await this.prisma.featureFlag.findUnique({
      where: { name: featureKey },
    });

    return featureFlag?.isEnabled ?? false;
  }

  async _enforceQuota(userId: string, resource: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== 'active') {
      throw new BadRequestException('Active subscription required');
    }

    const plan = subscription.plan;
    const quotaMap: Record<string, string> = {
      accounts: 'maxAccounts',
      categories: 'maxCategories',
      budgets: 'maxBudgets',
      bills: 'maxBills',
      goals: 'maxGoals',
      investments: 'maxInvestments',
      family_members: 'maxFamilyMembers',
    };

    const maxField = quotaMap[resource];
    if (!maxField) return;

    const maxLimit = (plan as any)[maxField] as number;
    if (maxLimit <= 0) {
      throw new BadRequestException(`Resource "${resource}" is not available on your plan`);
    }

    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const quota = await this.prisma.quotaTracking.findFirst({
      where: {
        userId,
        resource,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    });

    if (quota) {
      if (quota.used >= quota.limit) {
        throw new BadRequestException(`Quota exceeded for resource: ${resource}`);
      }
      await this.prisma.quotaTracking.update({
        where: { id: quota.id },
        data: { used: { increment: 1 } },
      });
    } else {
      await this.prisma.quotaTracking.create({
        data: {
          userId,
          resource,
          used: 1,
          limit: maxLimit,
          periodStart,
          periodEnd,
        },
      });
    }
  }

  async _syncStripeSubscription(userId: string, subscriptionId: string, stripeSubId: string): Promise<void> {
    try {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { stripeSubscriptionId: stripeSubId },
      });
    } catch (error) {
      this.logger.error(`Failed to sync Stripe subscription ${stripeSubId}`, error instanceof Error ? error.stack : error);
    }
  }
}
