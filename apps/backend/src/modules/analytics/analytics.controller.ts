import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AnalyticsQueryDto,
  DashboardQueryDto,
  SpendingTrendQueryDto,
  CategoryBreakdownQueryDto,
  CashFlowQueryDto,
  NetWorthQueryDto,
  BudgetAnalyticsQueryDto,
} from './dto/analytics-query.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get dashboard overview data' })
  async getDashboard(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardQueryDto,
  ) {
    const data = await this.analyticsService.getDashboard(userId, query);
    return { data };
  }

  @Get('spending-trend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get spending trend over time' })
  async getSpendingTrend(
    @CurrentUser('id') userId: string,
    @Query() query: SpendingTrendQueryDto,
  ) {
    const data = await this.analyticsService.getSpendingTrend(userId, query);
    return { data };
  }

  @Get('category-breakdown')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get category breakdown with percentages' })
  async getCategoryBreakdown(
    @CurrentUser('id') userId: string,
    @Query() query: CategoryBreakdownQueryDto,
  ) {
    const data = await this.analyticsService.getCategoryBreakdown(userId, query);
    return { data };
  }

  @Get('cash-flow')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get income vs expense over time' })
  async getCashFlow(
    @CurrentUser('id') userId: string,
    @Query() query: CashFlowQueryDto,
  ) {
    const data = await this.analyticsService.getCashFlow(userId, query);
    return { data };
  }

  @Get('net-worth')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get net worth over time' })
  async getNetWorth(
    @CurrentUser('id') userId: string,
    @Query() query: NetWorthQueryDto,
  ) {
    const data = await this.analyticsService.getNetWorth(userId, query);
    return { data };
  }

  @Get('budgets')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get budget performance analytics' })
  async getBudgetAnalytics(
    @CurrentUser('id') userId: string,
    @Query() query: BudgetAnalyticsQueryDto,
  ) {
    const data = await this.analyticsService.getBudgetAnalytics(userId, query);
    return { data };
  }

  @Get('insights')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get smart spending insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    const data = await this.analyticsService.getInsights(userId);
    return { data };
  }

  // ─── Event Tracking ─────────────────────────────────────

  @Post('track')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Track a user event' })
  async trackEvent(
    @CurrentUser('id') userId: string,
    @Body() body: { event: string; category?: string; label?: string; properties?: any; sessionId?: string },
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'] || undefined;
    await this.analyticsService.track(userId, body, ip, userAgent);
    return { success: true };
  }

  @Post('track/batch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Track multiple events at once' })
  async trackBatch(
    @CurrentUser('id') userId: string,
    @Body() body: { events: { event: string; category?: string; label?: string; properties?: any; sessionId?: string }[] },
  ) {
    await this.analyticsService.trackBatch(userId, body.events);
    return { success: true };
  }

  // ─── Product Analytics (admin-level) ────────────────────

  @Get('admin/active-users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active user count and rate' })
  async getActiveUsers(@Query('days') days?: string) {
    return { data: await this.analyticsService.getActiveUsers(days ? parseInt(days) : 30) };
  }

  @Get('admin/retention')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get cohort retention rates' })
  async getRetention(@Query('days') days?: string) {
    return { data: await this.analyticsService.getRetention(days ? parseInt(days) : 90) };
  }

  @Get('admin/feature-usage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get feature usage counts' })
  async getFeatureUsage(@Query('days') days?: string) {
    return { data: await this.analyticsService.getFeatureUsage(days ? parseInt(days) : 30) };
  }

  @Get('admin/premium-conversion')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get premium conversion metrics' })
  async getPremiumConversion() {
    return { data: await this.analyticsService.getPremiumConversion() };
  }

  @Get('admin/onboarding')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get onboarding completion metrics' })
  async getOnboardingCompletion() {
    return { data: await this.analyticsService.getOnboardingCompletion() };
  }

  @Get('admin/events')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get event summary for period' })
  async getEventSummary(@Query('days') days?: string) {
    return { data: await this.analyticsService.getEventSummary(days ? parseInt(days) : 7) };
  }
}
