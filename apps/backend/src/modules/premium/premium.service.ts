import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PremiumService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    return sub;
  }

  async createSubscription(userId: string, planCode: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing && existing.status === 'active') {
      throw new ConflictException('User already has an active subscription');
    }
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, plan.interval, plan.intervalCount);
    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelAtPeriodEnd: false,
      },
    });
    await this.syncEntitlements(userId, sub.id, plan);
    return sub;
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      throw new NotFoundException('No active subscription');
    }
    return this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
  }

  async getBillingHistory(userId: string) {
    return this.prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async isPremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true },
    });
    if (!sub) {
      return false;
    }
    if (sub.status !== 'active') {
      return false;
    }
    if (sub.currentPeriodEnd < new Date()) {
      return false;
    }
    return true;
  }

  async syncEntitlements(userId: string, subscriptionId: string, plan: any) {
    const features: string[] = (plan.features as string[]) || [];
    await this.prisma.premiumEntitlement.deleteMany({ where: { userId } });
    if (features.length === 0) {
      return;
    }
    await this.prisma.premiumEntitlement.createMany({
      data: features.map((feature: string) => ({
        userId,
        subscriptionId,
        featureKey: feature,
        enabled: true,
      })),
    });
  }

  async handleWebhookEvent(eventId: string, eventType: string, payload: any) {
    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      return { duplicate: true };
    }
    const event = await this.prisma.webhookEvent.create({
      data: { eventId, eventType, payload, status: 'processing' },
    });
    try {
      await this.processWebhookEvent(eventType, payload);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'processed', processedAt: new Date() },
      });
    } catch (err: any) {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'failed', errorMessage: err.message },
      });
      throw err;
    }
    return { duplicate: false };
  }

  private async processWebhookEvent(eventType: string, payload: any) {
    const razorpayId = payload.subscription_id || payload.id;
    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged':
        await this.activateSubscription(razorpayId, payload);
        break;
      case 'subscription.paused':
      case 'subscription.cancelled':
        await this.deactivateSubscription(razorpayId);
        break;
      case 'payment.authorized':
      case 'payment.captured':
        await this.recordPayment(razorpayId, payload);
        break;
      case 'payment.failed':
        await this.recordFailedPayment(payload);
        break;
    }
  }

  private async activateSubscription(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
    if (!sub || sub.status === 'active') {
      return;
    }
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, sub.plan.interval, sub.plan.intervalCount);
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelAtPeriodEnd: false,
      },
    });
    await this.syncEntitlements(sub.userId, sub.id, sub.plan);
  }

  private async deactivateSubscription(razorpaySubscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
    });
    if (!sub) {
      return;
    }
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
    await this.prisma.premiumEntitlement.deleteMany({ where: { userId: sub.userId } });
  }

  private async recordPayment(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
    });
    if (!sub) {
      return;
    }
    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payload.id },
    });
    if (existing) {
      return;
    }
    await this.prisma.paymentTransaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: payload.amount ? payload.amount / 100 : 0,
        currency: payload.currency || 'INR',
        status: 'captured',
        method: payload.method || 'upi',
        razorpayPaymentId: payload.id,
        razorpayOrderId: payload.order_id,
        paidAt: new Date(),
      },
    });
  }

  private async recordFailedPayment(payload: any) {
    const sub = payload.subscription_id
      ? await this.prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: payload.subscription_id },
        })
      : null;
    if (!sub) {
      return;
    }
    await this.prisma.paymentTransaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: payload.amount ? payload.amount / 100 : 0,
        currency: payload.currency || 'INR',
        status: 'failed',
        method: payload.method || 'upi',
        razorpayPaymentId: payload.id,
        razorpayOrderId: payload.order_id,
        failureReason: payload.failure_reason || 'Payment failed',
      },
    });
  }

  private calculatePeriodEnd(from: Date, interval: string, count: number): Date {
    const end = new Date(from);
    switch (interval) {
      case 'monthly':
        end.setMonth(end.getMonth() + count);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3 * count);
        break;
      case 'halfyearly':
        end.setMonth(end.getMonth() + 6 * count);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + count);
        break;
    }
    return end;
  }
}
