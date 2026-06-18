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

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  private readonly PLAN_PRICES: Record<
    string,
    { amountPaise: number; interval: string; intervalCount: number }
  > = {
    PREMIUM_MONTHLY: { amountPaise: 9900, interval: 'monthly', intervalCount: 1 },
    PREMIUM_YEARLY: { amountPaise: 99900, interval: 'yearly', intervalCount: 1 },
    FAMILY_MONTHLY: { amountPaise: 19900, interval: 'monthly', intervalCount: 1 },
    FAMILY_YEARLY: { amountPaise: 199900, interval: 'yearly', intervalCount: 1 },
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

  async previewChange(planCode: string) {
    const plan = await this.getPlanByCode(planCode);
    const grantedFeatures = this.entitlementEngine.getGrantedFeatures(planCode);
    return {
      code: plan.code,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: plan.features,
      totalFeatures: (plan.features as string[]).length,
      grantedFeatures,
    };
  }

  async subscribe(userId: string, planCode: string, couponCode?: string) {
    const plan = await this.getPlanByCode(planCode);
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing && existing.status === 'active') {
      throw new ConflictException('User already has an active subscription');
    }

    const priceConfig = this.PLAN_PRICES[planCode];
    if (!priceConfig) {
      throw new BadRequestException(`No pricing configuration for plan: ${planCode}`);
    }

    let razorpayPlanId = plan.razorpayPlanId || '';
    if (!razorpayPlanId) {
      const rzpPlan = await this.razorpayService.createPlan({
        period: priceConfig.interval,
        interval: priceConfig.intervalCount,
        amount: priceConfig.amountPaise,
        name: planCode,
        description: plan.name,
      });
      razorpayPlanId = rzpPlan.id;
      await this.prisma.subscriptionPlan.update({
        where: { code: planCode },
        data: { razorpayPlanId },
      });
    }

    const intervalMonths: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      halfyearly: 6,
      yearly: 12,
    };
    const monthsPerCycle = intervalMonths[priceConfig.interval] || 1;
    const maxSafeCycles = Math.floor(((2100 - new Date().getFullYear()) * 12) / monthsPerCycle);
    const totalCount = Math.min(maxSafeCycles, 120);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, priceConfig.interval, priceConfig.intervalCount);

    let effectiveAmount = priceConfig.amountPaise;
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

  async changePlan(userId: string, newPlanCode: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('No active subscription found');
    }
    if (sub.status !== 'active') {
      throw new BadRequestException('Cannot change plan for non-active subscription');
    }

    const newPlan = await this.getPlanByCode(newPlanCode);

    if (sub.planId === newPlan.id) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { userId },
        data: { planId: newPlan.id },
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
        await this.razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
      } catch (err: any) {
        this.logger.warn(`Failed to cancel old Razorpay subscription: ${err.message}`);
      }
    }

    if (newPlan.razorpayPlanId) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const totalCount = newPlan.interval === 'yearly' ? 12 : 1;
        const newRazorpaySub = await this.razorpayService.createSubscription({
          planId: newPlan.razorpayPlanId,
          totalCount,
          customerEmail: user?.email || '',
          customerContact: user?.phone || undefined,
          notes: { userId, subscriptionId: updated.id, planCode: newPlanCode },
        });
        await this.prisma.subscription.update({
          where: { id: updated.id },
          data: { razorpaySubscriptionId: newRazorpaySub.id },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to create new Razorpay subscription: ${err.message}`);
      }
    }

    await this.trackEvent(userId, 'plan_changed', {
      from: sub.plan.code,
      to: newPlanCode,
      subscriptionId: sub.id,
    });

    return updated;
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
    if (!sub) {
      return null;
    }

    const usage = await this.usageEngine.getUsage(this.prisma, userId);
    const entitlements = sub.entitlements.filter((e) => e.enabled).map((e) => e.featureKey);
    const nextBillingDate = sub.currentPeriodEnd;
    const lastPayment = sub.payments?.[0];
    const paymentMethod = lastPayment?.method
      ? lastPayment.method === 'upi' ? 'UPI AutoPay' :
        lastPayment.method === 'card' ? 'Card' :
        lastPayment.method === 'netbanking' ? 'Net Banking' :
        lastPayment.method === 'wallet' ? 'Wallet' :
        lastPayment.method
      : null;

    return {
      id: sub.id,
      userId: sub.userId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      nextBillingDate,
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

  async cancelSubscription(userId: string, reason?: string, reasonCode?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('No active subscription found');
    }
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

    const recoveryOffer = await this.generateRecoveryOffer(userId, reasonCode);

    await this.prisma.premiumEntitlement.deleteMany({ where: { userId } });

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
          html: `<p>Hi ${user.firstName},</p><p>Your ${sub.plan.name} subscription has been cancelled.</p>`,
          text: `Hi ${user.firstName}, your ${sub.plan.name} subscription has been cancelled.`,
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

  async reactivateSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('No cancelled subscription found');
    }
    if (sub.status !== 'cancelled') {
      throw new BadRequestException('Only cancelled subscriptions can be reactivated');
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

    await this.trackEvent(userId, 'subscription_reactivated', {
      subscriptionId: sub.id,
      planCode: sub.plan.code,
    });

    return updated;
  }

  async pauseSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      throw new NotFoundException('No active subscription found');
    }
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

  async resumeSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      throw new NotFoundException('No paused subscription found');
    }
    if (sub.status !== 'paused') {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'active' },
    });

    if (sub.razorpaySubscriptionId) {
      try {
        await this.razorpayService.resumeSubscription(sub.razorpaySubscriptionId);
      } catch (err: any) {
        this.logger.warn(`Razorpay resume failed: ${err.message}`);
      }
    }

    await this.trackEvent(userId, 'subscription_resumed', { subscriptionId: sub.id });
    return updated;
  }

  async getSubscriptionCenter(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    const usage = await this.usageEngine.getUsage(this.prisma, userId);
    const plans = await this.getPlans();

    const entitlements = subscription?.entitlements || [];
    const recentPayments = subscription?.payments || [];
    const isPremium = await this.isPremium(userId);

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
      usage,
      entitlements,
      availablePlans: plans,
      recentPayments,
      isPremium,
      daysRemaining,
    };
  }

  async getUsage(userId: string) {
    return this.usageEngine.getUsage(this.prisma, userId);
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

  async trackEvent(userId: string, event: string, properties?: Record<string, any>) {
    try {
      await this.prisma.subscriptionEvent.create({
        data: { userId, event, properties: properties || undefined },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to track event ${event}: ${err.message}`);
    }
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
    if (!coupon) {
      return null;
    }
    if (!coupon.isActive) {
      return null;
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return null;
    }
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) {
      return null;
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return null;
    }
    if (coupon.applicablePlans) {
      const plans = coupon.applicablePlans as string[];
      if (!plans.includes(planCode)) {
        return null;
      }
    }
    return coupon;
  }

  async retryPayment(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      throw new NotFoundException('No subscription found');
    }
    if (!sub.razorpaySubscriptionId) {
      throw new BadRequestException('No Razorpay subscription to retry');
    }
    const razorpaySub = await this.razorpayService.fetchSubscription(sub.razorpaySubscriptionId);
    if (!razorpaySub) {
      throw new NotFoundException('Razorpay subscription not found');
    }
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
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
    if (!sub) {
      return false;
    }
    if (sub.status !== 'active') {
      return false;
    }
    if (sub.currentPeriodEnd < new Date()) {
      return false;
    }
    if (sub.plan.code === 'FREE') {
      return false;
    }
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
      if (def.limit !== -1 && def.limit < 10) {
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
      if (
        rzpSub &&
        (rzpSub.status === 'active' ||
          rzpSub.status === 'completed' ||
          rzpSub.status === 'authenticated')
      ) {
        await this.handleActivation(existingSub.razorpaySubscriptionId!, rzpSub);
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
    if (usageLimit && usageLimit.limit !== -1) {
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

  async getDashboardData(): Promise<any> {
    const totalUsers = await this.prisma.user.count();
    const activeSubs = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });
    const activeSubscriptions = activeSubs.length;
    const mrr = activeSubs.reduce((sum: number, s: any) => {
      const price = Number(s.plan.price);
      if (s.plan.interval === 'yearly') {
        return sum + price / 12;
      }
      return sum + price;
    }, 0);
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const cancelledLast30 = await this.prisma.subscription.count({
      where: { status: 'cancelled', updatedAt: { gte: thirtyDaysAgo } },
    });
    const churnRate =
      activeSubscriptions + cancelledLast30 > 0
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
    const monthlySignups = Object.entries(monthlySignupsMap).map(([month, count]) => ({
      month,
      count,
    }));
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { status: 'captured', paidAt: { gte: sixMonthsAgo } },
      orderBy: { paidAt: 'asc' },
    });
    const revenueMap: Record<string, number> = {};
    for (const p of payments) {
      const m = p.paidAt!.toISOString().slice(0, 7);
      revenueMap[m] = (revenueMap[m] || 0) + Number(p.amount);
    }
    const revenueHistory = Object.entries(revenueMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));
    const totalPremium = await this.prisma.subscription.count({
      where: { status: 'active', plan: { code: { not: 'FREE' } } },
    });
    const conversionRate = totalUsers > 0 ? (totalPremium / totalUsers) * 100 : 0;
    const recentEvents = await this.prisma.subscriptionEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const familySubs = await this.prisma.familySubscription.count({
      where: { status: 'active' },
    });
    const failedPayments = await this.prisma.paymentTransaction.count({
      where: { status: 'failed', createdAt: { gte: thirtyDaysAgo } },
    });
    const renewals = await this.prisma.paymentTransaction.count({
      where: { status: 'captured', paidAt: { gte: thirtyDaysAgo } },
    });
    return {
      totalUsers,
      activeSubscriptions,
      familySubscriptions: familySubs,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      churnRate: Math.round(churnRate * 10000) / 100,
      planDistribution,
      monthlySignups,
      revenueHistory,
      conversionRate: Math.round(conversionRate * 100) / 100,
      trialConversionRate: 0,
      failedPayments,
      renewals,
      recentEvents,
    };
  }

  async getCancellationOffer(userId: string) {
    const recovery = await this.prisma.cancellationRecovery.findUnique({
      where: { userId },
    });
    if (!recovery || !recovery.expiresAt || recovery.expiresAt < new Date()) {
      return null;
    }
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
      create: {
        userId,
        reason,
        reasonText,
        offerType: offer.type,
        offerData: offer.data,
        expiresAt,
      },
      update: {
        reason,
        reasonText,
        offerType: offer.type,
        offerData: offer.data,
        expiresAt,
        offerAccepted: false,
      },
    });

    return {
      offerType: offer.type,
      offerData: offer.data,
      expiresAt,
      description: this.getOfferDescription(offer.type),
    };
  }

  async acceptRecoveryOffer(userId: string) {
    const recovery = await this.prisma.cancellationRecovery.findUnique({
      where: { userId },
    });
    if (!recovery) {
      throw new NotFoundException('No recovery offer found');
    }

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
            data: {
              status: 'active',
              currentPeriodEnd: extendedEnd,
              cancelledAt: null,
              cancelAtPeriodEnd: false,
            },
          });
        }
      }

      if (recovery.offerType === 'discount_20') {
        await tx.subscription.update({
          where: { userId },
          data: {
            status: 'active',
            cancelledAt: null,
            cancelAtPeriodEnd: false,
          },
        });
      }
    });

    await this.reactivateSubscription(userId);
    await this.trackEvent(userId, 'recovery_offer_accepted', {
      offerType: recovery.offerType,
    });

    return { success: true, message: 'Recovery offer accepted' };
  }

  private async generateRecoveryOffer(userId: string, reasonCode?: string) {
    const reason = reasonCode || 'OTHER';
    const offer = this.generateOfferForReason(reason);
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    await this.prisma.cancellationRecovery.upsert({
      where: { userId },
      create: {
        userId,
        reason,
        offerType: offer.type,
        offerData: offer.data,
        expiresAt,
      },
      update: {
        reason,
        offerType: offer.type,
        offerData: offer.data,
        expiresAt,
      },
    });

    return {
      offerType: offer.type,
      offerData: offer.data,
      expiresAt,
      description: this.getOfferDescription(offer.type),
    };
  }

  private generateOfferForReason(reason: string): { type: string; data: any } {
    switch (reason) {
      case 'PRICE':
        return {
          type: 'discount_20',
          data: { discountPct: 20, durationMonths: 3 },
        };
      case 'FEATURES':
        return {
          type: 'free_month',
          data: { extraMonths: 1 },
        };
      case 'USAGE':
        return {
          type: 'pause',
          data: { pauseDurationMonths: 1 },
        };
      case 'ALTERNATIVE':
        return {
          type: 'annual_upgrade',
          data: { discountPct: 15 },
        };
      default:
        return {
          type: 'free_month',
          data: { extraMonths: 1 },
        };
    }
  }

  private getOfferDescription(type: string): string {
    switch (type) {
      case 'free_month':
        return 'Get one month free to continue your premium access';
      case 'discount_20':
        return 'Get 20% off for the next 3 months';
      case 'annual_upgrade':
        return 'Upgrade to annual plan at 15% discount';
      case 'pause':
        return 'Pause your subscription for 1 month';
      default:
        return 'Special offer to continue your premium access';
    }
  }

  async handleActivation(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
    if (!sub || sub.status === 'active') {
      return;
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, sub.plan.interval, sub.plan.intervalCount);

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
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

  async handleCharge(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
    if (!sub) {
      return;
    }

    if (sub.status !== 'active') {
      const now = new Date();
      const periodEnd = this.calculatePeriodEnd(now, sub.plan.interval, sub.plan.intervalCount);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    const payment = payload.payment?.entity || payload;
    if (payment.id) {
      await this.recordPayment(sub, payment);
    }
  }

  async handlePending(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'past_due' },
    });
  }

  async handleHalted(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'halted' },
    });
  }

  async handleCancellation(razorpaySubscriptionId: string, payload: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId },
    });
    if (!sub) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });
      await tx.premiumEntitlement.deleteMany({ where: { userId: sub.userId } });
    });

    await this.trackEvent(sub.userId, 'subscription_cancelled_razorpay', {
      razorpaySubscriptionId,
    });
  }

  async handlePause(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'paused' },
    });
  }

  async handleResume(razorpaySubscriptionId: string, payload: any) {
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId },
      data: { status: 'active' },
    });
  }

  async handlePaymentAuthorized(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) {
      return;
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });
    if (!sub) {
      return;
    }

    await this.recordPayment(sub, payment);
  }

  async handlePaymentCaptured(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) {
      return;
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });
    if (!sub) {
      return;
    }

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payment.id, status: 'captured' },
    });
    if (existing) {
      return;
    }

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
      const renewalDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: sub.planId },
      });
      const nextBillingDate = plan
        ? this.calculatePeriodEnd(new Date(), plan.interval, plan.intervalCount).toLocaleDateString(
            'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' },
          )
        : '';
      this.emailService
        .sendPremiumRenewedEmail?.(user.email, user.firstName, renewalDate, nextBillingDate, amount)
        .catch((e) => this.logger.warn(`Renewal email failed: ${e.message}`));
    }
  }

  async handlePaymentFailed(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) {
      return;
    }

    const sub = payment.subscription_id
      ? await this.prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: payment.subscription_id },
        })
      : null;
    if (!sub) {
      return;
    }

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
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: sub.planId },
    });
    if (user && plan) {
      const amount = payment.amount ? `₹${(payment.amount / 100).toLocaleString('en-IN')}` : '₹0';
      this.emailService
        .sendPaymentFailedEmail?.(user.email, user.firstName, plan.name, amount)
        .catch((e) => this.logger.warn(`Payment failed email error: ${e.message}`));
    }
  }

  async handlePaymentRefunded(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) {
      return;
    }

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payment.id },
    });
    if (existing) {
      await this.prisma.paymentTransaction.update({
        where: { id: existing.id },
        data: { status: 'refunded' },
      });

      const sub = existing.subscriptionId
        ? await this.prisma.subscription.findUnique({ where: { id: existing.subscriptionId } })
        : null;
      if (sub) {
        await this.prisma.invoice.updateMany({
          where: { subscriptionId: sub.id, paymentId: payment.id },
          data: { status: 'refunded' },
        });
      }
    }

    await this.trackEvent(existing?.userId || 'unknown', 'payment_refunded', {
      paymentId: payment.id,
      amount: payment.amount,
      status: 'refunded',
    });
  }

  private async recordPayment(sub: any, payment: any) {
    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { razorpayPaymentId: payment.id },
    });
    if (existing) {
      return;
    }

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
        paymentId: payment.id,
        paidAt: new Date(),
      },
    });
  }

  private async syncEntitlements(tx: any, userId: string, subscriptionId: string, plan: any) {
    const grantedFeatures = this.entitlementEngine.getGrantedFeatures(plan.code as string);
    await tx.premiumEntitlement.deleteMany({ where: { userId } });
    if (grantedFeatures.length === 0) {
      return;
    }
    await tx.premiumEntitlement.createMany({
      data: grantedFeatures.map((featureKey) => ({
        userId,
        subscriptionId,
        featureKey,
        enabled: true,
      })),
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
