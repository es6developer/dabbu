import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FamilyDashboardService } from './family-dashboard.service';

@ApiTags('Family Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family')
export class FamilyDashboardController {
  constructor(private readonly service: FamilyDashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get family dashboard with aggregated data' })
  async getDashboard(@CurrentUser('id') userId: string) {
    const data = await this.service.getDashboard(userId);
    return { data };
  }

  @Get('dashboard/:familyId')
  @ApiOperation({ summary: 'Get family dashboard for specific family' })
  async getDashboardById(@CurrentUser('id') userId: string, @Param('familyId') familyId: string) {
    const data = await this.service.getDashboard(userId, familyId);
    return { data };
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Get family net worth' })
  async getNetWorth(@CurrentUser('id') userId: string) {
    return { data: await this.service.getNetWorth(userId) };
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get family financial health score' })
  async getHealthScore(@CurrentUser('id') userId: string) {
    return { data: await this.service.getHealthScore(userId) };
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get family calendar events' })
  async getCalendar(@CurrentUser('id') userId: string) {
    return { data: await this.service.getCalendar(userId) };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-generated family insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    return { data: await this.service.getInsights(userId) };
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get family goals' })
  async getGoals(@CurrentUser('id') userId: string) {
    return { data: await this.service.getGoals(userId) };
  }

  @Get('bills')
  @ApiOperation({ summary: 'Get family bills' })
  async getBills(@CurrentUser('id') userId: string) {
    return { data: await this.service.getBills(userId) };
  }
}
