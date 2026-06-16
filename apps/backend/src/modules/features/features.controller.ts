import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags with their enabled status' })
  async getFeatures() {
    const features = await this.featuresService.getAllFeatures();
    const enabledFeatures = features.filter((f) => f.isEnabled).map((f) => f.name);
    return {
      data: {
        features,
        enabledFeatures,
        allEnabled: features.every((f) => f.isEnabled),
        anyDisabled: features.some((f) => !f.isEnabled),
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('enabled')
  @ApiOperation({ summary: 'Get list of enabled feature names (authenticated)' })
  async getEnabledFeatures() {
    const enabled = await this.featuresService.getEnabledFeatures();
    return { data: enabled };
  }
}
