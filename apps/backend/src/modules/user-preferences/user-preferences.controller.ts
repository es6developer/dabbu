import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../premium/guards/premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPreferencesService } from './user-preferences.service';

@ApiTags('User Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user/preferences')
export class UserPreferencesController {
  constructor(private readonly svc: UserPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  async get(@CurrentUser('id') userId: string) {
    return this.svc.getPreferences(userId);
  }

  @Put('dashboard')
  @ApiOperation({ summary: 'Update dashboard layout' })
  async updateDashboard(@CurrentUser('id') userId: string, @Body('layout') layout: any[]) {
    return this.svc.updateDashboardLayout(userId, layout);
  }

  @Put('bottom-menu')
  @ApiOperation({ summary: 'Update bottom menu config' })
  async updateBottomMenu(@CurrentUser('id') userId: string, @Body('config') config: any[]) {
    return this.svc.updateBottomMenuConfig(userId, config);
  }

  @Put('primary-color')
  @ApiOperation({ summary: 'Update preferred primary color' })
  async updatePrimaryColor(@CurrentUser('id') userId: string, @Body('color') color: string | null) {
    return this.svc.updatePrimaryColor(userId, color);
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Get available dashboard widgets catalog' })
  async getWidgetCatalog(@CurrentUser('id') userId: string) {
    const catalog = this.svc.getWidgetCatalog(userId);
    return { data: catalog };
  }

  @Put('visibility')
  @ApiOperation({ summary: 'Toggle bottom bar and quick action sheet visibility' })
  async updateVisibility(
    @CurrentUser('id') userId: string,
    @Body() body: { bottomBarVisible?: boolean; quickActionVisible?: boolean },
  ) {
    return this.svc.updateVisibility(userId, body);
  }
}
