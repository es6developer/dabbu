import {
  IsString, IsNumber, IsOptional, IsEnum, IsUUID, IsArray, ValidateNested,
  Min, Max, ArrayMinSize, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContributionRuleType {
  EQUAL = 'equal',
  PERCENTAGE = 'percentage',
  SALARY_RATIO = 'salary_ratio',
  FIXED = 'fixed',
}

export class ContributionRuleValueDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  value: number;
}

export class CreateContributionRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ContributionRuleType })
  @IsEnum(ContributionRuleType)
  type: ContributionRuleType;

  @ApiProperty({ type: [ContributionRuleValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContributionRuleValueDto)
  @ArrayMinSize(1)
  values: ContributionRuleValueDto[];
}

export class UpdateContributionRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ContributionRuleType })
  @IsOptional()
  @IsEnum(ContributionRuleType)
  type?: ContributionRuleType;

  @ApiPropertyOptional({ type: [ContributionRuleValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContributionRuleValueDto)
  values?: ContributionRuleValueDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class ApplyContributionDto {
  @ApiProperty()
  @IsUUID()
  ruleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;
}

export class CalculateContributionDto {
  @ApiProperty()
  @IsUUID()
  ruleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}
