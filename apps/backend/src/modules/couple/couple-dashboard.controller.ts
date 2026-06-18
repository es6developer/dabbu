import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CoupleDashboardService } from './couple-dashboard.service';

@ApiTags('Couple Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleDashboardController {
  constructor(private readonly service: CoupleDashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get couple dashboard' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return { data: await this.service.getDashboard(userId) };
  }

  @Get('combined-wealth')
  @ApiOperation({ summary: 'Get combined wealth' })
  async getCombinedWealth(@CurrentUser('id') userId: string) {
    return { data: await this.service.getCombinedWealth(userId) };
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Get monthly snapshot' })
  async getSnapshot(@CurrentUser('id') userId: string) {
    return { data: await this.service.getSnapshot(userId) };
  }

  @Get('shared-savings')
  @ApiOperation({ summary: 'Get shared savings' })
  async getSharedSavings(@CurrentUser('id') userId: string) {
    return { data: await this.service.getSharedSavings(userId) };
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get couple health score' })
  async getHealthScore(@CurrentUser('id') userId: string) {
    return { data: await this.service.getHealthScore(userId) };
  }

  @Get('shared-expenses')
  @ApiOperation({ summary: 'Get shared expenses' })
  async getSharedExpenses(@CurrentUser('id') userId: string) {
    return { data: await this.service.getSharedExpenses(userId) };
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get couple goals' })
  async getGoals(@CurrentUser('id') userId: string) {
    return { data: await this.service.getGoals(userId) };
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get couple timeline' })
  async getTimeline(@CurrentUser('id') userId: string) {
    return { data: await this.service.getTimeline(userId) };
  }
}
