export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  name: string;
  dashboardUrl: string;
}

export interface ForgotPasswordEmailData {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface PasswordChangedEmailData {
  name: string;
  timestamp: string;
}

export interface PremiumActivatedEmailData {
  name: string;
  planName: string;
  billingCycle: string;
  startDate: string;
  features: string[];
  manageUrl: string;
}

export interface PremiumRenewedEmailData {
  name: string;
  renewalDate: string;
  nextBillingDate: string;
  amount: string;
  manageUrl: string;
}

export interface PremiumExpiryReminderEmailData {
  name: string;
  daysRemaining: number;
  expiryDate: string;
  renewUrl: string;
}

export interface PaymentFailedEmailData {
  name: string;
  planName: string;
  amount: string;
  retryUrl: string;
  updatePaymentUrl: string;
}
