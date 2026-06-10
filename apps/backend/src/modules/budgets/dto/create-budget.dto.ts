import {
  IsString,
  MinLength,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Monthly Groceries' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'monthly' })
  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'monthly', 'yearly', 'custom'])
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  notifyAt?: number;

  @ApiPropertyOptional({ example: 'Weekly grocery budget' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
