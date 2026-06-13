import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
  groupInviteEmail,
  otpEmail,
} from './email.templates';
import { EMAIL_SUBJECTS, PASSWORD_RESET_EXPIRY_MINUTES } from './email.constants';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private resend: any | null = null;
  private ethereal: Transporter | null = null;
  private fromName: string;
  private fromEmail: string;
  private frontendUrl: string;
  private smtpInitialized = false;
  private resendInitialized = false;
  private etherealInitialized = false;
  private etherealUrl = '';

  constructor() {
    this.fromName = process.env.EMAIL_FROM_NAME || 'Dabbu';
    this.fromEmail =
      process.env.EMAIL_FROM ||
      process.env.SMTP_EMAIL ||
      process.env.SMTP_USER ||
      'noreply@dabbu.app';
    this.frontendUrl = (
      process.env.FRONTEND_URL || 'https://web-omega-snowy-80.vercel.app'
    ).replace(/\/+$/, '');

    this.initResend();

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
    const password = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (host && user && password) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass: password },
      });
      this.smtpInitialized = true;
      this.logger.log(`SMTP email provider initialized: ${host}:${port}`);
    }

    if (!this.resendInitialized && !this.smtpInitialized) {
      this.logger.warn('No email provider configured — emails will be logged only');
    }
  }

  private initResend() {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return;
    }
    import('resend')
      .then(({ Resend }) => {
        this.resend = new Resend(resendKey);
        this.resendInitialized = true;
        this.logger.log('Resend email provider initialized');
      })
      .catch((err) => {
        this.logger.warn(`Resend not available: ${err.message}. SMTP will be used if configured.`);
      });
  }

  async onModuleInit() {
    if (this.smtpInitialized && this.transporter) {
      try {
        await this.transporter.verify();
        this.logger.log('SMTP connection verified successfully');
      } catch (err) {
        this.logger.warn(
          `SMTP connection failed: ${(err as Error).message}. Attempting Ethereal fallback.`,
        );
        this.smtpInitialized = false;
      }
    }

    if (!this.resendInitialized && !this.smtpInitialized) {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.ethereal = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        this.etherealInitialized = true;
        this.etherealUrl = `https://ethereal.email/login?user=${encodeURIComponent(testAccount.user)}`;
        this.logger.log(`Ethereal email test account created. View emails at: ${this.etherealUrl}`);
      } catch (err) {
        this.logger.warn(`Failed to create Ethereal test account: ${(err as Error).message}`);
      }
    }
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (this.resendInitialized && this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        if (error) {
          throw new Error(error.message);
        }
        this.logger.log(
          `Email sent via Resend: to=${options.to} subject="${options.subject}" id=${data?.id}`,
        );
        return;
      } catch (err) {
        this.logger.error(`Resend failed: ${(err as Error).message}. Falling back to SMTP.`);
      }
    }

    if (this.smtpInitialized && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        this.logger.log(
          `Email sent via SMTP: to=${options.to} subject="${options.subject}" messageId=${info.messageId}`,
        );
        return;
      } catch (error) {
        this.logger.error(
          `SMTP failed: to=${options.to} subject="${options.subject}" error=${(error as Error).message}`,
        );
        throw error;
      }
    }

    if (this.etherealInitialized && this.ethereal) {
      try {
        const info = await this.ethereal.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        this.logger.log(
          `Email sent via Ethereal: to=${options.to} subject="${options.subject}" preview=${nodemailer.getTestMessageUrl(info)}`,
        );
        return;
      } catch (err) {
        this.logger.warn(`Ethereal send failed: ${(err as Error).message}`);
      }
    }

    this.logger.log(
      `[EMAIL LOG] To: ${options.to} | Subject: ${options.subject}${options.text ? ` | Body: ${options.text}` : ''}`,
    );
  }

  async sendOtpEmail(to: string, name: string, otpCode: string, purpose: string): Promise<void> {
    const purposeLabel =
      purpose === 'email_verification' ? 'email verification' : purpose.replace('_', ' ');
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.OTP_VERIFICATION,
      html: otpEmail(name, otpCode, purpose),
      text: `Your Dabbu ${purposeLabel} code is: ${otpCode}. It expires in 10 minutes.`,
    });
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

  async sendGroupInviteEmail(
    to: string,
    name: string,
    groupName: string,
    inviterName: string,
  ): Promise<void> {
    const groupUrl = `${this.frontendUrl}/shared-finance/groups`;
    await this.send({
      to,
      subject: EMAIL_SUBJECTS.GROUP_INVITE,
      html: groupInviteEmail(name, groupName, inviterName, groupUrl),
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
