import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExternalSharingService, TempTokens } from './external-sharing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TempGroupAccessGuard } from './guards/temp-group-access.guard';
import {
  InviteExternalMemberDto,
  GoogleOAuthTempDto,
  ConvertTempUserDto,
} from './dto/external-sharing.dto';

@ApiTags('External Sharing')
@Controller('external-sharing')
export class ExternalSharingController {
  constructor(private readonly service: ExternalSharingService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite an external member via link' })
  async inviteMember(@Body() dto: InviteExternalMemberDto) {
    const result = await this.service.inviteExternalMember(dto);
    return { data: result };
  }

  @Post('auth/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth for temporary user access' })
  async googleAuth(@Body() dto: GoogleOAuthTempDto) {
    const result = await this.service.googleAuthAsTemp(dto.idToken, dto.groupId);
    return { data: result };
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Validate an invite token' })
  async validateInvite(@Param('token') token: string) {
    const result = await this.service.validateInviteToken(token);
    return { data: result };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get temporary user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    const profile = await this.service.getTempProfile(userId);
    return { data: profile };
  }

  @Post('convert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert temporary user to full active user' })
  async convertUser(@CurrentUser('id') userId: string, @Body() dto: ConvertTempUserDto) {
    await this.service.convertTempToFullUser(dto.tempUserId, userId);
    return { data: { message: 'Account merged successfully' } };
  }

  // ─── Lifecycle endpoints ──────────────────────────────────

  @Get('lifecycle/groups/:groupId/status')
  @ApiOperation({ summary: 'Check group lifecycle access status' })
  async checkGroupStatus(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId?: string,
  ) {
    const result = await this.service.getGroupLifecycleStatus(groupId, userId);
    return { data: result };
  }

  @Get('lifecycle/groups/:groupId/membership')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check member access status for current user' })
  async checkMembership(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.service.getMemberAccessStatus(groupId, userId);
    return { data: result };
  }

  @Get('lifecycle/groups/:groupId/members/:tempUserId')
  @ApiOperation({ summary: 'Check member access for a specific user' })
  async checkSpecificMember(
    @Param('groupId') groupId: string,
    @Param('tempUserId') tempUserId: string,
  ) {
    const result = await this.service.getMemberAccessStatus(groupId, tempUserId);
    return { data: result };
  }

  @Get('lifecycle/groups/:groupId/events')
  @ApiOperation({ summary: 'Get lifecycle events for a group' })
  async getLifecycleEvents(@Param('groupId') groupId: string) {
    const result = await this.service.getLifecycleEvents(groupId);
    return { data: result };
  }

  @Delete('lifecycle/groups/:groupId/members/:tempId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a temporary member from a group' })
  @ApiQuery({ name: 'reason', required: false })
  async removeTempMember(
    @Param('groupId') groupId: string,
    @Param('tempId') tempId: string,
    @Query('reason') reason: string,
  ) {
    await this.service.removeTempMember(groupId, tempId, reason);
    return { data: { success: true } };
  }

  @Patch('lifecycle/groups/:groupId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update group lifecycle status' })
  async updateGroupStatus(
    @Param('groupId') groupId: string,
    @Body('status') status: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.service.updateGroupStatus(groupId, status, userId);
    return { data: { success: true, status: result.status } };
  }
}
