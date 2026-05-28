import {
  Controller, Get, Param, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import {
  GroupInsightsQueryDto, TripInsightsQueryDto, CoupleInsightsQueryDto,
} from './dto/insights.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get group insights with AI-powered analysis' })
  async getGroupInsights(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query() query: GroupInsightsQueryDto,
  ) {
    return this.insightsService.getGroupInsights(groupId, user.id, query.fromDate, query.toDate);
  }

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Get trip insights with AI-powered analysis' })
  async getTripInsights(
    @Param('tripId') tripId: string,
    @CurrentUser() user: any,
    @Query() query: TripInsightsQueryDto,
  ) {
    return this.insightsService.getTripInsights(tripId, user.id);
  }

  @Get('couple/:groupId')
  @ApiOperation({ summary: 'Get couple insights with AI-powered analysis' })
  async getCoupleInsights(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query() query: CoupleInsightsQueryDto,
  ) {
    return this.insightsService.getCoupleInsights(groupId, user.id, query.fromDate, query.toDate);
  }
}
