import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class PremiumWebhookService {
  constructor(
    private premiumService: PremiumService,
    private razorpayService: RazorpayService,
  ) {}

  async handleRazorpayWebhook(rawBody: string, signature: string) {
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    const body = JSON.parse(rawBody);
    const eventId = body.event_id || body.id;
    const eventType = body.event;
    const payload = body.payload || body;
    return this.premiumService.handleWebhookEvent(eventId, eventType, payload);
  }
}
