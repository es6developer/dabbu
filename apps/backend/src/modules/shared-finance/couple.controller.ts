import {
  Controller, Get, Post, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoupleService } from './couple.service';
import { CoupleProfileDto, UpdateSalariesDto } from './dto/expenses.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Couple')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/couple')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update couple profile' })
  async upsertProfile(
    @CurrentUser() user: any,
    @Body() dto: CoupleProfileDto,
  ) {
    return this.coupleService.upsertProfile(user.id, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get couple profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.coupleService.getProfile(user.id);
  }

  @Post('salaries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update salaries' })
  async updateSalaries(
    @CurrentUser() user: any,
    @Body() dto: UpdateSalariesDto,
  ) {
    return this.coupleService.updateSalaries(user.id, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Couple dashboard with comparison' })
  async getDashboard(@CurrentUser() user: any) {
    return this.coupleService.getDashboard(user.id);
  }

  @Get('monthly-overview')
  @ApiOperation({ summary: 'Monthly spending breakdown' })
  async getMonthlyOverview(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.coupleService.getMonthlyOverview(
      user.id,
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('insights')
  @ApiOperation({ summary: 'AI fairness insights' })
  async getInsights(@CurrentUser() user: any) {
    return this.coupleService.getInsights(user.id);
  }
}
