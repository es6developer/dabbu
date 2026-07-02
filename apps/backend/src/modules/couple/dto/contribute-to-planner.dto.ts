import { IsNumber, IsNotEmpty } from 'class-validator';

export class ContributeToPlannerDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
