import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['aadhaar', 'pan', 'passport', 'driving_license', 'insurance', 'vehicle_rc', 'warranty', 'medical'] })
  @IsString()
  @IsIn(['aadhaar', 'pan', 'passport', 'driving_license', 'insurance', 'vehicle_rc', 'warranty', 'medical'])
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
