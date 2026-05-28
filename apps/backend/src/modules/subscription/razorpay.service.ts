import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: any;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret && !keyId.includes('placeholder')) {
      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      this.logger.log('Razorpay SDK initialized');
    } else {
      this.logger.warn('Razorpay not configured — using placeholder keys');
    }
  }

  async createOrder(amount: number, currency: string, receipt: string): Promise<any> {
    if (!this.razorpay) {
      this.logger.warn('Razorpay not initialized, returning mock order');
      return {
        id: `order_mock_${Date.now()}`,
        amount: amount * 100,
        currency,
        receipt,
        status: 'created',
        mock: true,
      };
    }

    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: currency || 'INR',
        receipt,
        payment_capture: true,
      });
      return order;
    } catch (error: any) {
      this.logger.error(`Failed to create Razorpay order: ${error.message}`);
      throw new BadRequestException('Failed to create payment order');
    }
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.razorpay) {
      this.logger.warn('Razorpay not initialized, skipping signature verification');
      return true;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET') || '')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error: any) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  async fetchPayment(paymentId: string): Promise<any> {
    if (!this.razorpay) {
      return { id: paymentId, status: 'captured', mock: true };
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error: any) {
      this.logger.error(`Failed to fetch payment: ${error.message}`);
      return null;
    }
  }

  isReady(): boolean {
    return !!this.razorpay;
  }
}
