import { IsString, IsOptional } from 'class-validator';

export class AddMemberContactDto {
  @IsString()
  familyId: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  relationship?: string;
}
