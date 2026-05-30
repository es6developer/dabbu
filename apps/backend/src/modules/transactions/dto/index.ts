import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export class CreateTransactionDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount: number;

  @ApiProperty({ enum: TransactionType }) @IsEnum(TransactionType) type: TransactionType;

  @ApiProperty() @IsString() accountId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() recurringFrequency?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() receiptUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() expenseGroupId?: string;
}

export class UpdateTransactionDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() recurringFrequency?: string;
}

export class TransactionFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() expenseGroupId?: string;
}
