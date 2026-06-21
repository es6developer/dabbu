import { Controller, Get, Put, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, ApiResponse } from '@nestjs/swagger';
import { LensType } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LensGuard } from './lens.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LensService } from './lens.service';
import { LensValidator } from './lens.validator';
import { ChangeLensDto } from './dto/change-lens.dto';
import { LensConfigQueryDto } from './dto/lens-config.dto';
import {
  LensCurrentResponseDto,
  LensChangeResponseDto,
  DashboardResponseDto,
  LensFeaturesResponseDto,
  LensNavigationResponseDto,
  LensThemeResponseDto,
  LensWidgetsResponseDto,
  UnifiedDashboardResponseDto,
} from './dto/lens-response.dto';

@ApiTags('Lens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LensGuard)
@Controller('lens')
export class LensController {
  constructor(
    private readonly lensService: LensService,
    private readonly lensValidator: LensValidator,
  ) {}

  @Get('current')
  @ApiOperation({ summary: 'Get active lens with full configuration' })
  @ApiResponse({ status: 200, type: LensCurrentResponseDto })
  async getCurrentLens(@CurrentUser('id') userId: string): Promise<LensCurrentResponseDto> {
    return this.lensService.getCurrentLens(userId);
  }

  @Put('change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change active lens' })
  @ApiResponse({ status: 200, type: LensChangeResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error - lens not available for user' })
  async changeLens(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeLensDto,
  ): Promise<LensChangeResponseDto> {
    return this.lensService.changeLens(userId, dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get lens configuration (navigation, features, theme, dashboard)' })
  @ApiResponse({ status: 200 })
  async getConfig(
    @CurrentUser('id') userId: string,
    @Query() query: LensConfigQueryDto,
  ) {
    const lens = query.lens || await this.lensService.getUserLensType(userId);
    return this.lensService.getLensConfig(lens);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard widgets and quick actions for active lens' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async getDashboard(@CurrentUser('id') userId: string): Promise<DashboardResponseDto> {
    const lens = await this.lensService.getUserLensType(userId);
    return this.lensService.getDashboard(userId, lens);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature flags for active lens' })
  @ApiResponse({ status: 200, type: LensFeaturesResponseDto })
  async getFeatures(@CurrentUser('id') userId: string): Promise<LensFeaturesResponseDto> {
    const lens = await this.lensService.getUserLensType(userId);
    const features = await this.lensService.getFeatures(lens);
    return { activeLens: lens, features };
  }

  @Get('navigation')
  @ApiOperation({ summary: 'Get tab visibility and ordering for active lens' })
  @ApiResponse({ status: 200, type: LensNavigationResponseDto })
  async getNavigation(@CurrentUser('id') userId: string): Promise<LensNavigationResponseDto> {
    const lens = await this.lensService.getUserLensType(userId);
    return this.lensService.getNavigation(lens);
  }

  @Get('theme')
  @ApiOperation({ summary: 'Get color theme for active lens' })
  @ApiResponse({ status: 200, type: LensThemeResponseDto })
  async getTheme(@CurrentUser('id') userId: string): Promise<LensThemeResponseDto> {
    const lens = await this.lensService.getUserLensType(userId);
    return this.lensService.getTheme(lens);
  }

  @Get('unified')
  @ApiOperation({ summary: 'Get unified dashboard with navigation, widgets, quick actions, dashboard, and theme' })
  @ApiResponse({ status: 200, type: UnifiedDashboardResponseDto })
  async getUnifiedDashboard(@CurrentUser('id') userId: string): Promise<UnifiedDashboardResponseDto> {
    const lens = await this.lensService.getUserLensType(userId);
    return this.lensService.getUnifiedDashboard(userId, lens);
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Get available and active widget configs' })
  @ApiResponse({ status: 200, type: LensWidgetsResponseDto })
  async getWidgets(@CurrentUser('id') userId: string): Promise<LensWidgetsResponseDto> {
    const lens = await this.lensService.getUserLensType(userId);
    return {
      lens,
      ...await this.lensService.getWidgetConfigs(lens),
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get smart recommendations for active lens' })
  @ApiResponse({ status: 200 })
  async getRecommendations(@CurrentUser('id') userId: string) {
    const lens = await this.lensService.getUserLensType(userId);
    return this.lensService.getRecommendations(userId, lens);
  }
}
