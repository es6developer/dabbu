import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  async createPlan(params: {
    period: string;
    interval: number;
    amount: number;
    name: string;
    description?: string;
  }) {
    try {
      const response = await axios.post(
        'https://api.razorpay.com/v1/plans',
        {
          period: params.period,
          interval: params.interval,
          item: {
            name: params.name,
            description: params.description || params.name,
            amount: params.amount,
            currency: 'INR',
          },
          notes: { plan_code: params.name },
        },
        {
          headers: {
            Authorization: this.authHeader(),
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (err: any) {
      throw new InternalServerErrorException(
        err.response?.data?.error?.description || 'Failed to create Razorpay plan',
      );
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
      const response = await axios.post('https://api.razorpay.com/v1/subscriptions', body, {
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (err: any) {
      throw new InternalServerErrorException(
        err.response?.data?.error?.description || 'Failed to create Razorpay subscription',
      );
    }
  }

  async fetchSubscription(subscriptionId: string) {
    try {
      const response = await axios.get(
        `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`,
        {
          headers: { Authorization: this.authHeader() },
        },
      );
      return response.data;
    } catch {
      return null;
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
