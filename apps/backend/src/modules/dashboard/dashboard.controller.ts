import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

class TrackFeatureDto {
  @IsString() @IsNotEmpty() feature: string;
  @IsString() @IsOptional() label?: string;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get consolidated home screen data' })
  async get(@CurrentUser('id') userId: string) {
    return { data: await this.service.get(userId) };
  }

  @Post('track')
  @ApiOperation({ summary: 'Track a feature usage for last-used ordering' })
  async trackFeature(@CurrentUser('id') userId: string, @Body() dto: TrackFeatureDto) {
    await this.service.trackFeature(userId, dto.feature, dto.label);
    return { success: true };
  }
}
