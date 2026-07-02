import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RetentionPolicyDto {
  @IsOptional()
  @IsNumber()
  retentionDays?: number;

  @IsOptional()
  @IsString({ each: true })
  categories?: string[];
}
