import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  async getFeatures() {
    const features = await this.featuresService.getAllFeatures();
    const enabledFeatures = features.filter((f) => f.isEnabled).map((f) => f.name);
    return { data: { features, enabledFeatures } };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('enabled')
  @ApiOperation({ summary: 'Get enabled features for current user (with rollout checks)' })
  async getEnabledFeatures(@CurrentUser('id') userId: string) {
    const enabled = await this.featuresService.getEnabledFeatures(userId);
    return { data: enabled };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('variant/:name')
  @ApiOperation({ summary: 'Get A/B test variant for a feature' })
  async getFeatureVariant(
    @CurrentUser('id') userId: string,
    @Param('name') name: string,
  ) {
    const variant = await this.featuresService.getFeatureVariant(name, userId);
    return { data: { feature: name, variant } };
  }

  @Get('remote/:key')
  @ApiOperation({ summary: 'Get remote config value' })
  async getRemoteConfig(@Param('key') key: string) {
    const config = await this.featuresService.getRemoteConfig(key);
    return { data: config };
  }

  @Get('remote')
  @ApiOperation({ summary: 'Get all remote config values' })
  async getAllRemoteConfig() {
    const configs = await this.featuresService.getAllRemoteConfig();
    return { data: configs };
  }
}
