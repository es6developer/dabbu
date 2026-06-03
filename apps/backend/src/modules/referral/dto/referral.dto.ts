import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  refereeEmail: string;
}

export class ClaimRewardDto {
  @ApiProperty()
  @IsNotEmpty()
  referralId: string;
}
