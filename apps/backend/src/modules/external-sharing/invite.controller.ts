import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InviteService } from './invite.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinInviteDto } from './dto/join-invite.dto';

@ApiTags('External Sharing - Invites')
@Controller('external-sharing/invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create invite link for a group' })
  async createInvite(
    @Body('createdByUserId') createdByUserId: string | null,
    @Body('createdByTempUserId') createdByTempUserId: string | null,
    @Body() dto: CreateInviteDto,
  ) {
    const result = await this.inviteService.createInvite(createdByUserId, createdByTempUserId, dto);
    return { data: result };
  }

  @Get(':token')
  @ApiOperation({ summary: 'Resolve invite (get group info, permissions)' })
  async resolveInvite(@Param('token') token: string) {
    const result = await this.inviteService.resolveInvite(token);
    return { data: result };
  }

  @Post(':token/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join group via invite (temp user)' })
  async joinGroup(
    @Param('token') token: string,
    @Body() dto: JoinInviteDto,
  ) {
    if (!dto.tempUserId) {
      throw new BadRequestException('tempUserId is required');
    }
    const result = await this.inviteService.joinGroup(token, dto.tempUserId, dto.nickname);
    return { data: result };
  }

  @Patch(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update invite settings' })
  async updateInvite(
    @Param('token') token: string,
    @Body() updates: any,
  ) {
    const result = await this.inviteService.updateInvite(token, updates);
    return { data: result };
  }

  @Delete(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke invite' })
  async revokeInvite(@Param('token') token: string) {
    const result = await this.inviteService.revokeInvite(token);
    return { data: result };
  }

  @Get(':token/qr')
  @ApiOperation({ summary: 'Get QR code data for invite' })
  async getQrCodeData(@Param('token') token: string) {
    const result = await this.inviteService.getQrCodeData(token);
    return { data: result };
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate invite token' })
  async validateToken(@Body('token') token: string) {
    const result = await this.inviteService.validateToken(token);
    return { data: result };
  }
}
