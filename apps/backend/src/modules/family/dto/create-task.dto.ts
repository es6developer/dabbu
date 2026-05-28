import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Pay electricity bill' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Due by Friday' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;
}
