import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
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
    return this.service.getDashboard(userId);
  }

  @Get('wealth')
  @ApiOperation({ summary: 'Get combined wealth with breakdown and trend' })
  async getWealth(@CurrentUser('id') userId: string) {
    return this.service.getWealth(userId);
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get couple health score with compatibility and emergency readiness' })
  async getHealthScore(@CurrentUser('id') userId: string) {
    return this.service.getHealthScore(userId);
  }

  @Get('life-plans')
  @ApiOperation({ summary: 'Get all life planners with progress and AI advice' })
  async getLifePlans(@CurrentUser('id') userId: string) {
    return this.service.getLifePlans(userId);
  }

  @Get('ai-review')
  @ApiOperation({ summary: 'Get AI-generated monthly review' })
  async getAIReview(@CurrentUser('id') userId: string) {
    return this.service.getAIReview(userId);
  }

  @Get('combined-wealth')
  @ApiOperation({ summary: 'Get combined wealth (legacy)' })
  async getCombinedWealth(@CurrentUser('id') userId: string) {
    return this.service.getCombinedWealth(userId);
  }

  @Get('shared-savings')
  @ApiOperation({ summary: 'Get shared savings' })
  async getSharedSavings(@CurrentUser('id') userId: string) {
    return this.service.getSharedSavings(userId);
  }

  @Get('shared-expenses')
  @ApiOperation({ summary: 'Get shared expenses' })
  async getSharedExpenses(@CurrentUser('id') userId: string) {
    return this.service.getSharedExpenses(userId);
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get couple goals' })
  async getGoals(@CurrentUser('id') userId: string) {
    return this.service.getGoals(userId);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get couple timeline' })
  async getTimeline(@CurrentUser('id') userId: string) {
    return this.service.getTimeline(userId);
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Get monthly snapshot' })
  async getSnapshot(@CurrentUser('id') userId: string) {
    return this.service.getSnapshot(userId);
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create couple goal' })
  async createGoal(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.service.createGoal(userId, body);
  }

  @Put('goals/:id')
  @ApiOperation({ summary: 'Update couple goal' })
  async updateGoal(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.updateGoal(userId, id, body);
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete couple goal' })
  async deleteGoal(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.deleteGoal(userId, id);
  }

  @Post('timeline')
  @ApiOperation({ summary: 'Add timeline event' })
  async addTimelineEvent(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.service.addTimelineEvent(userId, body);
  }

  @Put('timeline/:id')
  @ApiOperation({ summary: 'Update timeline event' })
  async updateTimelineEvent(
    @CurrentUser('id') userId: string, @Param('id') eventId: string, @Body() body: any,
  ) {
    return this.service.updateTimelineEvent(userId, eventId, body);
  }

  @Delete('timeline/:id')
  @ApiOperation({ summary: 'Delete timeline event' })
  async deleteTimelineEvent(@CurrentUser('id') userId: string, @Param('id') eventId: string) {
    return this.service.deleteTimelineEvent(userId, eventId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get couple profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.service.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update couple profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.service.updateProfile(userId, body);
  }

  @Put('planners/:id')
  @ApiOperation({ summary: 'Update planner' })
  async updatePlanner(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.updatePlanner(userId, id, body);
  }

  @Delete('planners/:id')
  @ApiOperation({ summary: 'Delete planner' })
  async deletePlanner(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.deletePlanner(userId, id);
  }
}
