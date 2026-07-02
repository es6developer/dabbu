import { IsNotEmpty } from 'class-validator';

export class RestoreDataDto {
  @IsNotEmpty()
  data: any;
}
