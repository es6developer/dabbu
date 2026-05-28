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
  type: NotificationType;

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
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ example: '2026-06-01T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
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
