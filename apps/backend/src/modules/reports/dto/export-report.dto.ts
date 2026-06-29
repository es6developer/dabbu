import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportReportDto {
  @IsString()
  type: string;

  @IsString()
  format: string;

  @IsOptional()
  @IsString()
  @IsIn(['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'])
  lens?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
