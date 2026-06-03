import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['aadhaar', 'pan', 'passport', 'driving_license', 'insurance', 'vehicle_rc', 'warranty', 'medical'])
  category?: string;
}
