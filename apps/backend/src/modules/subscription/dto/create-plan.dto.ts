import {
  IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsInt, Min, Max, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'premium', description: 'Unique plan code' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 9.99, description: 'Plan price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'monthly', description: 'Billing interval' })
  @IsString()
  interval: string;

  @ApiPropertyOptional({ description: 'Plan features as JSON object' })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAccounts?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCategories?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBudgets?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBills?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxGoals?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxInvestments?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxFamilyMembers?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Premium Plan' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'premium' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 9.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'monthly' })
  @IsOptional()
  @IsString()
  interval?: string;

  @ApiPropertyOptional({ description: 'Plan features as JSON object' })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAccounts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCategories?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBudgets?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBills?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxGoals?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxInvestments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxFamilyMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
