import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface FeatureFlag {
  name: string;
  description: string | null;
  isEnabled: boolean;
}

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);
  private cachedFeatures: FeatureFlag[] | null = null;
  private lastCacheTime = 0;
  private readonly CACHE_TTL = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async getEnabledFeatures(): Promise<string[]> {
    const flags = await this.getAllFeatures();
    return flags.filter((f) => f.isEnabled).map((f) => f.name);
  }

  async getAllFeatures(): Promise<FeatureFlag[]> {
    const now = Date.now();
    if (this.cachedFeatures && now - this.lastCacheTime < this.CACHE_TTL) {
      return this.cachedFeatures;
    }
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
      select: { name: true, description: true, isEnabled: true },
    });
    this.cachedFeatures = flags;
    this.lastCacheTime = now;
    return flags;
  }

  async isFeatureEnabled(name: string): Promise<boolean> {
    const enabled = await this.getEnabledFeatures();
    return enabled.includes(name);
  }

  invalidateCache(): void {
    this.cachedFeatures = null;
    this.lastCacheTime = 0;
  }
}
