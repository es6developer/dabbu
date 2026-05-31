import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
  IsInt,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderType, ReminderPriority, ReminderStatus, ReminderFrequency } from '../interfaces';

export class RecurringReminderDto {
  @ApiProperty({ enum: ReminderFrequency, description: 'Recurrence frequency' })
  @IsEnum(ReminderFrequency)
  frequency: ReminderFrequency;

  @ApiPropertyOptional({ description: 'Interval multiplier (e.g., 2 for every 2 weeks)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiPropertyOptional({ description: 'Days of week for weekly/custom (0=Sun, 6=Sat)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'Day of month for monthly (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Month of year for yearly (1-12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  @ApiPropertyOptional({ description: 'End date for recurrence' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Max number of occurrences' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  occurrences?: number;
}

export class CreateReminderDto {
  @ApiProperty({ description: 'Reminder title' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Reminder description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: ReminderType, description: 'Type of reminder' })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty({ enum: ReminderPriority, description: 'Priority level' })
  @IsEnum(ReminderPriority)
  priority: ReminderPriority;

  @ApiPropertyOptional({
    enum: ReminderStatus,
    description: 'Status',
    default: ReminderStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Snooze until (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  snoozedUntil?: string;

  @ApiPropertyOptional({ description: 'Whether the reminder repeats', default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Transaction category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Custom metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Recurrence configuration (required if isRecurring=true)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringReminderDto)
  recurring?: RecurringReminderDto;
}

export class UpdateReminderDto {
  @ApiPropertyOptional({ description: 'Reminder title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Reminder description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ReminderType, description: 'Type of reminder' })
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;

  @ApiPropertyOptional({ enum: ReminderPriority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;

  @ApiPropertyOptional({ enum: ReminderStatus, description: 'Status' })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Snooze until (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  snoozedUntil?: string;

  @ApiPropertyOptional({ description: 'Whether the reminder repeats' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Transaction category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Custom metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Recurrence configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringReminderDto)
  recurring?: RecurringReminderDto;
}

export class ListRemindersQueryDto {
  @ApiPropertyOptional({ enum: ReminderType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;

  @ApiPropertyOptional({ enum: ReminderPriority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;

  @ApiPropertyOptional({ enum: ReminderStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiPropertyOptional({ description: 'Search in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter reminders starting from this date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter reminders ending at this date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class SnoozeReminderDto {
  @ApiProperty({ description: 'Snooze until (ISO 8601)' })
  @IsDateString()
  until: string;
}
