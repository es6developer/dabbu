import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Friend' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invitationId: string;
}

export class RejectInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invitationId: string;
}
