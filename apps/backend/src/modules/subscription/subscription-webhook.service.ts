import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async handleStripeWebhook(event: any): Promise<{ received: boolean }> {
    const eventType = event.type;
    const eventId = event.id;

    this.logger.log(`Processing Stripe webhook: ${eventType} (${eventId})`);

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { gateway_eventId: { gateway: 'stripe', eventId } },
    });

    if (existing) {
      this.logger.log(`Duplicate Stripe event ${eventId}, skipping`);
      return { received: true };
    }

    await this.prisma.webhookEvent.create({
      data: {
        gateway: 'stripe',
        eventId,
        eventType,
        status: 'pending',
        requestBody: event as Record<string, any>,
      },
    });

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          await this._handleCheckoutSessionCompleted(event);
          break;

        case 'invoice.paid':
          await this._handleInvoicePaid(event);
          break;

        case 'invoice.payment_failed':
          await this._handleInvoicePaymentFailed(event);
          break;

        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          await this._handleSubscriptionDeleted(event);
          break;

        default:
          this.logger.log(`Unhandled Stripe event type: ${eventType}`);
      }

      await this.prisma.webhookEvent.update({
        where: { gateway_eventId: { gateway: 'stripe', eventId } },
        data: { status: 'processed', processedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Error processing Stripe event ${eventId}: ${error instanceof Error ? error.message : error}`);

      await this.prisma.webhookEvent.update({
        where: { gateway_eventId: { gateway: 'stripe', eventId } },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    return { received: true };
  }

  async handleRazorpayWebhook(event: any): Promise<{ received: boolean }> {
    const eventType = event.event;
    const eventId = event.id || event.payload?.payment?.entity?.id;

    this.logger.log(`Processing Razorpay webhook: ${eventType} (${eventId})`);

    if (!eventId) {
      throw new BadRequestException('Invalid Razorpay webhook event');
    }

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { gateway_eventId: { gateway: 'razorpay', eventId } },
    });

    if (existing) {
      this.logger.log(`Duplicate Razorpay event ${eventId}, skipping`);
      return { received: true };
    }

    await this.prisma.webhookEvent.create({
      data: {
        gateway: 'razorpay',
        eventId,
        eventType,
        status: 'pending',
        requestBody: event as Record<string, any>,
      },
    });

    try {
      switch (eventType) {
        case 'subscription.charged':
          await this._handleRazorpaySubscriptionCharged(event);
          break;

        case 'payment.authorized':
          await this._handleRazorpayPaymentAuthorized(event);
          break;

        case 'payment.failed':
          await this._handleRazorpayPaymentFailed(event);
          break;

        case 'subscription.cancelled':
          await this._handleRazorpaySubscriptionCancelled(event);
          break;

        default:
          this.logger.log(`Unhandled Razorpay event type: ${eventType}`);
      }

      await this.prisma.webhookEvent.update({
        where: { gateway_eventId: { gateway: 'razorpay', eventId } },
        data: { status: 'processed', processedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Error processing Razorpay event ${eventId}: ${error instanceof Error ? error.message : error}`);

      await this.prisma.webhookEvent.update({
        where: { gateway_eventId: { gateway: 'razorpay', eventId } },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    return { received: true };
  }

  private async _handleCheckoutSessionCompleted(event: any): Promise<void> {
    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const userId = session.metadata?.userId;

    if (!userId) {
      this.logger.warn('Checkout session missing userId in metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found for checkout session`);
      return;
    }

    if (!user.stripeCustomerId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    if (subscriptionId) {
      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeSubscriptionId: subscriptionId },
      });
    }
  }

  private async _handleInvoicePaid(event: any): Promise<void> {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    if (!subscriptionId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) {
      this.logger.warn(`No local subscription found for Stripe sub ${subscriptionId}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
      },
    });

    const amount = invoice.total / 100;
    const currency = invoice.currency?.toUpperCase() || 'USD';

    await this.prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount,
        currency,
        status: 'completed',
        gateway: 'stripe',
        stripePaymentIntentId: invoice.payment_intent,
        stripeChargeId: invoice.charge,
        receiptUrl: invoice.receipt_url,
        paidAt: new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()),
      },
    });

    await this.prisma.invoice.updateMany({
      where: { subscriptionId: sub.id, status: 'draft' },
      data: {
        status: 'paid',
        paidAt: new Date(),
        pdfUrl: invoice.invoice_pdf,
      },
    });
  }

  private async _handleInvoicePaymentFailed(event: any): Promise<void> {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) {
      this.logger.warn(`No local subscription found for Stripe sub ${subscriptionId}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'past_due' },
    });

    const amount = invoice.total / 100;
    const currency = invoice.currency?.toUpperCase() || 'USD';

    await this.prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount,
        currency,
        status: 'failed',
        gateway: 'stripe',
        stripePaymentIntentId: invoice.payment_intent,
        failureMessage: invoice.last_payment_error?.message || 'Payment failed',
        failureCode: invoice.last_payment_error?.code || 'unknown',
      },
    });
  }

  private async _handleSubscriptionUpdated(event: any): Promise<void> {
    const stripeSub = event.data.object;
    const subscriptionId = stripeSub.id;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) {
      this.logger.warn(`No local subscription found for Stripe sub ${subscriptionId}`);
      return;
    }

    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'past_due',
      trialing: 'trial',
      incomplete: 'past_due',
      incomplete_expired: 'expired',
    };

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: statusMap[stripeSub.status] || sub.status,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
    });
  }

  private async _handleSubscriptionDeleted(event: any): Promise<void> {
    const stripeSub = event.data.object;
    const subscriptionId = stripeSub.id;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) {
      this.logger.warn(`No local subscription found for deleted Stripe sub ${subscriptionId}`);
      return;
    }

    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { price: 0, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'expired',
        cancelledAt: new Date(),
        planId: freePlan?.id || sub.planId,
      },
    });
  }

  private async _handleRazorpaySubscriptionCharged(event: any): Promise<void> {
    const payment = event.payload?.payment?.entity;
    const subscriptionId = event.payload?.subscription?.entity?.id;

    if (!subscriptionId || !payment) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (!sub) {
      this.logger.warn(`No local subscription found for Razorpay sub ${subscriptionId}`);
      return;
    }

    const amount = payment.amount / 100;
    const currency = payment.currency || 'INR';

    await this.prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount,
        currency,
        status: 'completed',
        gateway: 'razorpay',
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
        razorpaySignature: payment.signature || null,
        paidAt: new Date(),
      },
    });

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'active' },
    });
  }

  private async _handleRazorpayPaymentAuthorized(event: any): Promise<void> {
    const payment = event.payload?.payment?.entity;

    if (!payment) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });

    if (!sub) return;

    const amount = payment.amount / 100;
    const currency = payment.currency || 'INR';

    await this.prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount,
        currency,
        status: 'pending',
        gateway: 'razorpay',
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
      },
    });
  }

  private async _handleRazorpayPaymentFailed(event: any): Promise<void> {
    const payment = event.payload?.payment?.entity;

    if (!payment) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });

    if (!sub) return;

    const amount = payment.amount / 100;
    const currency = payment.currency || 'INR';

    await this.prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount,
        currency,
        status: 'failed',
        gateway: 'razorpay',
        razorpayPaymentId: payment.id,
        failureMessage: payment.error_description || payment.error_reason || 'Payment failed',
        failureCode: payment.error_code || 'unknown',
      },
    });

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'past_due' },
    });
  }

  private async _handleRazorpaySubscriptionCancelled(event: any): Promise<void> {
    const razorpaySub = event.payload?.subscription?.entity;

    if (!razorpaySub?.id) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: razorpaySub.id },
    });

    if (!sub) {
      this.logger.warn(`No local subscription found for cancelled Razorpay sub ${razorpaySub.id}`);
      return;
    }

    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { price: 0, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        planId: freePlan?.id || sub.planId,
      },
    });
  }
}
