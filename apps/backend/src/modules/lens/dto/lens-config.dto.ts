import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LensType } from '@prisma/client';

export class LensConfigQueryDto {
  @ApiPropertyOptional({ enum: LensType, description: 'Lens type to get config for (defaults to active lens)' })
  @IsOptional()
  @IsEnum(LensType)
  lens?: LensType;
}
