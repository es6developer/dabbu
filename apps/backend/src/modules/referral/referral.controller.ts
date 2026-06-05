import { Controller, Get, Post, Body, UseGuards, Ip, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralService } from './referral.service';
import {
  TrackClickDto,
  TrackInstallDto,
  RedeemReferralDto,
  ClaimRewardDto,
} from './dto/referral.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Referral')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('code')
  @ApiOperation({ summary: 'Get or generate referral code + share link' })
  async getCode(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.getOrCreateReferralCode(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all referrals sent by user' })
  async getUserReferrals(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.getUserReferrals(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('stats')
  @ApiOperation({ summary: 'Get referral stats' })
  async getStats(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.getReferralStats(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('dashboard')
  @ApiOperation({ summary: 'Get full referral dashboard' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.getDashboard(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('rewards')
  @ApiOperation({ summary: 'Get reward history' })
  async getRewardHistory(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.getRewardHistory(userId) };
  }

  @Post('click')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Track referral link click (no auth)' })
  async trackClick(@Body() dto: TrackClickDto, @Ip() ip: string) {
    return { data: await this.referralService.trackClick({ ...dto, ipAddress: ip }) };
  }

  @Post('install')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Track app install from referral (no auth)' })
  async trackInstall(@Body() dto: TrackInstallDto) {
    return { data: await this.referralService.trackInstall(dto) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('redeem')
  @ApiOperation({ summary: 'Redeem referral code on signup' })
  async redeemReferral(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemReferralDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return {
      data: await this.referralService.redeemReferral({
        ...dto,
        userId,
        ipAddress: ip,
      }),
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('claim')
  @ApiOperation({ summary: 'Claim reward for a specific referral' })
  async claimReward(@CurrentUser('id') userId: string, @Body() dto: ClaimRewardDto) {
    return { data: await this.referralService.claimReward(userId, dto.referralId) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('claim-all')
  @ApiOperation({ summary: 'Claim all pending rewards' })
  async claimAllRewards(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.claimAllRewards(userId) };
  }
}
