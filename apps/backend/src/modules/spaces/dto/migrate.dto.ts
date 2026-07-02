import { IsString, IsOptional } from 'class-validator';

export class MigrateDto {
  @IsOptional()
  @IsString()
  target?: 'couple' | 'family' | 'all';
}
