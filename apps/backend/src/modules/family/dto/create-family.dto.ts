import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFamilyDto {
  @ApiProperty({ example: 'The Smiths' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  maxMembers?: number;
}
