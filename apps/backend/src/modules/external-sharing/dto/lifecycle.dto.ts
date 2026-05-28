import { IsString, IsOptional, IsIn, IsNumber, Min, IsBoolean } from 'class-validator';
import { GroupStatus, RestrictionType } from '../lifecycle.types';

export class UpdateGroupStatusDto {
  @IsString()
  @IsIn(['active', 'paused', 'completed', 'archived', 'closed'])
  status: GroupStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RemoveMemberDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddRestrictionDto {
  @IsString()
  @IsIn(['no_new_expenses', 'no_edits', 'no_settlements', 'read_only', 'no_chat', 'no_invites', 'all_blocked'])
  restrictionType: RestrictionType;

  @IsString()
  @IsIn(['all', 'full_users', 'temp_users', 'specific_user', 'specific_temp'])
  appliedTo: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetTempId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInHours?: number;
}

export class RevokeInviteDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
