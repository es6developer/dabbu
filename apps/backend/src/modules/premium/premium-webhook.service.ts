import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PremiumWebhookService {
  private readonly logger = new Logger(PremiumWebhookService.name);
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_BASE_DELAY_MS = 2000;

  constructor(
    private premiumService: PremiumService,
    private razorpayService: RazorpayService,
    private prisma: PrismaService,
  ) {}

  async handleRazorpayWebhook(rawBody: string, signature: string) {
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const body = JSON.parse(rawBody);
    const eventId = body.id || body.event_id;
    const eventType = body.event;
    const payload = body.payload || body;

    if (!eventId || !eventType) {
      this.logger.warn('Webhook missing event_id or event type');
      return { duplicate: false, ignored: true };
    }

    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      this.logger.log(`Duplicate webhook event ${eventId} (${eventType}), skipping`);
      return { duplicate: true };
    }

    const event = await this.prisma.webhookEvent.create({
      data: {
        eventId,
        eventType,
        payload,
        status: 'processing',
      },
    });

    try {
      await this.processWebhookEvent(eventType, payload);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'processed', processedAt: new Date() },
      });
      this.logger.log(`Processed webhook ${eventId} (${eventType})`);

      await this.auditLog('webhook_processed', {
        eventId,
        eventType,
        status: 'success',
      });

      return { duplicate: false };
    } catch (err: any) {
      this.logger.error(`Failed to process webhook ${eventId} (${eventType}): ${err.message}`);

      const retryCount = (payload._retryCount || 0) + 1;
      if (retryCount <= this.MAX_RETRIES) {
        const delay = this.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        this.logger.log(`Scheduling retry ${retryCount}/${this.MAX_RETRIES} for ${eventId} in ${delay}ms`);
        setTimeout(() => {
          this.retryWebhookEvent(event.id, eventId, eventType, payload, retryCount).catch((e) =>
            this.logger.error(`Retry failed for ${eventId}: ${e.message}`),
          );
        }, delay);
      }

      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'failed', errorMessage: err.message },
      });

      await this.auditLog('webhook_failed', {
        eventId,
        eventType,
        error: err.message,
        retryCount,
      });

      throw err;
    }
  }

  private async retryWebhookEvent(
    eventDbId: string,
    eventId: string,
    eventType: string,
    payload: any,
    retryCount: number,
  ) {
    try {
      payload._retryCount = retryCount;
      await this.processWebhookEvent(eventType, payload);
      await this.prisma.webhookEvent.update({
        where: { id: eventDbId },
        data: { status: 'processed', processedAt: new Date() },
      });
      this.logger.log(`Retry ${retryCount} succeeded for ${eventId}`);

      await this.auditLog('webhook_retry_success', {
        eventId,
        eventType,
        retryCount,
      });
    } catch (err: any) {
      this.logger.error(`Retry ${retryCount} failed for ${eventId}: ${err.message}`);
      await this.prisma.webhookEvent.update({
        where: { id: eventDbId },
        data: { errorMessage: `Retry ${retryCount}: ${err.message}` },
      });

      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        setTimeout(() => {
          this.retryWebhookEvent(eventDbId, eventId, eventType, payload, retryCount + 1).catch(
            (e) => this.logger.error(`Final retry failed for ${eventId}: ${e.message}`),
          );
        }, delay);
      } else {
        await this.auditLog('webhook_max_retries_exceeded', {
          eventId,
          eventType,
          maxRetries: this.MAX_RETRIES,
        });
      }
    }
  }

  private async processWebhookEvent(eventType: string, payload: any) {
    const razorpaySubId =
      payload.subscription?.entity?.id || payload.subscription_id || payload.id;

    this.logger.log(`Processing webhook event: ${eventType} for subscription: ${razorpaySubId}`);

    switch (eventType) {
      case 'subscription.activated':
        await this.premiumService.handleSubscriptionActivated(razorpaySubId, payload);
        break;

      case 'subscription.charged':
        await this.premiumService.handleSubscriptionCharged(razorpaySubId, payload);
        break;

      case 'subscription.completed':
        await this.premiumService.handleSubscriptionCompleted(razorpaySubId, payload);
        break;

      case 'subscription.pending':
        await this.premiumService.handleSubscriptionPending(razorpaySubId, payload);
        break;

      case 'subscription.halted':
        await this.premiumService.handleSubscriptionHalted(razorpaySubId, payload);
        break;

      case 'subscription.cancelled':
        await this.premiumService.handleSubscriptionCancelled(razorpaySubId, payload);
        break;

      case 'subscription.paused':
        await this.premiumService.handleSubscriptionPaused(razorpaySubId, payload);
        break;

      case 'subscription.resumed':
        await this.premiumService.handleSubscriptionResumed(razorpaySubId, payload);
        break;

      case 'payment.authorized':
        await this.premiumService.handlePaymentAuthorized(payload);
        break;

      case 'payment.captured':
        await this.premiumService.handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await this.premiumService.handlePaymentFailed(payload);
        break;

      case 'payment.refunded':
        await this.premiumService.handlePaymentRefunded(payload);
        break;

      default:
        this.logger.warn(`Unhandled webhook event type: ${eventType}`);
    }
  }

  private async auditLog(action: string, details: Record<string, any>) {
    try {
      await this.prisma.subscriptionAudit.create({
        data: {
          action,
          performedBy: 'webhook',
          details,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to create audit log: ${(err as Error).message}`);
    }
  }
}
