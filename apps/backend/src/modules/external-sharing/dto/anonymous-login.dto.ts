import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnonymousLoginDto {
  @ApiPropertyOptional({ example: 'abc123device' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  deviceId?: string;

  @ApiPropertyOptional({ example: 'ios' })
  @IsString()
  @IsOptional()
  @IsEnum(['ios', 'android', 'web'])
  devicePlatform?: string;

  @ApiPropertyOptional({ example: 'fcm-token-xyz' })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiPropertyOptional({ example: 'Guest User' })
  @IsString()
  @IsOptional()
  name?: string;
}
