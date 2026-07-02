import { Controller, Get, Post, Body, Query, UseGuards, Req, Res, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FeatureGuard } from '../premium/guards/feature.guard';
import { RequiresPremium } from '../premium/guards/requires-premium.decorator';
import {
  AnalyticsQueryDto,
  DashboardQueryDto,
  SpendingTrendQueryDto,
  CategoryBreakdownQueryDto,
  CashFlowQueryDto,
  NetWorthQueryDto,
  BudgetAnalyticsQueryDto,
  ReportQueryDto,
  ExportQueryDto,
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('net_worth')
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
  @ApiOperation({ summary: 'Get smart spending insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    const data = await this.analyticsService.getInsights(userId);
    return { data };
  }

  // ─── Report Endpoints ────────────────────────────────────

  @Get('reports/expense')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
  @ApiOperation({ summary: 'Get expense report' })
  async getExpenseReport(@CurrentUser('id') userId: string, @Query() query: ReportQueryDto) {
    return { data: await this.analyticsService.getExpenseReport(userId, query) };
  }

  @Get('reports/income')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
  @ApiOperation({ summary: 'Get income report' })
  async getIncomeReport(@CurrentUser('id') userId: string, @Query() query: ReportQueryDto) {
    return { data: await this.analyticsService.getIncomeReport(userId, query) };
  }

  @Get('reports/savings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
  @ApiOperation({ summary: 'Get savings report' })
  async getSavingsReport(@CurrentUser('id') userId: string, @Query() query: ReportQueryDto) {
    return { data: await this.analyticsService.getSavingsReport(userId, query) };
  }

  @Get('reports/member')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
  @ApiOperation({ summary: 'Get member report' })
  async getMemberReport(@CurrentUser('id') userId: string, @Query() query: ReportQueryDto) {
    return { data: await this.analyticsService.getMemberReport(userId, query) };
  }

  @Get('reports/group/:groupId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_reports')
  @ApiOperation({ summary: 'Get group report' })
  async getGroupReport(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    return { data: await this.analyticsService.getGroupReport(userId, groupId) };
  }

  // ─── Export Endpoints ────────────────────────────────────

  @Post('export/pdf')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('export_pdf')
  @ApiOperation({ summary: 'Export report as PDF' })
  async exportPdf(
    @CurrentUser('id') userId: string,
    @Body() body: ExportQueryDto & { reportType: string },
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.exportPdf(userId, body, body.reportType);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dabbu-${body.reportType}-report.pdf"`);
    res.send(buffer);
  }

  @Post('export/excel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('export_excel')
  @ApiOperation({ summary: 'Export report as Excel' })
  async exportExcel(
    @CurrentUser('id') userId: string,
    @Body() body: ExportQueryDto & { reportType: string },
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.exportExcel(userId, body, body.reportType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="dabbu-${body.reportType}-report.xlsx"`);
    res.send(buffer);
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
