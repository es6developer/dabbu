import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { addDays } from 'date-fns';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('subscription-queue') private readonly subscriptionQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiringSubscriptions() {
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);

    try {
      const expiringSubs = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          cancelAtPeriodEnd: true,
        },
        include: {
          user: { select: { email: true, firstName: true } },
          plan: { select: { name: true, code: true } },
        },
      });

      for (const sub of expiringSubs) {
        await this.subscriptionQueue.add('subscription-expiring-reminder', {
          subscriptionId: sub.id,
          userId: sub.userId,
          userEmail: sub.user.email,
          userName: sub.user.firstName,
          planName: sub.plan.name,
          expiresAt: sub.currentPeriodEnd,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        });

        this.logger.log(
          `Queued expiry reminder for subscription ${sub.id} (expires ${sub.currentPeriodEnd})`,
        );
      }

      if (expiringSubs.length > 0) {
        this.logger.log(`Queued ${expiringSubs.length} expiring subscription reminders`);
      }
    } catch (error) {
      this.logger.error('Error checking expiring subscriptions', error instanceof Error ? error.stack : error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processPastDueSubscriptions() {
    const now = new Date();

    try {
      const pastDueSubs = await this.prisma.subscription.findMany({
        where: {
          status: 'past_due',
        },
        include: {
          user: { select: { email: true, stripeCustomerId: true } },
          plan: true,
        },
      });

      for (const sub of pastDueSubs) {
        await this.subscriptionQueue.add('payment-retry', {
          subscriptionId: sub.id,
          userId: sub.userId,
          userEmail: sub.user.email,
          amount: sub.plan.price.toNumber(),
          currency: sub.plan.currency,
          stripeCustomerId: sub.user.stripeCustomerId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: true,
        });

        this.logger.log(`Queued payment retry for past-due subscription ${sub.id}`);
      }

      if (pastDueSubs.length > 0) {
        this.logger.log(`Queued ${pastDueSubs.length} past-due payment retries`);
      }
    } catch (error) {
      this.logger.error('Error processing past-due subscriptions', error instanceof Error ? error.stack : error);
    }
  }

  @Cron('0 0 1 * *')
  async generateMonthlyInvoices() {
    const now = new Date();

    try {
      const activeSubs = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { gte: now },
        },
        include: {
          user: { select: { email: true } },
          plan: true,
        },
      });

      let generated = 0;

      for (const sub of activeSubs) {
        const existingInvoice = await this.prisma.invoice.findFirst({
          where: {
            subscriptionId: sub.id,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
        });

        if (existingInvoice) continue;

        const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${sub.id.slice(0, 8)}`;

        await this.prisma.invoice.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            invoiceNumber,
            amount: sub.plan.price,
            currency: sub.plan.currency,
            status: 'draft',
            dueDate: addDays(now, 15),
            lineItems: [
              {
                description: `${sub.plan.name} - ${sub.plan.interval} subscription`,
                period: `${now.toISOString().slice(0, 7)}`,
                amount: sub.plan.price.toNumber(),
                currency: sub.plan.currency,
              },
            ],
          },
        });

        generated++;
      }

      if (generated > 0) {
        this.logger.log(`Generated ${generated} monthly invoices`);
      }
    } catch (error) {
      this.logger.error('Error generating monthly invoices', error instanceof Error ? error.stack : error);
    }
  }
}
