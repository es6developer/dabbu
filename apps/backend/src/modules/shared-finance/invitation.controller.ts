import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto, AcceptInvitationDto, RejectInvitationDto } from './invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shared Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('groups/:groupId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an invitation to join a group by email' })
  async createInvitation(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(groupId, userId, dto.email);
  }

  @Post('invitations/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a group invitation' })
  async acceptInvitation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() _dto: AcceptInvitationDto,
  ) {
    return this.invitationService.acceptInvitation(userId, id);
  }

  @Post('invitations/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a group invitation' })
  async rejectInvitation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() _dto: RejectInvitationDto,
  ) {
    return this.invitationService.rejectInvitation(userId, id);
  }

  @Get('invitations/pending')
  @ApiOperation({ summary: 'Get all pending invitations for the current user' })
  async getPendingInvitations(@CurrentUser() user: any) {
    return this.invitationService.getPendingInvitations(user.email);
  }

  @Delete('groups/:groupId/invitations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending invitation (admin only)' })
  async cancelInvitation(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    return this.invitationService.cancelInvitation(groupId, userId, id);
  }
}
