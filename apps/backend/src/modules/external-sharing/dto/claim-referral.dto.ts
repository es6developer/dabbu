import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClaimReferralDto {
  @ApiProperty({ example: 'REFABC123' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsOptional()
  tempUserId?: string;
}
