import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { PersonalDashboardService } from './personal-dashboard.service';
import { CoupleDashboardService } from './couple-dashboard.service';
import { FamilyDashboardService } from './family-dashboard.service';

class ReorderWidgetsDto {
  @IsString({ each: true }) widgetTypes: string[];
}

class ToggleWidgetDto {
  @IsString() @IsNotEmpty() widgetType: string;
  @IsOptional() @IsString() scope?: string;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly personalService: PersonalDashboardService,
    private readonly coupleService: CoupleDashboardService,
    private readonly familyService: FamilyDashboardService,
  ) {}

  private widgetTypeToKey(type: string, scope: string): string | null {
    const personal: Record<string, string> = {
      GREETING: 'greeting',
      NET_WORTH: 'netWorth',
      THIS_MONTH: 'monthlySnapshot',
      HEALTH_SCORE: 'healthScore',
      AI_INSIGHTS: 'aiInsight',
      GOALS: 'goals',
      UPCOMING_BILLS: 'upcomingBills',
      RECENT_TRANSACTIONS: 'recentTransactions',
      BUDGETS: 'budgetsOverview',
      QUICK_ACTIONS: 'quickActions',
    };
    const couple: Record<string, string> = {
      COUPLE_WEALTH: 'combinedWealth',
      COUPLE_GOALS: 'coupleGoals',
      COUPLE_TIMELINE: 'coupleTimeline',
      THIS_MONTH: 'coupleSnapshot',
      HEALTH_SCORE: 'coupleHealth',
      AI_INSIGHTS: 'coupleAI',
      UPCOMING_BILLS: 'upcomingBills',
      RECENT_TRANSACTIONS: 'recentTransactions',
      QUICK_ACTIONS: 'quickActions',
    };
    const family: Record<string, string> = {
      FAMILY_HERO: 'familyHero',
      FAMILY_WEALTH: 'familyWealth',
      FAMILY_SNAPSHOT: 'familySnapshot',
      FAMILY_GOALS: 'familyGoals',
      FAMILY_BILLS: 'familyBills',
      FAMILY_CONTRIBUTIONS: 'familyContributions',
      FAMILY_EXPENSES: 'familyExpenses',
      FAMILY_INSIGHTS: 'familyInsights',
      FAMILY_TIMELINE: 'familyTimeline',
      FAMILY_HEALTH: 'familyHealth',
      RECENT_TRANSACTIONS: 'recentTransactions',
      AI_INSIGHTS: 'familyInsights',
      QUICK_ACTIONS: 'quickActions',
    };
    if (scope === 'couple') return couple[type] || null;
    if (scope === 'family') return family[type] || null;
    return personal[type] || null;
  }

  @Get()
  @ApiOperation({ summary: 'Get unified dashboard with auto-detected mode, or aggregated by lens' })
  @ApiQuery({ name: 'lens', required: false, enum: ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'] })
  async get(@CurrentUser('id') userId: string, @Query('lens') lens?: string) {
    if (lens) {
      const data = await this.dashboardService.getAggregated(userId, lens);
      return { data };
    }
    return this.dashboardService.getDashboard(userId);
  }

  @Get('personal')
  @ApiOperation({ summary: 'Get personal dashboard data' })
  async getPersonal(@CurrentUser('id') userId: string) {
    const widgets = await this.personalService.getWidgets(userId);
    const flat: Record<string, any> = {};
    for (const w of widgets) {
      const key = this.widgetTypeToKey(w.type, 'personal');
      if (key && w.data) flat[key] = w.data;
    }
    return { mode: 'personal', ...flat };
  }

  @Get('couple')
  @ApiOperation({ summary: 'Get couple dashboard data' })
  async getCouple(@CurrentUser('id') userId: string) {
    const widgets = await this.coupleService.getWidgets(userId);
    const flat: Record<string, any> = {};
    for (const w of widgets) {
      const key = this.widgetTypeToKey(w.type, 'couple');
      if (key && w.data) flat[key] = w.data;
    }
    return { mode: 'couple', ...flat };
  }

  @Get('family')
  @ApiOperation({ summary: 'Get family dashboard data' })
  async getFamily(@CurrentUser('id') userId: string, @Query('familyId') familyId?: string) {
    const widgets = await this.familyService.getWidgets(userId, familyId);
    const flat: Record<string, any> = {};
    for (const w of widgets) {
      const key = this.widgetTypeToKey(w.type, 'family');
      if (key && w.data) flat[key] = w.data;
    }
    return { mode: 'family', ...flat };
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Get user widget configuration' })
  async getWidgets(
    @CurrentUser('id') userId: string,
    @Query('scope') scope = 'personal',
  ) {
    return this.dashboardService.getWidgetConfigs(userId, scope);
  }

  @Post('widgets/reorder')
  @ApiOperation({ summary: 'Reorder dashboard widgets' })
  async reorderWidgets(
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderWidgetsDto,
    @Query('scope') scope = 'personal',
  ) {
    await this.dashboardService.reorderWidgets(userId, dto.widgetTypes, scope);
    return { success: true };
  }

  @Post('widgets/toggle')
  @ApiOperation({ summary: 'Toggle a widget on/off' })
  async toggleWidget(
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleWidgetDto,
  ) {
    await this.dashboardService.toggleWidget(userId, dto.widgetType, dto.scope || 'personal');
    return { success: true };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Force refresh dashboard cache' })
  async refresh(@CurrentUser('id') userId: string) {
    await this.dashboardService.invalidateCache(userId);
    return { success: true };
  }

  @Post('track')
  @ApiOperation({ summary: 'Track widget or feature usage' })
  async trackFeature(@CurrentUser('id') userId: string, @Body() body: { feature: string; label?: string }) {
    await this.dashboardService.trackFeature(userId, body.feature, body.label);
    return { success: true };
  }
}
