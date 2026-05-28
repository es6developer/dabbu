import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstallTrackService } from './install-track.service';
import { InstallTrackDto } from './dto/install-track.dto';

@ApiTags('External Sharing - Install Tracking')
@Controller('external-sharing/install')
export class InstallTrackController {
  constructor(private readonly installTrackService: InstallTrackService) {}

  @Post('track')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Track install redirect' })
  async trackInstall(@Body() dto: InstallTrackDto) {
    const result = await this.installTrackService.trackInstall(
      dto.tempUserId, dto.deviceId, dto.platform, dto.source,
    );
    return { data: result };
  }

  @Get('links')
  @ApiOperation({ summary: 'Get app store links' })
  async getAppStoreLinks() {
    const result = await this.installTrackService.getAppStoreLinks();
    return { data: result };
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm installation' })
  async confirmInstall(@Body('tempUserId') tempUserId: string, @Body('deviceId') deviceId?: string) {
    const result = await this.installTrackService.confirmInstall(tempUserId, deviceId);
    return { data: result };
  }
}
