import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLoanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestPaid?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyEmi?: number;

  @ApiPropertyOptional({ description: 'Day of month EMI is due (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  emiDay?: number;

  @ApiPropertyOptional({ description: 'Loan start date' })
  @IsOptional()
  @IsString()
  startDate?: string;
}

export class UpdateLoanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyEmi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  emiDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;
}
