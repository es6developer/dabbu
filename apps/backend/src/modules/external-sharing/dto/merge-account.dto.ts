import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeAccountDto {
  @ApiProperty({ example: 'temp-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  tempUserId: string;

  @ApiProperty({ example: 'full-user-uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  fullUserId: string;
}
