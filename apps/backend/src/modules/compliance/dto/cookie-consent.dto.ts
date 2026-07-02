import { IsString, IsArray, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class CookieConsentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['accepted', 'rejected'])
  consent: 'accepted' | 'rejected';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
