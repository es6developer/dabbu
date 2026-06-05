import {
  IsString,
  MinLength,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ example: 'Emergency Fund' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  targetAmount: number;

  @ApiPropertyOptional({ example: 'emergency' })
  @IsOptional()
  @IsString()
  @IsIn([
    'emergency',
    'vacation',
    'education',
    'home',
    'car',
    'wedding',
    'retirement',
    'custom',
    'savings',
    'investment',
    'debt',
  ])
  type?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 'shield-checkmark' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#4F6EF7' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyContribution?: number;

  @ApiPropertyOptional({ example: 'Save for a rainy day' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
