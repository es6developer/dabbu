import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteExternalMemberDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'uuid-of-group' })
  @IsUUID()
  groupId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;
}

export class GoogleOAuthTempDto {
  @ApiProperty()
  @IsString()
  idToken: string;

  @ApiProperty({ example: 'uuid-of-group' })
  @IsUUID()
  groupId: string;
}

export class ConvertTempUserDto {
  @ApiProperty()
  @IsString()
  tempUserId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  password?: string;
}
