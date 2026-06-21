import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LensType } from '@prisma/client';

export class ChangeLensDto {
  @ApiProperty({ enum: LensType, example: 'FAMILY', description: 'Target lens type' })
  @IsEnum(LensType)
  lens: LensType;

  @ApiPropertyOptional({ example: 'manual', description: 'Reason for switching' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: { source: 'lens_picker' }, description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
