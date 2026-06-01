import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExternalSharingService } from './external-sharing.service';
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
}
