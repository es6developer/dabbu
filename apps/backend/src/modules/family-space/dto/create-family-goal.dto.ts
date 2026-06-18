import { IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateFamilyGoalDto {
  @IsString() @MaxLength(255) name: string;
  @IsNumber() @Min(0) targetAmount: number;
  @IsOptional() @IsNumber() @Min(0) savedAmount?: number;
  @IsOptional() @IsDateString() deadline?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFamilyGoalDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsNumber() @Min(0) targetAmount?: number;
  @IsOptional() @IsNumber() @Min(0) savedAmount?: number;
  @IsOptional() @IsDateString() deadline?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}
