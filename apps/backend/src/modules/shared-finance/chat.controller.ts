import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, ChatPaginationQueryDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/groups/:groupId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get chat messages (paginated)' })
  async getMessages(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query() query: ChatPaginationQueryDto,
  ) {
    return this.chatService.getMessages(groupId, user.id, {
      before: query.before,
      after: query.after,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send message' })
  async sendMessage(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(groupId, user.id, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markAsRead(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.markAsRead(groupId, id, user.id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread count' })
  async getUnreadCount(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getUnreadCount(groupId, user.id);
  }
}
