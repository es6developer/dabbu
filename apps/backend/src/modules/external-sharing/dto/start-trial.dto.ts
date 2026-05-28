import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartTrialDto {
  @ApiProperty({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  tempUserId: string;

  @ApiProperty({ example: 'first_month_free' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['first_month_free', 'referral', 'trip_completion', 'conversion_reward', 'onboarding_bonus'])
  trialType: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
