import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';

@Processor('subscription-queue')
export class SubscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing subscription job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'subscription-sync':
        return this._handleSubscriptionSync(job.data);
      case 'subscription-expiring-reminder':
        return this._handleExpiringReminder(job.data);
      case 'payment-retry':
        return this._handlePaymentRetry(job.data);
      case 'invoice-generation':
        return this._handleInvoiceGeneration(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { skipped: true };
    }
  }

  private async _handleSubscriptionSync(data: any): Promise<any> {
    const { userId, planId, action } = data;

    this.logger.log(`Syncing subscription for user ${userId}, plan ${planId}, action ${action || 'create'}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for user ${userId}`);
      return { skipped: true };
    }

    return {
      synced: true,
      userId,
      planId: subscription.plan.id,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  private async _handleExpiringReminder(data: any): Promise<any> {
    const { subscriptionId, userId, userEmail, userName, planName, expiresAt } = data;

    this.logger.log(
      `Sending expiry reminder for ${userEmail} - ${planName} expires ${expiresAt}`,
    );

    return {
      notified: true,
      subscriptionId,
      userEmail,
      expiresAt,
    };
  }

  private async _handlePaymentRetry(data: any): Promise<any> {
    const { subscriptionId, userId, amount, currency } = data;

    this.logger.log(`Retrying payment for subscription ${subscriptionId}: ${amount} ${currency}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found for retry`);
      return { skipped: true };
    }

    if (subscription.status !== 'past_due') {
      this.logger.log(`Subscription ${subscriptionId} is no longer past_due, skipping retry`);
      return { skipped: true };
    }

    return {
      retried: true,
      subscriptionId,
      amount,
      currency,
      nextAttempt: new Date(Date.now() + 86400000),
    };
  }

  private async _handleInvoiceGeneration(data: any): Promise<any> {
    const { subscriptionId, userId } = data;

    this.logger.log(`Generating invoice for subscription ${subscriptionId}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found for invoice generation`);
      return { skipped: true };
    }

    const invoiceNumber = `INV-${Date.now()}-${userId.slice(0, 8)}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        subscriptionId,
        invoiceNumber,
        amount: subscription.plan.price,
        currency: subscription.plan.currency,
        status: 'draft',
        dueDate: new Date(Date.now() + 15 * 86400000),
        lineItems: [
          {
            description: `${subscription.plan.name} - ${subscription.plan.interval}`,
            amount: subscription.plan.price.toNumber(),
            currency: subscription.plan.currency,
          },
        ],
      },
    });

    this.logger.log(`Generated invoice ${invoiceNumber} for subscription ${subscriptionId}`);

    return {
      generated: true,
      invoiceId: invoice.id,
      invoiceNumber,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Subscription job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Subscription job ${job.id} failed: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Subscription job ${job.id} is now active`);
  }
}
