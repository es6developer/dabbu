import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFriendDto {
  @ApiProperty({ description: 'User ID to add as friend' })
  @IsString()
  @IsUUID()
  friendId: string;
}

export class RespondToFriendRequestDto {
  @ApiProperty({ description: 'Friend request ID' })
  @IsString()
  @IsUUID()
  requestId: string;
}
