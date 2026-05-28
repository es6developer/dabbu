import {
  IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, IsInt, Min, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@dabbu.app' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'AdminStr0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AdminCreateDto {
  @ApiProperty({ example: 'admin@dabbu.app' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Admin' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: ['super_admin', 'admin', 'support', 'analyst'] })
  @IsString()
  @IsOptional()
  role?: string;
}

export class ListUsersQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class UpdateUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

export class CreateFeatureFlagDto {
  @ApiProperty({ example: 'ai-insights' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'System Maintenance' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'The app will be down for maintenance tonight.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'system' })
  @IsString()
  @IsOptional()
  type?: string;
}

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  entity?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gateway?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class CreatePlanDto {
  @ApiProperty({ example: 'Premium' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 999 })
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'], default: 'monthly' })
  @IsString()
  @IsOptional()
  interval?: string;

  @ApiPropertyOptional()
  @IsOptional()
  features?: Record<string, boolean>;

  @ApiPropertyOptional({ default: 3 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxAccounts?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxCategories?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxBudgets?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxBills?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxGoals?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxInvestments?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxFamilyMembers?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Premium' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 999 })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'] })
  @IsString()
  @IsOptional()
  interval?: string;

  @ApiPropertyOptional()
  @IsOptional()
  features?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxAccounts?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxCategories?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxBudgets?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxBills?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxGoals?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxInvestments?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxFamilyMembers?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export interface SystemStatsResponse {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  activeSubscriptions: number;
  totalFamilies: number;
  totalReminders: number;
  totalTransactions: number;
  revenueThisMonth: number;
  pendingPayments: number;
  totalFeatureFlags: number;
  newUsersToday: number;
}
