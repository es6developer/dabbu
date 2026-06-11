import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsIn,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBillReminderDto {
  @ApiProperty({ example: 'Electricity Bill' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: 'monthly' })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
  frequency?: string;

  @ApiPropertyOptional({ example: 5, description: 'Remind N days before due date' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderDays?: number;

  @ApiPropertyOptional({ example: 'Pay by 15th every month' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'Tata Power' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  payee?: string;

  @ApiPropertyOptional({ example: 'https://pay.tatapower.com' })
  @IsOptional()
  @IsString()
  autopayUrl?: string;
}
