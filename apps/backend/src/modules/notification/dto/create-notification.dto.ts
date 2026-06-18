import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean,
  IsInt, Min, Max, IsUUID, IsObject, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  REMINDER = 'reminder',
  PAYMENT = 'payment',
  BILL = 'bill',
  GOAL = 'goal',
  SUBSCRIPTION = 'subscription',
  FAMILY = 'family',
  SYSTEM = 'system',
  PROMOTIONAL = 'promotional',
  GROUP_EXPENSE = 'group_expense',
  GROUP_INCOME = 'group_income',
  GROUP_ADD = 'group_add',
  EXPENSE = 'expense',
  EXPENSE_ALERT = 'expense_alert',
  BUDGET_EXCEEDED = 'budget_exceeded',
  BUDGET_ALERT = 'budget_alert',
  SPENDING_SPIKE = 'spending_spike',
  GROUP_INVITE = 'group_invite',
  GROUP_JOIN = 'group_join',
  GROUP_REMOVE = 'group_remove',
  GROUP_LEAVE = 'group_leave',
  MEMBER_ADDED = 'member_added',
  MEMBER_JOINED = 'member_joined',
  SETTLEMENT_REQUEST = 'settlement_request',
  SETTLEMENT_COMPLETE = 'settlement_complete',
  PAYMENT_SENT = 'payment_sent',
  GOAL_CREATED = 'goal_created',
  GOAL_MILESTONE = 'goal_milestone',
  GOAL_COMPLETE = 'goal_complete',
  GOAL_BEHIND = 'goal_behind',
  EMI_REMINDER = 'emi_reminder',
  EMI_OVERDUE = 'emi_overdue',
  SUBSCRIPTION_REMINDER = 'subscription_reminder',
  SUBSCRIPTION_RENEWAL = 'subscription_renewal',
  BILL_REMINDER = 'bill_reminder',
  REMINDER_UPCOMING = 'reminder_upcoming',
  REMINDER_OVERDUE = 'reminder_overdue',
  INSIGHT_SAVINGS = 'insight_savings',
  INSIGHT_SPENDING = 'insight_spending',
  DAILY_DIGEST = 'daily_digest',
  WEEKLY_DIGEST = 'weekly_digest',
  MONTHLY_REPORT = 'monthly_report',
  AI_INSIGHT = 'ai_insight',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPTED = 'friend_accepted',
  FAMILY_INVITE = 'family_invite',
  FAMILY_REMOVE = 'family_remove',
  FAMILY_LEAVE = 'family_leave',
  COUPLE_REQUEST = 'couple_request',
  COUPLE_APPROVED = 'couple_approved',
  REFERRAL_LINK_CLICKED = 'referral_link_clicked',
  REFERRAL_SIGNUP = 'referral_signup',
  REFERRAL_REWARD_CREDITED = 'referral_reward_credited',
  REFERRAL_REWARD_CLAIMED = 'referral_reward_claimed',
  REFERRAL_REJECTED = 'referral_rejected',
  TEST_PUSH = 'test_push',
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  INAP = 'inapp',
}

export class CreateNotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.BILL })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Bill payment due tomorrow' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Your electricity bill of ₹1,500 is due tomorrow.' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ example: '2026-06-01T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: 'bill' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  reminderId?: string;

  @ApiPropertyOptional({ example: '/bills/123' })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  overdue?: boolean;
}

export class MarkReadDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  notificationId: string;
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;
}

export class UpdateDeviceTokenDto {
  @ApiProperty({ example: 'ios' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ example: 'fcm-device-token-abc123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  deviceName?: string;

  @ApiProperty({ example: 'device-unique-id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceId: string;
}

export class TestPushDto {
  @ApiPropertyOptional({ example: 'Test Notification' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'This is a test push notification from Dabbu' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  body?: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  weeklyReport?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  monthlyReport?: boolean;
}
