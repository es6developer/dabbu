export enum ReminderType {
  GENERAL = 'general',
  PAYMENT = 'payment',
  BILL = 'bill',
  SUBSCRIPTION = 'subscription',
  GOAL = 'goal',
}

export enum ReminderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ReminderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  SNOOZED = 'snoozed',
  DISMISSED = 'dismissed',
}

export enum ReminderFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}
