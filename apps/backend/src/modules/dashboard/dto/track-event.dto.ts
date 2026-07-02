import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @IsNotEmpty()
  feature: string;

  @IsOptional()
  @IsString()
  label?: string;
}
