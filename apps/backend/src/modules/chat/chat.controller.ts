import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../auth/interfaces';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat' })
  async createChat(
    @CurrentUser() user: JwtPayload,
    @Body() data: { title: string; type: string; participantIds: string[] },
  ) {
    return this.chatService.createChat(user.id, data.title, data.type, data.participantIds);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user chats' })
  async getUserChats(@CurrentUser() user: JwtPayload) {
    return this.chatService.getUserChats(user.id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get chat messages with pagination' })
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getChatMessages(id, user.id, Number(page) || 1, Number(limit) || 50);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark chat as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.chatService.markChatAsRead(id, user.id);
  }
}
