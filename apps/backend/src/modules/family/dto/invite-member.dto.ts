import { IsEmail, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'sarah@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: ['admin', 'member', 'viewer'] })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'member', 'viewer'])
  role?: 'admin' | 'member' | 'viewer';
}
