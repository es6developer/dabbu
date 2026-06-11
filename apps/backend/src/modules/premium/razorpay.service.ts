import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Razorpay from 'razorpay';
import { Logger } from '@nestjs/common';

@Injectable()
export class RazorpayService {
  private readonly razorpay: Razorpay | null;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(RazorpayService.name);

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!keyId || !keySecret) {
      this.logger.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — Razorpay disabled');
      this.razorpay = null;
    } else {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  async createPlan(params: {
    period: string;
    interval: number;
    amount: number;
    name: string;
    description?: string;
  }) {
    if (!this.razorpay) throw new InternalServerErrorException('Razorpay not configured');
    try {
      const plan: any = await this.razorpay.plans.create({
        period: params.period as 'daily' | 'weekly' | 'monthly' | 'yearly',
        interval: params.interval,
        item: {
          name: params.name,
          description: params.description || params.name,
          amount: params.amount,
          currency: 'INR',
        },
        notes: { plan_code: params.name },
      });
      return plan as any;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to create Razorpay plan';
      this.logger.error(`createPlan failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async createSubscription(params: {
    planId: string;
    totalCount: number;
    customerEmail: string;
    customerContact?: string;
    notes?: Record<string, string>;
    addonAmount?: number;
  }) {
    if (!this.razorpay) throw new InternalServerErrorException('Razorpay not configured');
    try {
      const body: any = {
        plan_id: params.planId,
        total_count: params.totalCount,
        customer_notify: 1,
        notify_info: { notify_email: params.customerEmail },
        notes: params.notes || {},
      };
      if (params.customerContact) {
        body.notify_info.notify_phone = params.customerContact;
      }
      if (params.addonAmount) {
        body.addons = [
          {
            item: {
              name: 'Subscription (Current Period)',
              amount: params.addonAmount,
              currency: 'INR',
            },
          },
        ];
      }
      const subscription: any = await this.razorpay.subscriptions.create(body);
      return subscription as any;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to create Razorpay subscription';
      this.logger.error(`createSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async fetchSubscription(subscriptionId: string) {
    if (!this.razorpay) return null;
    try {
      const subscription: any = await this.razorpay.subscriptions.fetch(subscriptionId);
      return subscription as any;
    } catch {
      return null;
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return false;
    }
    try {
      return Razorpay.validateWebhookSignature(body, signature, this.webhookSecret);
    } catch {
      return false;
    }
  }
}
