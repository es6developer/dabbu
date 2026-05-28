import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PremiumTrialService } from './premium-trial.service';
import { StartTrialDto } from './dto/start-trial.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ClaimReferralDto } from './dto/claim-referral.dto';

@ApiTags('External Sharing - Premium & Referrals')
@Controller('external-sharing')
export class PremiumTrialController {
  constructor(private readonly premiumTrialService: PremiumTrialService) {}

  @Post('trials/start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start premium trial' })
  async startTrial(@Body() dto: StartTrialDto) {
    const result = await this.premiumTrialService.startTrial(dto);
    return { data: result };
  }

  @Get('trials/active')
  @ApiOperation({ summary: 'Get active trial' })
  async getActiveTrial(@Body('tempUserId') tempUserId: string) {
    const result = await this.premiumTrialService.getActiveTrial(tempUserId);
    return { data: result };
  }

  @Post('trials/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel trial' })
  async cancelTrial(@Param('id') id: string) {
    const result = await this.premiumTrialService.cancelTrial(id);
    return { data: result };
  }

  @Post('referrals/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create referral link' })
  async createReferral(@Body() dto: CreateReferralDto) {
    const result = await this.premiumTrialService.createReferralLink(dto);
    return { data: result };
  }

  @Get('referrals/:code')
  @ApiOperation({ summary: 'Resolve referral code' })
  async resolveReferral(@Param('code') code: string) {
    const result = await this.premiumTrialService.resolveReferralCode(code);
    return { data: result };
  }

  @Post('referrals/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim referral reward' })
  async claimReferral(@Body() dto: ClaimReferralDto) {
    const result = await this.premiumTrialService.claimReferral(dto);
    return { data: result };
  }
}
