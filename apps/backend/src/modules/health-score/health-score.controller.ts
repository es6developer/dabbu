import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HealthScoreService } from './health-score.service';
import { FeatureGuard } from '../premium/guards/feature.guard';
import { RequiresPremium } from '../premium/guards/requires-premium.decorator';

@ApiTags('Health Score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('health-score')
export class HealthScoreController {
  constructor(private readonly service: HealthScoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get health score for an entity' })
  @ApiQuery({ name: 'entityType', enum: ['USER', 'SPACE'] })
  @ApiQuery({ name: 'entityId', type: String })
  @RequiresPremium('health_score')
  async getScore(
    @Query('entityType') entityType: 'USER' | 'SPACE',
    @Query('entityId') entityId: string,
  ) {
    return { data: await this.service.getScore(entityType, entityId) };
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Recalculate own health score' })
  @RequiresPremium('health_score')
  async recalculate(@CurrentUser('id') userId: string) {
    return { data: await this.service.recalculate(userId) };
  }
}
