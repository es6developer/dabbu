import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import {
  welcomeEmail,
  forgotPasswordEmail,
  passwordChangedEmail,
  premiumActivatedEmail,
  premiumRenewedEmail,
  premiumExpiryReminderEmail,
  paymentFailedEmail,
} from './email.templates';
import { EMAIL_SUBJECTS, PASSWORD_RESET_EXPIRY_MINUTES } from './email.constants';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private fromName: string;
  private fromEmail: string;
  private frontendUrl: string;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.fromName = this.configService.get<string>('mail.fromName') || 'Dabbu';
    this.fromEmail = this.configService.get<string>('mail.fromEmail') || '';
    this.frontendUrl =
      this.configService.get<string>('mail.frontendUrl') || 'https://web-omega-snowy-80.vercel.app';

    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const secure = this.configService.get<boolean>('mail.secure');
    const user = this.configService.get<string>('mail.user');
    const password = this.configService.get<string>('mail.password');

    if (host && user && password) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass: password },
      });
      this.initialized = true;
      this.logger.log(`Email transporter initialized: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.initialized) {
      this.logger.log(`[EMAIL LOG] To: ${options.to} | Subject: ${options.subject}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(
        `Email sent: to=${options.to} subject="${options.subject}" messageId=${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email: to=${options.to} subject="${options.subject}" error=${(error as Error).message}`,
      );
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.WELCOME,
      html: welcomeEmail(name, `${this.frontendUrl}/dashboard`),
    });
  }

  async sendForgotPasswordEmail(to: string, name: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.FORGOT_PASSWORD,
      html: forgotPasswordEmail(name, resetUrl, PASSWORD_RESET_EXPIRY_MINUTES),
    });
  }

  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.PASSWORD_CHANGED,
      html: passwordChangedEmail(name, timestamp),
    });
  }

  async sendPremiumActivatedEmail(
    to: string,
    name: string,
    planName: string,
    billingCycle: string,
    features: string[],
  ): Promise<void> {
    const startDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.PREMIUM_ACTIVATED,
      html: premiumActivatedEmail(
        name,
        planName,
        billingCycle,
        startDate,
        features,
        `${this.frontendUrl}/premium`,
      ),
    });
  }

  async sendPremiumRenewedEmail(
    to: string,
    name: string,
    renewalDate: string,
    nextBillingDate: string,
    amount: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.PREMIUM_RENEWED,
      html: premiumRenewedEmail(
        name,
        renewalDate,
        nextBillingDate,
        amount,
        `${this.frontendUrl}/premium`,
      ),
    });
  }

  async sendPremiumExpiryReminderEmail(
    to: string,
    name: string,
    daysRemaining: number,
    expiryDate: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.PREMIUM_EXPIRY_REMINDER,
      html: premiumExpiryReminderEmail(
        name,
        daysRemaining,
        expiryDate,
        `${this.frontendUrl}/premium`,
      ),
    });
  }

  async sendPaymentFailedEmail(
    to: string,
    name: string,
    planName: string,
    amount: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.PAYMENT_FAILED,
      html: paymentFailedEmail(
        name,
        planName,
        amount,
        `${this.frontendUrl}/premium/retry`,
        `${this.frontendUrl}/premium/billing`,
      ),
    });
  }
}
