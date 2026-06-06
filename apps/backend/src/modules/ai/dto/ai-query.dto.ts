import { IsOptional, IsString, IsIn } from 'class-validator';

export class AiInsightsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['dashboard', 'transactions', 'shared_finance', 'goals', 'budgets', 'analytics'])
  section?: string;

  @IsOptional()
  @IsString()
  narrative?: string;
}
