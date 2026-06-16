export const EMAIL_SUBJECTS = {
  WELCOME: 'Welcome to Dabbu 🎉',
  FORGOT_PASSWORD: 'Reset Your Dabbu Password',
  PASSWORD_CHANGED: 'Your Dabbu Password Was Changed',
  PREMIUM_ACTIVATED: 'Welcome to Dabbu Premium 🚀',
  PREMIUM_RENEWED: 'Your Dabbu Premium Subscription Has Been Renewed',
  PREMIUM_EXPIRY_REMINDER: 'Your Dabbu Premium Plan Is Expiring Soon',
  PAYMENT_FAILED: 'Action Required: Premium Renewal Failed',
  GROUP_INVITE: "You've Been Added to a Group on Dabbu",
  OTP_VERIFICATION: 'Your Dabbu Verification Code',
  SETTLEMENT_COMPLETED: 'Settlement Completed on Dabbu',
  SETTLEMENT_REQUESTED: 'New Settlement Request on Dabbu',
  EXPENSE_ADDED: 'New Expense Added to Your Group',
  MEMBER_REMOVED: 'You Were Removed From a Group',
  LOGIN_ALERT: 'New Login to Your Dabbu Account',
  BUDGET_ALERT: 'Budget Alert: You\'ve Exceeded Your Limit',
  BILL_REMINDER: 'Reminder: Upcoming Bill Due',
  ACCOUNT_DEACTIVATED: 'Your Dabbu Account Has Been Deactivated',
  ACCOUNT_REACTIVATED: 'Your Dabbu Account Has Been Reactivated',
  NEW_DEVICE_LOGIN: 'New Device Logged Into Your Account',
} as const;

export const PASSWORD_RESET_EXPIRY_MINUTES = 30;

export const PREMIUM_EXPIRY_REMINDER_DAYS = [7, 3, 1] as const;
