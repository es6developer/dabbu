import { IsString, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty()
  @IsUUID()
  memberId: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['admin', 'member', 'viewer'])
  role: 'admin' | 'member' | 'viewer';
}
