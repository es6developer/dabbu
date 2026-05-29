import {
  IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IncomeSource {
  SALARY = 'salary',
  BUSINESS = 'business',
  FREELANCE = 'freelance',
  OTHER = 'other',
}

export class CreateIncomeDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: IncomeSource })
  @IsOptional()
  @IsEnum(IncomeSource)
  source?: IncomeSource;

  @ApiProperty({ example: 'Monthly salary' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2026-05-29' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateIncomeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: IncomeSource })
  @IsOptional()
  @IsEnum(IncomeSource)
  source?: IncomeSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
