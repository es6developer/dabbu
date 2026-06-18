import { Controller, Get, Post, Patch, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { RetentionService } from './retention.service';
import { ReEngagementService } from './re-engagement.service';

@ApiTags('Retention')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RetentionController {
  constructor(
    private readonly retentionService: RetentionService,
    private readonly reEngagementService: ReEngagementService,
  ) {}

  @Get('retention/streaks')
  @ApiOperation({ summary: 'Get all user streaks' })
  async getStreaks(@CurrentUser('id') userId: string) {
    return this.retentionService.getUserStreaks(userId);
  }

  @Post('retention/streaks/track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a streak type' })
  async trackStreak(
    @CurrentUser('id') userId: string,
    @Body('type') type: string,
  ) {
    return this.retentionService.trackStreak(userId, type);
  }

  @Get('retention/yearly-summary/:year')
  @ApiOperation({ summary: 'Get yearly financial summary' })
  async getYearlySummary(
    @CurrentUser('id') userId: string,
    @Param('year') year: string,
  ) {
    return this.retentionService.getYearlySummary(userId, parseInt(year));
  }

  @Post('retention/yearly-summary/:year/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate yearly financial summary' })
  async generateYearlySummary(
    @CurrentUser('id') userId: string,
    @Param('year') year: string,
  ) {
    return this.retentionService.generateYearlySummary(userId, parseInt(year));
  }

  @Get('retention/engagement')
  @ApiOperation({ summary: 'Get user engagement status' })
  async getEngagement(@CurrentUser('id') userId: string) {
    return this.retentionService.getEngagement(userId);
  }

  @Post('retention/track-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track user action for engagement' })
  async trackAction(@CurrentUser('id') userId: string) {
    return this.retentionService.trackAction(userId);
  }

  @Post('retention/re-engagement/opt-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Opt out of re-engagement notifications' })
  async optOut(@CurrentUser('id') userId: string) {
    return this.reEngagementService.optOutReEngagement(userId);
  }

  @Post('retention/re-engagement/opt-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Opt in to re-engagement notifications' })
  async optIn(@CurrentUser('id') userId: string) {
    return this.reEngagementService.optInReEngagement(userId);
  }
}
