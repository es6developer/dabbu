import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConversionEvaluateDto {
  @ApiProperty({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  tempUserId: string;
}
