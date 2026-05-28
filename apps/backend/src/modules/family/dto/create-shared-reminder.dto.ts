import { IsString, IsOptional, IsBoolean, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSharedReminderDto {
  @ApiProperty({ example: 'Family dinner' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2024-12-25T18:00:00Z' })
  @IsString()
  remindAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  frequency?: string;
}
