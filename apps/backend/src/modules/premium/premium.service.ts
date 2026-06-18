import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RazorpayService } from './razorpay.service';
import { EntitlementEngine } from './entitlement.engine';
import { UsageEngine } from './usage.engine';
import { PlanTier } from './entitlement.engine';

interface PlanConfig {
  amountPaise: number;
  interval: 'monthly' | 'yearly';
  intervalCount: number;
  tier: PlanTier;
}

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  private readonly PLAN_CONFIGS: Record<string, PlanConfig> = {
    PREMIUM_MONTHLY: { amountPaise: 9900, interval: 'monthly', intervalCount: 1, tier: 'PREMIUM' },
    PREMIUM_YEARLY: { amountPaise: 99900, interval: 'yearly', intervalCount: 1, tier: 'PREMIUM' },
    FAMILY_MONTHLY: { amountPaise: 19900, interval: 'monthly', intervalCount: 1, tier: 'FAMILY' },
    FAMILY_YEARLY: { amountPaise: 199900, interval: 'yearly', intervalCount: 1, tier: 'FAMILY' },
  };

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private razorpayService: RazorpayService,
    private entitlementEngine: EntitlementEngine,
    private usageEngine: UsageEngine,
  ) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPlanByCode(code: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async subscribe(userId: string, planCode: string, couponCode?: string) {
    const plan = await this.getPlanByCode(planCode);
    const config = this.PLAN_CONFIGS[planCode];
    if (!config) {
      throw new BadRequestException(`No pricing configuration for plan: ${planCode}`);
    }

    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing && existing.status === 'active') {
      throw new ConflictException('User already has an active subscription');
    }

    let razorpayPlanId = plan.razorpayPlanId || '';
    if (!razorpayPlanId) {
      const rzpPlan = await this.razorpayService.createPlan({
        period: config.interval,
        interval: config.intervalCount,
        amount: config.amountPaise,
        name: planCode,
        description: plan.name,
      });
      razorpayPlanId = rzpPlan.id;
      await this.prisma.subscriptionPlan.update({
        where: { code: planCode },
        data: { razorpayPlanId },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, config.interval, config.intervalCount);

    let effectiveAmount = config.amountPaise;
    let couponApplied = false;
    if (couponCode) {
      const coupon = await this.validateCouponInternal(couponCode, planCode);
      if (coupon) {
        if (coupon.discountPct > 0) {
          effectiveAmount = Math.round(effectiveAmount * (1 - coupon.discountPct / 100));
        } else if (coupon.discountAmt) {
          effectiveAmount = Math.max(0, effectiveAmount - Number(coupon.discountAmt) * 100);
        }
        couponApplied = true;
        await this.prisma.subscriptionCoupon.update({
          where: { code: couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const sub = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId: plan.id,
          status: 'incomplete',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planId: plan.id,
          status: 'incomplete',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
      });
      return subscription;
    });

    const monthsPerCycle = config.interval === 'monthly' ? 1 : 12;
    const maxSafeCycles = Math.floor(((2100 - new Date().getFullYear()) * 12) / monthsPerCycle);
    const totalCount = Math.min(maxSafeCycles, config.interval === 'yearly' ? 5 : 60);

    const razorpaySub = await this.razorpayService.createSubscription({
      planId: razorpayPlanId,
      totalCount,
      customerEmail: user.email,
      customerContact: user.phone || undefined,
      notes: { userId, subscriptionId: sub.id, planCode, couponApplied: String(couponApplied) },
      addonAmount: effectiveAmount,
    });

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { razorpaySubscriptionId: razorpaySub.id },
    });

    const checkoutUrl = `https://api.razorpay.com/v1/subscriptions/${razorpaySub.id}/checkout`;

    await this.trackEvent(userId, 'subscription_created', {
      planCode,
      subscriptionId: sub.id,
      razorpaySubscriptionId: razorpaySub.id,
      amount: effectiveAmount,
      couponApplied,
    });

    return {
      id: sub.id,
      razorpaySubscriptionId: razorpaySub.id,
      checkoutUrl,
      status: razorpaySub.status,
    };
  }

  async upgrade(userId: string, newPlanCode: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('No active subscription found');
    if (sub.status !== 'active') {
      throw new BadRequestException('Cannot upgrade a non-active subscription');
    }

    const newPlan = await this.getPlanByCode(newPlanCode);
    const currentTier = this.PLAN_CONFIGS[sub.plan.code]?.tier || 'FREE';
    const newTier = this.PLAN_CONFIGS[newPlanCode]?.tier || 'FREE';
    const tierOrder: Record<string, number> = { FREE: 0, PREMIUM: 1, FAMILY: 2 };

    if (tierOrder[newTier] <= tierOrder[currentTier]) {
      throw new BadRequestException('New plan must be a higher tier than current plan');
    }

    let razorpayPlanId = newPlan.razorpayPlanId || '';
    if (!razorpayPlanId) {
      const config = this.PLAN_CONFIGS[newPlanCode];
      if (config) {
        const rzpPlan = await this.razorpayService.createPlan({
          period: config.interval,
          interval: config.intervalCount,
          amount: config.amountPaise,
          name: newPlanCode,
          description: newPlan.name,
        });
        razorpayPlanId = rzpPlan.id;
        await this.prisma.subscriptionPlan.update({
          where: { code: newPlanCode },
          data: { razorpayPlanId },
        });
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const config = this.PLAN_CONFIGS[newPlanCode];
    const now = new Date();
    const periodEnd = config
      ? this.calculatePeriodEnd(now, config.interval, config.intervalCount)
      : new Date(now.getTime() + 30 * 86400000);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { userId },
        data: {
          planId: newPlan.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
      });

      await tx.premiumEntitlement.deleteMany({ where: { userId } });
      const grantedFeatures = this.entitlementEngine.getGrantedFeatures(newPlanCode);
      if (grantedFeatures.length > 0) {
        await tx.premiumEntitlement.createMany({
          data: grantedFeatures.map((featureKey) => ({
            userId,
            subscriptionId: updatedSub.id,
            featureKey,
            enabled: true,
          })),
        });
      }
      return updatedSub;
    });

    if (sub.razorpaySubscriptionId) {
      try {
        if (razorpayPlanId) {
          await this.razorpayService.upgradeSubscription(
            sub.razorpaySubscriptionId,
            razorpayPlanId,
            config?.amountPaise || 0,
            user.email,
            user.phone || undefined,
            { userId, subscriptionId: updated.id, planCode: newPlanCode, upgraded_from: sub.plan.code },
          );
        }
      } catch (err: any) {
        this.logger.warn(`Razorpay upgrade failed: ${err.message}`);
      }
    }

    await this.trackEvent(userId, 'subscription_upgraded', {
      from: sub.plan.code,
      to: newPlanCode,
      subscriptionId: sub.id,
    });

    return updated;
  }

  async downgrade(userId: string, newPlanCode: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('No active subscription found');
    if (sub.status !== 'active') {
      throw new BadRequestException('Cannot downgrade a non-active subscription');
    }

    const newPlan = await this.getPlanByCode(newPlanCode);
    const currentTier = this.PLAN_CONFIGS[sub.plan.code]?.tier || 'FREE';
    const newTier = this.PLAN_CONFIGS[newPlanCode]?.tier || 'FREE';
    const tierOrder: Record<string, number> = { FREE: 0, PREMIUM: 1, FAMILY: 2 };

    if (tierOrder[newTier] >= tierOrder[currentTier]) {
      throw new BadRequestException('New plan must be a lower tier than current plan');
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        planId: newPlan.id,
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`Downgrade scheduled for user ${userId}: ${sub.plan.code} -> ${newPlanCode} at period end`);

    await this.trackEvent(userId, 'subscription_downgraded', {
      from: sub.plan.code,
      to: newPlanCode,
      subscriptionId: sub.id,
    });

    return { success: true, message: `Downgrade to ${newPlanCode} scheduled at period end` };
  }

  async changePlan(userId: string, newPlanCode: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('No active subscription found');

    const currentTier = this.PLAN_CONFIGS[sub.plan.code]?.tier || 'FREE';
    const newTier = this.PLAN_CONFIGS[newPlanCode]?.tier || 'FREE';
    const tierOrder: Record<string, number> = { FREE: 0, PREMIUM: 1, FAMILY: 2 };

    if (newPlanCode === sub.plan.code) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    if (tierOrder[newTier] > tierOrder[currentTier]) {
      return this.upgrade(userId, newPlanCode);
    }
    return this.downgrade(userId, newPlanCode);
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        entitlements: true,
      },
    });
    if (!sub) return null;

    const usage = await this.usageEngine.getUsage(this.prisma, userId);
    const entitlements = sub.entitlements.filter((e) => e.enabled).map((e) => e.featureKey);
    const lastPayment = sub.payments?.[0];
    const paymentMethod = lastPayment?.method
      ? lastPayment.method === 'upi' ? 'UPI AutoPay'
      : lastPayment.method === 'card' ? 'Card'
      : lastPayment.method === 'netbanking' ? 'Net Banking'
      : lastPayment.method === 'wallet' ? 'Wallet'
      : lastPayment.method
      : null;

    return {
      id: sub.id,
      userId: sub.userId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      nextBillingDate: sub.currentPeriodEnd,
      cancelledAt: sub.cancelledAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      plan: sub.plan,
      usage,
      entitlements,
      paymentMethod,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
      payments: sub.payments,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  async cancel(userId: string, reason?: string, reasonCode?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('No active subscription found');
    if (sub.status === 'cancelled') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        status: 'cancelled',
      },
    });

    if (sub.razorpaySubscriptionId) {
      try {
        await this.razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
      } catch (err: any) {
        this.logger.warn(`Razorpay cancellation failed: ${err.message}`);
      }
    }

    await this.prisma.premiumEntitlement.deleteMany({ where: { userId } });

    const recoveryOffer = await this.generateRecoveryOffer(userId, reasonCode);

    await this.trackEvent(userId, 'subscription_cancelled', {
      reason,
      reasonCode,
      subscriptionId: sub.id,
      planCode: sub.plan.code,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      this.emailService
        .send({
          to: user.email,
          subject: 'Subscription Cancelled',
          html: `<p>Hi ${user.firstName},</p><p>Your ${sub.plan.name} subscription has been cancelled. You'll continue to have access until ${updated.currentPeriodEnd.toLocaleDateString()}.</p>`,
          text: `Hi ${user.firstName}, your ${sub.plan.name} subscription has been cancelled. You'll continue to have access until ${updated.currentPeriodEnd.toLocaleDateString()}.`,
        })
        .catch((e: Error) => this.logger.warn(`Cancel email failed: ${e.message}`));
    }

    return {
      success: true,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      currentPeriodEnd: updated.currentPeriodEnd,
      recoveryOffer: recoveryOffer || undefined,
      message: 'Subscription cancelled',
    };
  }

  async resume(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('No subscription found');
    if (sub.status !== 'paused' && sub.status !== 'cancelled') {
      throw new BadRequestException('Only paused or cancelled subscriptions can be resumed');
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, sub.plan.interval, sub.plan.intervalCount);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { userId },
        data: {
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
      });
      const grantedFeatures = this.entitlementEngine.getGrantedFeatures(sub.plan.code);
      await tx.premiumEntitlement.deleteMany({ where: { userId } });
      if (grantedFeatures.length > 0) {
        await tx.premiumEntitlement.createMany({
          data: grantedFeatures.map((featureKey) => ({
            userId,
            subscriptionId: updatedSub.id,
            featureKey,
            enabled: true,
          })),
        });
      }
      return updatedSub;
    });

    if (sub.razorpaySubscriptionId) {
      try {
        await this.razorpayService.resumeSubscription(sub.razorpaySubscriptionId);
      } catch (err: any) {
        this.logger.warn(`Razorpay resume failed: ${err.message}`);
      }
    }

    await this.trackEvent(userId, 'subscription_resumed', {
      subscriptionId: sub.id,
      planCode: sub.plan.code,
    });

    return updated;
  }

  async pauseSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No active subscription found');
    if (sub.status !== 'active') {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'paused' },
    });

    if (sub.razorpaySubscriptionId) {
      try {
        await this.razorpayService.pauseSubscription(sub.razorpaySubscriptionId);
      } catch (err: any) {
        this.logger.warn(`Razorpay pause failed: ${err.message}`);
      }
    }

    await this.trackEvent(userId, 'subscription_paused', { subscriptionId: sub.id });
    return updated;
  }

  async getSubscriptionCenter(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    const usage = await this.usageEngine.getUsage(this.prisma, userId);
    const plans = await this.getPlans();

    const planCode = subscription?.plan?.code || 'FREE';
    const usageWithLimits = await this.usageEngine.getRemainingUsage(this.prisma, userId, planCode);

    const entitlements = subscription?.entitlements || [];
    const recentPayments = subscription?.payments || [];
    const isPremium = !!(subscription && subscription.status === 'active' && subscription.plan.code !== 'FREE');

    let daysRemaining = 0;
    if (subscription?.currentPeriodEnd) {
      daysRemaining = Math.max(
        0,
        Math.ceil(
          (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 86400),
        ),
      );
    }

    return {
      subscription,
      usage: usageWithLimits,
      rawUsage: usage,
      entitlements,
      availablePlans: plans,
      recentPayments,
      isPremium,
      daysRemaining,
    };
  }

  async getUsage(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const planCode = sub?.plan?.code || 'FREE';
    return this.usageEngine.getRemainingUsage(this.prisma, userId, planCode);
  }

  async getUserEntitlements(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const planCode = sub?.plan?.code || 'FREE';
    const grantedFeatures = this.entitlementEngine.getGrantedFeatures(planCode);
    const limits = this.usageEngine.getLimitsForPlan(planCode);
    const isPremium = grantedFeatures.length > 0 && sub?.status === 'active';
    return { planCode, grantedFeatures, limits, isPremium };
  }

  async checkLimit(userId: string, featureKey: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const planCode = sub?.plan?.code || 'FREE';
    return this.usageEngine.checkUsage(this.prisma, userId, featureKey, planCode);
  }

  async validateFeature(userId: string, featureKey: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const planCode = sub?.plan?.code || 'FREE';

    const entitlement = this.entitlementEngine.check(featureKey, planCode);
    if (!entitlement.allowed) {
      return { allowed: false, reason: entitlement.reason, upgradePlan: entitlement.upgradePlan };
    }

    const usageLimit = this.usageEngine.getLimitsForPlan(planCode)[featureKey];
    if (usageLimit && usageLimit.limit !== null) {
      const usage = await this.usageEngine.checkUsage(this.prisma, userId, featureKey, planCode);
      if (!usage.allowed) {
        const tier = this.usageEngine.getPlanTier(planCode);
        return {
          allowed: false,
          reason: 'LIMIT_REACHED',
          upgradePlan: tier === 'free' ? 'PREMIUM' : 'FAMILY',
          usage: { current: usage.current, limit: usage.limit, remaining: usage.remaining },
        };
      }
    }

    return { allowed: true, reason: null, upgradePlan: null };
  }

  async restorePurchase(userId: string) {
    const existingSub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (existingSub && existingSub.status === 'active') {
      return { restored: true, message: 'Subscription already active' };
    }

    if (existingSub?.razorpaySubscriptionId) {
      const rzpSub = await this.razorpayService.fetchSubscription(
        existingSub.razorpaySubscriptionId,
      );
      if (rzpSub && (rzpSub.status === 'active' || rzpSub.status === 'completed' || rzpSub.status === 'authenticated')) {
        await this.handleSubscriptionActivated(existingSub.razorpaySubscriptionId, rzpSub);
        return { restored: true, message: 'Subscription restored from Razorpay' };
      }
    }

    const lastPayment = await this.prisma.paymentTransaction.findFirst({
      where: { userId, status: 'captured' },
      orderBy: { createdAt: 'desc' },
      include: { subscription: { include: { plan: true } } },
    });
    if (lastPayment?.subscription && lastPayment.subscription.status !== 'cancelled') {
      const plan = lastPayment.subscription.plan;
      const grantedFeatures = this.entitlementEngine.getGrantedFeatures(plan.code);
      await this.prisma.premiumEntitlement.deleteMany({ where: { userId } });
      if (grantedFeatures.length > 0) {
        await this.prisma.premiumEntitlement.createMany({
          data: grantedFeatures.map((featureKey: string) => ({
            userId,
            subscriptionId: lastPayment.subscription.id,
            featureKey,
            enabled: true,
          })),
        });
      }
      await this.prisma.subscription.update({
        where: { id: lastPayment.subscription.id },
        data: { status: 'active' },
      });
      return { restored: true, message: 'Subscription restored from last payment' };
    }

    return { restored: false, message: 'No previous purchase found' };
  }

  async retryPayment(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No subscription found');
    if (!sub.razorpaySubscriptionId) {
      throw new BadRequestException('No Razorpay subscription to retry');
    }
    const razorpaySub = await this.razorpayService.fetchSubscription(sub.razorpaySubscriptionId);
    if (!razorpaySub) throw new NotFoundException('Razorpay subscription not found');
    try {
      const result = await this.razorpayService.retrySubscription(sub.razorpaySubscriptionId);
      return result;
    } catch (err: any) {
      throw new BadRequestException(`Payment retry failed: ${err.message}`);
    }
  }

  async getPaymentHistory(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentTransaction.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async isPremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        currentPeriodEnd: true,
        plan: { select: { code: true } },
      },
    });
    if (!sub) return false;
    if (sub.status !== 'active') return false;
    if (sub.currentPeriodEnd < new Date()) return false;
    if (sub.plan.code === 'FREE') return false;
    return true;
  }

  async getFeatures() {
    return this.entitlementEngine.getFeatureRegistry();
  }

  async getFeatureComparison() {
    const plans = await this.getPlans();
    const comparison = this.entitlementEngine.getFeatureComparison();
    const planFeatures = plans.map((plan: any) => ({
      code: plan.code,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: this.entitlementEngine.getGrantedFeatures(plan.code),
    }));
    return { comparison, plans: planFeatures };
  }

  async getPaywall() {
    const plans = await this.getPlans();
    const comparison = this.entitlementEngine.getFeatureComparison();
    const planFeatures = plans.map((plan: any) => ({
      code: plan.code,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: this.entitlementEngine.getGrantedFeatures(plan.code),
    }));
    const limits = plans.map((plan: any) => ({
      code: plan.code,
      limits: this.usageEngine.getLimitsForPlan(plan.code),
    }));
    return { plans: planFeatures, comparison, limits };
  }

  async getPlanLimits() {
    const plans = await this.getPlans();
    return plans.map((plan: any) => ({
      code: plan.code,
      name: plan.name,
      limits: this.usageEngine.getLimitsForPlan(plan.code),
    }));
  }

  async getUpgradeRecommendation(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const currentPlanCode = sub?.plan?.code || 'FREE';
    const tier = this.usageEngine.getPlanTier(currentPlanCode);
    if (tier === 'family') {
      return { current: currentPlanCode, recommendation: null, message: 'Already on highest plan' };
    }
    const usage = this.usageEngine.getLimitsForPlan(currentPlanCode);
    const exceeded: string[] = [];
    for (const [key, def] of Object.entries(usage)) {
      if (def.limit !== null && def.limit <= 5) {
        exceeded.push(key);
      }
    }
    const recommendation = tier === 'free' ? 'PREMIUM' : 'FAMILY';
    const message =
      exceeded.length > 0
        ? `You're approaching limits on: ${exceeded.join(', ')}`
        : `Unlock more features with ${recommendation}`;
    return { current: currentPlanCode, recommendation, message, exceeded };
  }

  async getInvoiceHistory(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async applyCoupon(code: string, planCode: string) {
    const coupon = await this.validateCouponInternal(code, planCode);
    if (!coupon) {
      return { valid: false, message: 'Invalid or expired coupon' };
    }
    return {
      valid: true,
      code: coupon.code,
      discountPct: coupon.discountPct,
      discountAmt: coupon.discountAmt ? Number(coupon.discountAmt) : undefined,
      description: coupon.description || undefined,
    };
  }

  private async validateCouponInternal(code: string, planCode: string) {
    const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { code } });
    if (!coupon) return null;
    if (!coupon.isActive) return null;
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return null;
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) return null;
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return null;
    if (coupon.applicablePlans) {
      const plans = coupon.applicablePlans as string[];
      if (!plans.includes(planCode)) return null;
    }
    return coupon;
  }

  async trackEvent(userId: string, event: string, properties?: Record<string, any>) {
    try {
      await this.prisma.subscriptionEvent.create({
        data: { userId, event, properties: properties || undefined },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to track event ${event}: ${err.message}`);
    }
  }

  async getCancellationOffer(userId: string) {
    const recovery = await this.prisma.cancellationRecovery.findUnique({ where: { userId } });
    if (!recovery || !recovery.expiresAt || recovery.expiresAt < new Date()) return null;
    return {
      offerType: recovery.offerType ?? 'free_month',
      offerData: recovery.offerData,
      expiresAt: recovery.expiresAt,
      description: this.getOfferDescription(recovery.offerType ?? 'free_month'),
    };
  }

  async submitCancellationRecovery(userId: string, reason: string, reasonText?: string) {
    const offer = this.generateOfferForReason(reason);
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    await this.prisma.cancellationRecovery.upsert({
      where: { userId },
      create: { userId, reason, reasonText, offerType: offer.type, offerData: offer.data, expiresAt },
      update: { reason, reasonText, offerType: offer.type, offerData: offer.data, expiresAt, offerAccepted: false },
    });

    return {
      offerType: offer.type,
      offerData: offer.data,
      expiresAt,
      description: this.getOfferDescription(offer.type),
    };
  }

  async acceptRecoveryOffer(userId: string) {
    const recovery = await this.prisma.cancellationRecovery.findUnique({ where: { userId } });
    if (!recovery) throw new NotFoundException('No recovery offer found');

    await this.prisma.$transaction(async (tx) => {
      await tx.cancellationRecovery.update({
        where: { userId },
        data: { offerAccepted: true },
      });

      if (recovery.offerType === 'free_month') {
        const sub = await tx.subscription.findUnique({ where: { userId } });
        if (sub) {
          const extendedEnd = new Date(sub.currentPeriodEnd.getTime() + 30 * 86400000);
          await tx.subscription.update({
            where: { userId },
            data: { status: 'active', currentPeriodEnd: extendedEnd, cancelledAt: null, cancelAtPeriodEnd: false },
          });
        }
      }

      if (recovery.offerType === 'discount_20') {
        await tx.subscription.update({
          where: { userId },
          data: { status: 'active', cancelledAt: null, cancelAtPeriodEnd: false },
        });
      }
    });

    await this.resume(userId);
    await this.trackEvent(userId, 'recovery_offer_accepted', { offerType: recovery.offerType });

    const grantedFeatures = this.entitlementEngine.getGrantedFeatures('PREMIUM');
    await this.prisma.premiumEntitlement.deleteMany({ where: { userId } });
    if (grantedFeatures.length > 0) {
      const sub = await this.prisma.subscription.findUnique({ where: { userId } });
      if (sub) {
        await this.prisma.premiumEntitlement.createMany({
          data: grantedFeatures.map((featureKey) => ({
            userId,
            subscriptionId: sub.id,
            featureKey,
            enabled: true,
          })),
        });
      }
    }

    return { success: true, message: 'Recovery offer accepted' };
  }

  async getAnalytics() {
    const totalUsers = await this.prisma.user.count();
    const activeSubs = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });
    const activeSubscriptions = activeSubs.length;
    const mrr = activeSubs.reduce((sum: number, s: any) => {
      const price = Number(s.plan.price);
      return sum + (s.plan.interval === 'yearly' ? price / 12 : price);
    }, 0);
    const arr = mrr * 12;
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const cancelledLast30 = await this.prisma.subscription.count({
      where: { status: 'cancelled', updatedAt: { gte: thirtyDaysAgo } },
    });
    const churnRate = activeSubscriptions + cancelledLast30 > 0
      ? cancelledLast30 / (activeSubscriptions + cancelledLast30)
      : 0;

    const plans = await this.getPlans();
    const planDistribution = await Promise.all(
      plans.map(async (plan: any) => {
        const count = await this.prisma.subscription.count({
          where: { planId: plan.id, status: 'active' },
        });
        const revenue = count * Number(plan.price);
        return { code: plan.code, name: plan.name, count, revenue };
      }),
    );

    const totalPremium = await this.prisma.subscription.count({
      where: { status: 'active', plan: { code: { not: 'FREE' } } },
    });
    const conversionRate = totalUsers > 0 ? (totalPremium / totalUsers) * 100 : 0;

    const familySubs = await this.prisma.familySubscription.count({ where: { status: 'active' } });
    const failedPayments = await this.prisma.paymentTransaction.count({
      where: { status: 'failed', createdAt: { gte: thirtyDaysAgo } },
    });
    const renewals = await this.prisma.paymentTransaction.count({
      where: { status: 'captured', paidAt: { gte: thirtyDaysAgo } },
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const signups = await this.prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: 'asc' },
    });
    const monthlySignupsMap: Record<string, number> = {};
    for (const u of signups) {
      const m = u.createdAt.toISOString().slice(0, 7);
      monthlySignupsMap[m] = (monthlySignupsMap[m] || 0) + 1;
    }
    const monthlySignups = Object.entries(monthlySignupsMap).map(([month, count]) => ({ month, count }));

    const recentEvents = await this.prisma.subscriptionEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      totalUsers,
      activeSubscriptions,
      familySubscriptions: familySubs,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      churnRate: Math.round(churnRate * 10000) / 100,
      planDistribution,
      monthlySignups,
      conversionRate: Math.round(conversionRate * 100) / 100,
      failedPayments,
      renewals,
      recentEvents,
    };
  }

  // Webhook Handlers

  async handleSubscriptionActivated(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
    if (!sub || sub.status === 'active') return;

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, sub.plan.interval, sub.plan.intervalCount);

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelledAt: null, cancelAtPeriodEnd: false },
      });
      await this.syncEntitlements(tx, sub.userId, sub.id, sub.plan);
    });

    const user = await this.prisma.user.findUnique({
      where: { id: sub.userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      this.emailService
        .sendPremiumActivatedEmail?.(
          user.email,
          user.firstName,
          sub.plan.name,
          sub.plan.interval,
          sub.plan.features as string[],
        )
        .catch((e) => this.logger.warn(`Activation email failed: ${e.message}`));
    }

    await this.trackEvent(sub.userId, 'subscription_activated', {
      razorpaySubscriptionId,
      planCode: sub.plan.code,
    });
  }

  async handleSubscriptionCharged(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
    if (!sub) return;

    if (sub.status !== 'active') {
      const now = new Date();
      const periodEnd = this.calculatePeriodEnd(now, sub.plan.interval, sub.plan.intervalCount);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd },
      });
    }

    const payment = payload.payment?.entity || payload;
    if (payment.id) {
      await this.recordPayment(sub, payment);
    }
  }

  async handleSubscriptionCompleted(razorpaySubscriptionId: string, payload: any) {
    this.logger.log(`Subscription ${razorpaySubscriptionId} completed all billing cycles`);
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'completed' },
    });
  }

  async handleSubscriptionPending(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'past_due' },
    });
  }

  async handleSubscriptionHalted(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'halted' },
    });
  }

  async handleSubscriptionCancelled(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
    });
    if (!sub) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });
      await tx.premiumEntitlement.deleteMany({ where: { userId: sub.userId } });
    });

    await this.trackEvent(sub.userId, 'subscription_cancelled_razorpay', { razorpaySubscriptionId });
  }

  async handleSubscriptionPaused(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'paused' },
    });
  }

  async handleSubscriptionResumed(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'active' },
    });
  }

  async handlePaymentAuthorized(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });
    if (!sub) return;

    await this.recordPayment(sub, payment);
  }

  async handlePaymentCaptured(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });
    if (!sub) return;

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payment.id, status: 'captured' },
    });
    if (existing) return;

    await this.prisma.paymentTransaction.updateMany({
      where: { razorpayPaymentId: payment.id, status: 'authorized' },
      data: { status: 'captured', paidAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: sub.userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      const amount = payment.amount ? `₹${(payment.amount / 100).toLocaleString('en-IN')}` : '₹0';
      const renewalDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } });
      const nextBillingDate = plan
        ? this.calculatePeriodEnd(new Date(), plan.interval, plan.intervalCount).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      this.emailService
        .sendPremiumRenewedEmail?.(user.email, user.firstName, renewalDate, nextBillingDate, amount)
        .catch((e) => this.logger.warn(`Renewal email failed: ${e.message}`));
    }
  }

  async handlePaymentFailed(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const sub = payment.subscription_id
      ? await this.prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: payment.subscription_id },
        })
      : null;
    if (!sub) return;

    await this.prisma.paymentTransaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: payment.amount ? payment.amount / 100 : 0,
        currency: payment.currency || 'INR',
        status: 'failed',
        method: payment.method || 'upi',
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
        failureReason: payment.failure_reason || 'Payment failed',
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: sub.userId },
      select: { email: true, firstName: true },
    });
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } });
    if (user && plan) {
      const amount = payment.amount ? `₹${(payment.amount / 100).toLocaleString('en-IN')}` : '₹0';
      this.emailService
        .sendPaymentFailedEmail?.(user.email, user.firstName, plan.name, amount)
        .catch((e) => this.logger.warn(`Payment failed email error: ${e.message}`));
    }
  }

  async handlePaymentRefunded(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payment.id },
    });
    if (existing) {
      await this.prisma.paymentTransaction.update({
        where: { id: existing.id },
        data: { status: 'refunded', refundedAt: new Date(), refundAmount: payment.amount ? payment.amount / 100 : 0 },
      });
    }

    await this.trackEvent(existing?.userId || 'unknown', 'payment_refunded', {
      paymentId: payment.id,
      amount: payment.amount,
    });
  }

  private async recordPayment(sub: any, payment: any) {
    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payment.id },
    });
    if (existing) return;

    await this.prisma.paymentTransaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: payment.amount ? payment.amount / 100 : 0,
        currency: payment.currency || 'INR',
        status: 'captured',
        method: payment.method || 'upi',
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
        paidAt: new Date(),
      },
    });

    await this.prisma.invoice.create({
      data: {
        subscriptionId: sub.id,
        userId: sub.userId,
        invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amount: payment.amount ? payment.amount / 100 : 0,
        currency: payment.currency || 'INR',
        status: 'paid',
        razorpayInvoiceId: payment.invoice_id || undefined,
        paidAt: new Date(),
      },
    });
  }

  private async syncEntitlements(tx: any, userId: string, subscriptionId: string, plan: any) {
    const grantedFeatures = this.entitlementEngine.getGrantedFeatures(plan.code as string);
    await tx.premiumEntitlement.deleteMany({ where: { userId } });
    if (grantedFeatures.length === 0) return;
    await tx.premiumEntitlement.createMany({
      data: grantedFeatures.map((featureKey) => ({
        userId,
        subscriptionId,
        featureKey,
        enabled: true,
      })),
    });
  }

  private async generateRecoveryOffer(userId: string, reasonCode?: string) {
    const reason = reasonCode || 'OTHER';
    const offer = this.generateOfferForReason(reason);
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    await this.prisma.cancellationRecovery.upsert({
      where: { userId },
      create: { userId, reason, offerType: offer.type, offerData: offer.data, expiresAt },
      update: { reason, offerType: offer.type, offerData: offer.data, expiresAt },
    });

    return { offerType: offer.type, offerData: offer.data, expiresAt, description: this.getOfferDescription(offer.type) };
  }

  private generateOfferForReason(reason: string): { type: string; data: any } {
    switch (reason) {
      case 'PRICE':
        return { type: 'discount_20', data: { discountPct: 20, durationMonths: 3 } };
      case 'FEATURES':
        return { type: 'free_month', data: { extraMonths: 1 } };
      case 'USAGE':
        return { type: 'pause', data: { pauseDurationMonths: 1 } };
      case 'ALTERNATIVE':
        return { type: 'annual_upgrade', data: { discountPct: 15 } };
      default:
        return { type: 'free_month', data: { extraMonths: 1 } };
    }
  }

  private getOfferDescription(type: string): string {
    switch (type) {
      case 'free_month': return 'Get one month free to continue your premium access';
      case 'discount_20': return 'Get 20% off for the next 3 months';
      case 'annual_upgrade': return 'Upgrade to annual plan at 15% discount';
      case 'pause': return 'Pause your subscription for 1 month';
      default: return 'Special offer to continue your premium access';
    }
  }

  private calculatePeriodEnd(from: Date, interval: string, count: number): Date {
    const end = new Date(from);
    switch (interval) {
      case 'monthly': end.setMonth(end.getMonth() + count); break;
      case 'quarterly': end.setMonth(end.getMonth() + 3 * count); break;
      case 'halfyearly': end.setMonth(end.getMonth() + 6 * count); break;
      case 'yearly': end.setFullYear(end.getFullYear() + count); break;
    }
    return end;
  }
}
