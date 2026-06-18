import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateFamilyTaskDto {
  @IsString() @MaxLength(255) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateFamilyTaskDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
