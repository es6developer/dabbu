import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DabbuScoreService } from './dabbu-score.service';

@ApiTags('Dabbu Score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dabbu-score')
export class DabbuScoreController {
  constructor(private readonly service: DabbuScoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get dabbu score for an entity' })
  @ApiQuery({ name: 'entityType', enum: ['USER', 'SPACE'] })
  @ApiQuery({ name: 'entityId', type: String })
  async getScore(
    @Query('entityType') entityType: 'USER' | 'SPACE',
    @Query('entityId') entityId: string,
  ) {
    return { data: await this.service.getScore(entityType, entityId) };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get score history for charts' })
  async getHistory(@CurrentUser('id') userId: string) {
    return { data: await this.service.getHistory(userId) };
  }

  @Get('components')
  @ApiOperation({ summary: 'Get component breakdown' })
  @ApiQuery({ name: 'entityType', enum: ['USER', 'SPACE'] })
  @ApiQuery({ name: 'entityId', type: String })
  async getComponents(
    @Query('entityType') entityType: 'USER' | 'SPACE',
    @Query('entityId') entityId: string,
  ) {
    return { data: await this.service.getComponents(entityType, entityId) };
  }

  @Get('improvements')
  @ApiOperation({ summary: 'Get improvement suggestions' })
  async getImprovements(@CurrentUser('id') userId: string) {
    return { data: await this.service.getImprovements(userId) };
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Recalculate own dabbu score' })
  async recalculate(@CurrentUser('id') userId: string) {
    return { data: await this.service.recalculate(userId) };
  }
}
