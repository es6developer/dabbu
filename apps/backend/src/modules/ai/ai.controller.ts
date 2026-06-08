import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiInsightsQueryDto } from './dto/ai-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  checkHealth() {
    return { enabled: this.aiService.isEnabled() };
  }

  @Get('insights')
  async getInsights(@CurrentUser('id') userId: string, @Query() query: AiInsightsQueryDto) {
    const section = query.section || 'dashboard';
    const context = { userId, section, narrative: query.narrative || undefined };
    const insights = await this.aiService.generateInsights(section, context);
    return { data: insights };
  }

  @Post('narrative')
  async getNarrative(
    @CurrentUser('id') userId: string,
    @Body() body: { section: string; context: Record<string, any> },
  ) {
    const narrative = await this.aiService.generateNarrative(body.section || 'dashboard', {
      ...body.context,
      userId,
    });
    return { data: narrative };
  }

  @Get('groups/:groupId/insights')
  async getGroupInsights(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const narrative = await this.aiService.generateGroupNarrative(groupId, userId);
    return { data: narrative };
  }

  @Get('groups/:groupId/split-insights')
  async getSplitInsights(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const narrative = await this.aiService.generateSplitNarrative(groupId, userId);
    return { data: narrative };
  }
}
