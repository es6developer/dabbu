import { IsString, IsOptional, IsNumber, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GroupType {
  FRIENDS = 'friends',
  TRIP = 'trip',
  FAMILY = 'family',
  COUPLE = 'couple',
  ROOMMATES = 'roommates',
  OFFICE = 'office',
  EVENT = 'event',
  APARTMENT = 'apartment',
}

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export class CreateGroupDto {
  @ApiProperty() @IsString() name: string;

  @ApiPropertyOptional({ enum: GroupType }) @IsOptional() @IsEnum(GroupType) type?: GroupType;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2) @Max(100) maxMembers?: number;
}

export class UpdateGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ enum: GroupType }) @IsOptional() @IsEnum(GroupType) type?: GroupType;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2) @Max(100) maxMembers?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() coverUrl?: string;
}

export class InviteResponseDto {
  @ApiProperty() inviteCode: string;

  @ApiProperty() expiresAt?: string;
}

export class JoinGroupDto {
  @ApiProperty() @IsString() inviteCode: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: MemberRole }) @IsEnum(MemberRole) role: MemberRole;
}

export class SalaryProfileDto {
  @ApiProperty() @IsNumber() @Min(0) salary: number;

  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
}

export class AddMemberByEmailDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 'Friend' })
  @IsOptional()
  @IsString()
  displayName?: string;
}
