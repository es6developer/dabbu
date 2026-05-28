import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ example: 'google-id-token-xxx' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ example: 'user@gmail.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/...' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'device-abc-123' })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
