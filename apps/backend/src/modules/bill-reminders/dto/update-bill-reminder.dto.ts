import { PartialType } from '@nestjs/swagger';
import { CreateBillReminderDto } from './create-bill-reminder.dto';
import { IsNumber, IsOptional, IsBoolean, Min, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBillReminderDto extends PartialType(CreateBillReminderDto) {
  @ApiPropertyOptional({ example: 1500, description: 'Amount paid so far' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
