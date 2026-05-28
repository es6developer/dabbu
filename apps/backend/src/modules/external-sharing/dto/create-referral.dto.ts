import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiPropertyOptional({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsOptional()
  tempUserId?: string;
}
