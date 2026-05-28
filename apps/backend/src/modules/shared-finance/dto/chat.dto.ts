import {
  IsString, IsOptional, IsEnum, IsUUID, IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  EXPENSE = 'expense',
  SETTLEMENT = 'settlement',
  SYSTEM = 'system',
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class ChatPaginationQueryDto {
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  limit?: string;
}
