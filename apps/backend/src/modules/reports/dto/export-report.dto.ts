import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExportReportDto {
  @ApiProperty({ example: 'monthly' })
  @IsString()
  @IsIn(['monthly', 'annual', 'category', 'custom'])
  type: string;

  @ApiProperty({ example: 'pdf' })
  @IsString()
  @IsIn(['pdf', 'excel', 'csv'])
  format: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;
}
