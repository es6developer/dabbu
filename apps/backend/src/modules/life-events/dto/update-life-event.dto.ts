import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class UpdateLifeEventDto {
  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  isDismissed?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eventDate?: string;
}
