import { Controller, Get, Param, Query, UseGuards, Body, Patch } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get family dashboard' })
  async getDashboard(@CurrentUser('id') userId: string, @Query('familyId') familyId?: string) {
    return this.service.getDashboard(userId, familyId);
  }

  @Get('wealth')
  @ApiOperation({ summary: 'Get family wealth with breakdown and trend' })
  async getWealth(@Query('familyId') familyId: string) {
    return this.service.getWealth(familyId);
  }

  @Get('members')
  @ApiOperation({ summary: 'Get family members with roles and contribution history' })
  async getMembers(@Query('familyId') familyId: string) {
    return this.service.getMembers(familyId);
  }

  @Get('investments')
  @ApiOperation({ summary: 'Get family investments portfolio' })
  async getInvestments(@Query('familyId') familyId: string) {
    return this.service.getInvestments(familyId);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get family documents' })
  async getDocuments(@Query('familyId') familyId: string) {
    return this.service.getDocuments(familyId);
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get family health score with emergency readiness' })
  async getHealthScore(@Query('familyId') familyId: string) {
    return this.service.getHealthScore(familyId);
  }

  @Get('ai-review')
  @ApiOperation({ summary: 'Get AI-generated monthly family review' })
  async getAIReview(@Query('familyId') familyId: string) {
    return this.service.getAIReview(familyId);
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Get family net worth' })
  async getNetWorth(@Query('familyId') familyId: string) {
    return this.service.getNetWorth(familyId);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get family calendar events' })
  async getCalendar(@Query('familyId') familyId: string) {
    return this.service.getCalendar(familyId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get family insights' })
  async getInsights(@Query('familyId') familyId: string) {
    return this.service.getInsights(familyId);
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get family goals' })
  async getGoals(@Query('familyId') familyId: string) {
    return this.service.getGoals(familyId);
  }

  @Get('bills')
  @ApiOperation({ summary: 'Get family bills' })
  async getBills(@Query('familyId') familyId: string) {
    return this.service.getBills(familyId);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get family tasks' })
  async getTasks(@Query('familyId') familyId: string) {
    return this.service.getTasks(familyId);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateTaskStatus(id, body.status);
  }
}
