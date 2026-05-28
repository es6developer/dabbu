import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversionActionDto {
  @ApiProperty({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  tempUserId: string;

  @ApiProperty({ example: 'banner_clicked' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['banner_shown', 'banner_clicked', 'signup_started', 'signup_completed', 'upsell_viewed', 'upsell_dismissed', 'app_install_clicked', 'deep_link_opened'])
  eventType: string;

  @ApiPropertyOptional({ example: 'clicked' })
  @IsString()
  @IsOptional()
  @IsEnum(['dismissed', 'clicked', 'signed_up', 'ignored'])
  response?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
