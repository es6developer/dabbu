import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all feature flags' })
  async getFeatures() {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: flags.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        isEnabled: f.isEnabled,
      })),
    };
  }
}
