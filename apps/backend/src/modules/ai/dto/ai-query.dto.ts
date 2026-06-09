import { IsOptional, IsString, IsIn } from 'class-validator';

export class AiInsightsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['dashboard', 'transactions', 'shared_finance', 'goals', 'budgets', 'analytics', 'dna', 'health', 'predictions', 'anomalies'])
  section?: string;

  @IsOptional()
  @IsString()
  narrative?: string;
}

export class CategorySuggestionDto {
  @IsString()
  description: string;
}

export class CategoryCorrectionDto {
  @IsString()
  originalText: string;

  @IsString()
  correctedCategory: string;
}
