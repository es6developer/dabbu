import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PremiumWebhookService {
  private readonly logger = new Logger(PremiumWebhookService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_BASE_DELAY_MS = 1000;

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
      return { duplicate: false };
    } catch (err: any) {
      this.logger.error(`Failed to process webhook ${eventId} (${eventType}): ${err.message}`);

      const retryCount = (payload._retryCount || 0) + 1;
      if (retryCount <= this.MAX_RETRIES) {
        const delay = this.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        this.logger.log(
          `Scheduling retry ${retryCount}/${this.MAX_RETRIES} for ${eventId} in ${delay}ms`,
        );
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
      }
    }
  }

  private async processWebhookEvent(eventType: string, payload: any) {
    const razorpaySubId = payload.subscription?.entity?.id || payload.subscription_id || payload.id;

    switch (eventType) {
      case 'subscription.activated':
        await this.premiumService.handleActivation(razorpaySubId, payload);
        break;

      case 'subscription.charged':
        await this.premiumService.handleCharge(razorpaySubId, payload);
        break;

      case 'subscription.pending':
        await this.premiumService.handlePending(razorpaySubId, payload);
        break;

      case 'subscription.halted':
        await this.premiumService.handleHalted(razorpaySubId, payload);
        break;

      case 'subscription.cancelled':
        await this.premiumService.handleCancellation(razorpaySubId, payload);
        break;

      case 'subscription.paused':
        await this.premiumService.handlePause(razorpaySubId, payload);
        break;

      case 'subscription.resumed':
        await this.premiumService.handleResume(razorpaySubId, payload);
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

      default:
        this.logger.warn(`Unhandled webhook event type: ${eventType}`);
    }
  }
}
