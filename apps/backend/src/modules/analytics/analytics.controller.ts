import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview data' })
  async getDashboard(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardQueryDto,
  ) {
    const data = await this.analyticsService.getDashboard(userId, query);
    return { data };
  }

  @Get('spending-trend')
  @ApiOperation({ summary: 'Get spending trend over time' })
  async getSpendingTrend(
    @CurrentUser('id') userId: string,
    @Query() query: SpendingTrendQueryDto,
  ) {
    const data = await this.analyticsService.getSpendingTrend(userId, query);
    return { data };
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: 'Get category breakdown with percentages' })
  async getCategoryBreakdown(
    @CurrentUser('id') userId: string,
    @Query() query: CategoryBreakdownQueryDto,
  ) {
    const data = await this.analyticsService.getCategoryBreakdown(userId, query);
    return { data };
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Get income vs expense over time' })
  async getCashFlow(
    @CurrentUser('id') userId: string,
    @Query() query: CashFlowQueryDto,
  ) {
    const data = await this.analyticsService.getCashFlow(userId, query);
    return { data };
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Get net worth over time' })
  async getNetWorth(
    @CurrentUser('id') userId: string,
    @Query() query: NetWorthQueryDto,
  ) {
    const data = await this.analyticsService.getNetWorth(userId, query);
    return { data };
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Get budget performance analytics' })
  async getBudgetAnalytics(
    @CurrentUser('id') userId: string,
    @Query() query: BudgetAnalyticsQueryDto,
  ) {
    const data = await this.analyticsService.getBudgetAnalytics(userId, query);
    return { data };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get smart spending insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    const data = await this.analyticsService.getInsights(userId);
    return { data };
  }
}
