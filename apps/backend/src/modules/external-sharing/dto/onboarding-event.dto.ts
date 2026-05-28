import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingEventDto {
  @ApiProperty({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  tempUserId: string;

  @ApiProperty({ example: 'banner_shown' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['banner_shown', 'banner_clicked', 'signup_started', 'signup_completed', 'upsell_viewed', 'upsell_dismissed', 'app_install_clicked', 'deep_link_opened'])
  eventType: string;

  @ApiPropertyOptional({ example: 'settlement_flow' })
  @IsString()
  @IsOptional()
  @IsEnum(['settlement_flow', 'expense_flow', 'chat_flow', 'dashboard', 'locked_feature'])
  source?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
