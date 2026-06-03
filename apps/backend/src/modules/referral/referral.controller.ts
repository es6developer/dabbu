import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralService } from './referral.service';
import { CreateReferralDto, ClaimRewardDto } from './dto/referral.dto';

@ApiTags('Referral')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('code')
  @ApiOperation({ summary: 'Get or generate referral code' })
  async getCode(@CurrentUser('id') userId: string) {
    const code = await this.referralService.getOrCreateReferralCode(userId);
    return { data: { code } };
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite someone via email' })
  async createInvite(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReferralDto,
  ) {
    const referral = await this.referralService.createInvite(userId, dto.refereeEmail);
    return { data: referral };
  }

  @Get()
  @ApiOperation({ summary: 'Get all referrals sent by user' })
  async getUserReferrals(@CurrentUser('id') userId: string) {
    const referrals = await this.referralService.getUserReferrals(userId);
    return { data: referrals };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral stats (counts, pending rewards)' })
  async getStats(@CurrentUser('id') userId: string) {
    return { data: await this.referralService.getReferralStats(userId) };
  }

  @Post('claim')
  @ApiOperation({ summary: 'Claim reward for a specific referral' })
  async claimReward(
    @CurrentUser('id') userId: string,
    @Body() dto: ClaimRewardDto,
  ) {
    return this.referralService.claimReward(userId, dto.referralId);
  }

  @Post('claim-all')
  @ApiOperation({ summary: 'Claim all pending referral rewards' })
  async claimAllRewards(@CurrentUser('id') userId: string) {
    return this.referralService.claimAllRewards(userId);
  }
}
