import {
  IsString, IsNotEmpty, IsOptional, IsInt, Min, Max,
  IsBoolean, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({ example: 'group-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiPropertyOptional({ example: 50 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({ example: 48 })
  @IsInt()
  @Min(1)
  @Max(720)
  @IsOptional()
  expiresInHours?: number;

  @ApiPropertyOptional({
    example: {
      canAddExpenses: true,
      canSettle: true,
      canChat: true,
      canUploadBills: false,
      canViewHistory: true,
      canInviteOthers: false,
    },
  })
  @IsObject()
  @IsOptional()
  permissions?: {
    canAddExpenses?: boolean;
    canSettle?: boolean;
    canChat?: boolean;
    canUploadBills?: boolean;
    canViewHistory?: boolean;
    canInviteOthers?: boolean;
  };

  @ApiPropertyOptional({ example: 'whatsapp' })
  @IsString()
  @IsOptional()
  utmSource?: string;

  @ApiPropertyOptional({ example: 'summer_trip' })
  @IsString()
  @IsOptional()
  utmCampaign?: string;
}
