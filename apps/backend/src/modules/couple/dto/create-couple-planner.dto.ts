import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCouplePlannerDto {
  @IsNumber()
  @IsNotEmpty()
  targetAmount: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
