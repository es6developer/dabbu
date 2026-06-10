import { IsOptional, IsString, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CashFlowForecastDto {
  @ApiPropertyOptional({ description: 'Number of months to forecast (default 3, max 12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number;
}

export class SavingsForecastDto {
  @ApiPropertyOptional({ description: 'Monthly savings amount to simulate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySavings?: number;

  @ApiPropertyOptional({ description: 'Number of months to forecast (default 12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  months?: number;
}

export class LoanPayoffDto {
  @ApiPropertyOptional({ description: 'Loan ID (if not provided, uses all active loans)' })
  @IsOptional()
  @IsString()
  loanId?: string;

  @ApiPropertyOptional({ description: 'Extra monthly payment to accelerate payoff' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraPayment?: number;
}
