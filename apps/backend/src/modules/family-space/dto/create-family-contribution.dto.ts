import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateFamilyContributionDto {
  @IsString() userId: string;
  @IsNumber() @Min(0) amount: number;
  @IsString() period: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFamilyContributionDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() notes?: string;
}
