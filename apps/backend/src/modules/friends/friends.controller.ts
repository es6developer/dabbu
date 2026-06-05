import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';
import { AddFriendDto, RespondToFriendRequestDto } from './dto/friends.dto';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('add')
  @ApiOperation({ summary: 'Send friend request by userId' })
  async addFriend(@CurrentUser('id') userId: string, @Body() dto: AddFriendDto) {
    return { data: await this.friendsService.sendRequest(userId, dto.friendId) };
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept a pending friend request' })
  async acceptRequest(@CurrentUser('id') userId: string, @Body() dto: RespondToFriendRequestDto) {
    return { data: await this.friendsService.acceptRequest(userId, dto.requestId) };
  }

  @Post('reject')
  @ApiOperation({ summary: 'Reject a pending friend request' })
  async rejectRequest(@CurrentUser('id') userId: string, @Body() dto: RespondToFriendRequestDto) {
    return { data: await this.friendsService.rejectRequest(userId, dto.requestId) };
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a friend' })
  async removeFriend(@CurrentUser('id') userId: string, @Param('friendId') friendId: string) {
    return { data: await this.friendsService.removeFriend(userId, friendId) };
  }

  @Get()
  @ApiOperation({ summary: 'List all accepted friends' })
  async listFriends(@CurrentUser('id') userId: string) {
    return { data: await this.friendsService.listFriends(userId) };
  }

  @Get('requests')
  @ApiOperation({ summary: 'List pending friend requests' })
  async listRequests(@CurrentUser('id') userId: string) {
    return { data: await this.friendsService.listRequests(userId) };
  }
}
