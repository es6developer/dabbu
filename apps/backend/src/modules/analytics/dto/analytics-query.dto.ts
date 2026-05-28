import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: AnalyticsPeriod })
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period?: AnalyticsPeriod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class DashboardQueryDto extends AnalyticsQueryDto {}

export class SpendingTrendQueryDto extends AnalyticsQueryDto {}

export class CategoryBreakdownQueryDto extends AnalyticsQueryDto {}

export class CashFlowQueryDto extends AnalyticsQueryDto {}

export class NetWorthQueryDto extends AnalyticsQueryDto {}

export class BudgetAnalyticsQueryDto extends AnalyticsQueryDto {}
