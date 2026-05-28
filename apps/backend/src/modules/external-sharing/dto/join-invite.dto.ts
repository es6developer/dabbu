import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinInviteDto {
  @ApiProperty({ example: 'invite-token-abc123' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsOptional()
  tempUserId?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  nickname?: string;
}
