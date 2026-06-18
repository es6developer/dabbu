import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';

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

  private getClient(): Razorpay {
    if (!this.razorpay) {
      throw new InternalServerErrorException('Razorpay not configured');
    }
    return this.razorpay;
  }

  async createPlan(params: {
    period: string;
    interval: number;
    amount: number;
    name: string;
    description?: string;
  }): Promise<any> {
    try {
      const plan: any = await this.getClient().plans.create({
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
      return plan;
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
  }): Promise<any> {
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
      const subscription: any = await this.getClient().subscriptions.create(body);
      return subscription;
    } catch (err: any) {
      const desc =
        err?.error?.description || err?.message || 'Failed to create Razorpay subscription';
      this.logger.error(`createSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async fetchSubscription(subscriptionId: string): Promise<any | null> {
    try {
      const subscription: any = await this.getClient().subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (err: any) {
      this.logger.warn(`fetchSubscription failed for ${subscriptionId}: ${err?.message}`);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getClient().subscriptions.cancel(subscriptionId);
    } catch (err: any) {
      const desc =
        err?.error?.description || err?.message || 'Failed to cancel Razorpay subscription';
      this.logger.error(`cancelSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getClient().subscriptions.pause(subscriptionId);
    } catch (err: any) {
      const desc =
        err?.error?.description || err?.message || 'Failed to pause Razorpay subscription';
      this.logger.error(`pauseSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getClient().subscriptions.resume(subscriptionId);
    } catch (err: any) {
      const desc =
        err?.error?.description || err?.message || 'Failed to resume Razorpay subscription';
      this.logger.error(`resumeSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async retrySubscription(subscriptionId: string): Promise<any> {
    try {
      const client = this.getClient();
      const result: any = await (client as any).subscriptions.retry(subscriptionId);
      return result;
    } catch (err: any) {
      const desc =
        err?.error?.description || err?.message || 'Failed to retry Razorpay subscription';
      this.logger.error(`retrySubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async updateSubscription(
    subscriptionId: string,
    params: {
      plan_id?: string;
      customer_notify?: number;
      quantity?: number;
      remaining_count?: number;
      schedule_change_at?: string;
    },
  ): Promise<any> {
    try {
      const result: any = await this.getClient().subscriptions.update(subscriptionId, params);
      return result;
    } catch (err: any) {
      const desc =
        err?.error?.description || err?.message || 'Failed to update Razorpay subscription';
      this.logger.error(`updateSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async createOrder(params: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
  }): Promise<any> {
    try {
      const order: any = await this.getClient().orders.create({
        amount: params.amount,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
      });
      return order;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to create Razorpay order';
      this.logger.error(`createOrder failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async fetchPayment(paymentId: string): Promise<any> {
    try {
      const payment: any = await this.getClient().payments.fetch(paymentId);
      return payment;
    } catch (err: any) {
      this.logger.warn(`fetchPayment failed for ${paymentId}: ${err?.message}`);
      return null;
    }
  }

  async createCustomer(params: {
    name: string;
    email: string;
    contact: string;
    fail_existing?: string;
    notes?: Record<string, string>;
  }): Promise<any> {
    try {
      const customer: any = await this.getClient().customers.create(params);
      return customer;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to create Razorpay customer';
      this.logger.error(`createCustomer failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async fetchCustomer(customerId: string): Promise<any> {
    try {
      const customer: any = await this.getClient().customers.fetch(customerId);
      return customer;
    } catch (err: any) {
      this.logger.warn(`fetchCustomer failed for ${customerId}: ${err?.message}`);
      return null;
    }
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    try {
      return Razorpay.validatePaymentSignature(
        JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
        signature,
        process.env.RAZORPAY_KEY_SECRET || '',
      );
    } catch {
      return false;
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
