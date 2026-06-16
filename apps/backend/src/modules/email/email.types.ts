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

export interface SettlementEmailData {
  name: string;
  groupName: string;
  amount: string;
  settledWithName: string;
  groupUrl: string;
}

export interface ExpenseAddedEmailData {
  name: string;
  groupName: string;
  description: string;
  amount: string;
  addedByName: string;
  groupUrl: string;
}

export interface BudgetAlertEmailData {
  name: string;
  category: string;
  spent: string;
  budget: string;
  percentage: number;
  dashboardUrl: string;
}

export interface BillReminderEmailData {
  name: string;
  billName: string;
  amount: string;
  dueDate: string;
  daysRemaining: number;
  groupName?: string;
  dashboardUrl: string;
}

export interface LoginAlertEmailData {
  name: string;
  deviceName: string;
  platform: string;
  timestamp: string;
  ipAddress: string;
  location?: string;
  securityUrl: string;
}

export interface AccountDeactivatedEmailData {
  name: string;
  supportUrl: string;
}

export interface MemberRemovedEmailData {
  name: string;
  groupName: string;
  removedByName: string;
  supportUrl: string;
}

export interface GroupExpenseAddedEmailData {
  memberName: string;
  groupName: string;
  description: string;
  amount: string;
  addedBy: string;
  groupUrl: string;
}
