import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstallTrackDto {
  @ApiProperty({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  tempUserId: string;

  @ApiPropertyOptional({ example: 'device-abc-123' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'ios' })
  @IsString()
  @IsOptional()
  @IsEnum(['ios', 'android'])
  platform?: string;

  @ApiPropertyOptional({ example: 'banner' })
  @IsString()
  @IsOptional()
  @IsEnum(['banner', 'deep_link', 'referral', 'qr_code', 'share_link'])
  source?: string;
}
