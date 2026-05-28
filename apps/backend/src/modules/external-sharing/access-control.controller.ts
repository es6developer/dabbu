import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccessControlService } from './access-control.service';
import { RemoveMemberDto, AddRestrictionDto, RevokeInviteDto } from './dto/lifecycle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('External Sharing - Access Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external-sharing/access')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Delete('groups/:groupId/members/temp/:tempId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove temp member from group' })
  async removeTempMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('tempId') tempId: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.accessControlService.removeTempMember(groupId, tempId, userId, dto.reason);
  }

  @Delete('groups/:groupId/members/full/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove full user member from group' })
  async removeFullMember(
    @CurrentUser('id') currentUserId: string,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.accessControlService.removeFullMember(groupId, targetUserId, currentUserId, dto.reason);
  }

  @Post('groups/:groupId/restrictions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add access restriction to group' })
  async addRestriction(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: AddRestrictionDto,
  ) {
    const result = await this.accessControlService.addAccessRestriction(groupId, userId, dto);
    return { data: result };
  }

  @Get('groups/:groupId/restrictions')
  @ApiOperation({ summary: 'List active restrictions for group' })
  async listRestrictions(@Param('groupId') groupId: string) {
    const result = await this.accessControlService.listRestrictions(groupId);
    return { data: result };
  }

  @Delete('groups/:groupId/restrictions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an access restriction' })
  async removeRestriction(
    @Param('groupId') groupId: string,
    @Param('id') restrictionId: string,
  ) {
    return this.accessControlService.removeRestriction(groupId, restrictionId);
  }

  @Post('invites/:token/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke specific invite link' })
  async revokeInvite(
    @Param('token') token: string,
    @Body() dto: RevokeInviteDto,
  ) {
    return this.accessControlService.revokeInvite(token, dto.reason);
  }

  @Get('groups/:groupId/members/removal-logs')
  @ApiOperation({ summary: 'Get removal history for group' })
  async getRemovalLogs(@Param('groupId') groupId: string) {
    const result = await this.accessControlService.getRemovalLogs(groupId);
    return { data: result };
  }
}
