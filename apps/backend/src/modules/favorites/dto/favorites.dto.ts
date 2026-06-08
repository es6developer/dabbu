import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFavoriteDto {
  @ApiProperty({ description: 'User ID to add as favorite' })
  @IsString()
  @IsUUID()
  contactUserId: string;
}
