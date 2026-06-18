import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';

export interface RazorpayPlanParams {
  period: 'monthly' | 'yearly';
  interval: number;
  amount: number;
  name: string;
  description?: string;
}

export interface RazorpaySubscriptionParams {
  planId: string;
  totalCount: number;
  customerEmail: string;
  customerContact?: string;
  notes?: Record<string, string>;
  addonAmount?: number;
  authType?: 'automatic' | 'manual';
  maxAmount?: number;
  expireBy?: number;
}

export interface RazorpayCustomerParams {
  name: string;
  email: string;
  contact: string;
  fail_existing?: boolean | string;
  notes?: Record<string, string>;
}

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

  async createPlan(params: RazorpayPlanParams): Promise<any> {
    try {
      const plan: any = await this.getClient().plans.create({
        period: params.period,
        interval: params.interval,
        item: {
          name: params.name,
          description: params.description || params.name,
          amount: params.amount,
          currency: 'INR',
        },
      });
      return plan;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to create Razorpay plan';
      this.logger.error(`createPlan failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async createSubscription(params: RazorpaySubscriptionParams): Promise<any> {
    try {
      const body: any = {
        plan_id: params.planId,
        total_count: params.totalCount,
        customer_notify: 1,
        notify_info: {
          notify_email: params.customerEmail,
          ...(params.customerContact ? { notify_phone: params.customerContact } : {}),
        },
        notes: params.notes || {},
        auth_type: params.authType || 'automatic',
      };

      if (params.authType !== 'manual') {
        body.mandate = {
          method: 'emandate',
          frequency: params.totalCount <= 12 ? 'monthly' : 'yearly',
          max_amount: params.maxAmount || 0,
        };
      }

      if (params.expireBy) {
        body.expire_by = params.expireBy;
      }

      if (params.addonAmount) {
        body.addons = [{
          item: {
            name: 'Subscription (Current Period)',
            amount: params.addonAmount,
            currency: 'INR',
          },
        }];
      }

      const subscription: any = await this.getClient().subscriptions.create(body);
      return subscription;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to create Razorpay subscription';
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
      if (err?.statusCode === 400) {
        this.logger.warn(`Cannot cancel subscription ${subscriptionId}: already completed or cancelled`);
        return;
      }
      const desc = err?.error?.description || err?.message || 'Failed to cancel Razorpay subscription';
      this.logger.error(`cancelSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getClient().subscriptions.pause(subscriptionId);
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to pause Razorpay subscription';
      this.logger.error(`pauseSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getClient().subscriptions.resume(subscriptionId);
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to resume Razorpay subscription';
      this.logger.error(`resumeSubscription failed: ${desc}`, err?.stack);
      throw new InternalServerErrorException(desc);
    }
  }

  async retrySubscription(subscriptionId: string): Promise<any> {
    try {
      const result: any = await (this.getClient() as any).subscriptions.retry(subscriptionId);
      return result;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to retry Razorpay subscription';
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
      const result: any = await this.getClient().subscriptions.update(subscriptionId, params as any);
      return result;
    } catch (err: any) {
      const desc = err?.error?.description || err?.message || 'Failed to update Razorpay subscription';
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

  async createCustomer(params: RazorpayCustomerParams): Promise<any> {
    try {
      const customer: any = await this.getClient().customers.create(params as any);
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

  async upgradeSubscription(
    currentSubscriptionId: string,
    newPlanId: string,
    newPlanAmount: number,
    customerEmail: string,
    customerContact?: string,
    notes?: Record<string, string>,
  ) {
    const currentSub = await this.fetchSubscription(currentSubscriptionId);
    if (!currentSub) {
      throw new BadRequestException('Current subscription not found on Razorpay');
    }

    if (currentSub.status === 'active' || currentSub.status === 'created') {
      await this.cancelSubscription(currentSubscriptionId);
    }

    const remainingCount = Math.max(
      1,
      (currentSub.total_count || 12) - (currentSub.paid_count || 0),
    );

    return this.createSubscription({
      planId: newPlanId,
      totalCount: remainingCount,
      customerEmail,
      customerContact,
      notes,
      addonAmount: newPlanAmount,
    });
  }

  async downgradeSubscription(
    currentSubscriptionId: string,
    newPlanId: string,
    customerEmail: string,
    customerContact?: string,
  ) {
    const currentSub = await this.fetchSubscription(currentSubscriptionId);
    if (!currentSub) {
      throw new BadRequestException('Current subscription not found on Razorpay');
    }

    const remainingCount = Math.max(
      1,
      (currentSub.total_count || 12) - (currentSub.paid_count || 0),
    );

    return this.createSubscription({
      planId: newPlanId,
      totalCount: remainingCount,
      customerEmail,
      customerContact,
      notes: { downgraded_from: currentSubscriptionId },
    });
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    try {
      return validatePaymentVerification(
        { order_id: orderId, payment_id: paymentId },
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
