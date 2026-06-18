import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createHash } from 'crypto';

interface FeatureFlag {
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  userIdWhitelist: string[] | null;
  environment: string;
  experimentId: string | null;
  variant: string | null;
}

interface RemoteConfigValue {
  key: string;
  value: any;
  type: string;
}

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);
  private cachedFeatures: FeatureFlag[] | null = null;
  private cachedRemoteConfig: RemoteConfigValue[] | null = null;
  private lastCacheTime = 0;
  private lastConfigCacheTime = 0;
  private readonly CACHE_TTL = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async getEnabledFeatures(userId?: string): Promise<string[]> {
    const flags = await this.getAllFeatures();
    const env = process.env.NODE_ENV || 'development';
    const result: string[] = [];

    for (const flag of flags) {
      if (!flag.isEnabled) continue;

      if (flag.environment !== 'all' && flag.environment !== env) continue;

      if (flag.userIdWhitelist && userId && flag.userIdWhitelist.includes(userId)) {
        result.push(flag.name);
        continue;
      }

      if (flag.rolloutPercentage < 100 && userId) {
        const hash = createHash('md5').update(`${flag.name}:${userId}`).digest('hex');
        const hashNum = parseInt(hash.substring(0, 8), 16) % 100;
        if (hashNum >= flag.rolloutPercentage) continue;
      }

      result.push(flag.name);
    }

    return result;
  }

  async isFeatureEnabled(name: string, userId?: string): Promise<boolean> {
    const enabled = await this.getEnabledFeatures(userId);
    return enabled.includes(name);
  }

  async getFeatureVariant(name: string, userId: string): Promise<string | null> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { name } });
    if (!flag || !flag.isEnabled || !flag.experimentId) return null;

    const env = process.env.NODE_ENV || 'development';
    if (flag.environment !== 'all' && flag.environment !== env) return null;

    if (flag.rolloutPercentage < 100) {
      const hash = createHash('md5').update(`${flag.name}:${userId}`).digest('hex');
      const hashNum = parseInt(hash.substring(0, 8), 16) % 100;
      if (hashNum >= flag.rolloutPercentage) return null;
    }

    return flag.variant || 'control';
  }

  async getAllFeatures(): Promise<FeatureFlag[]> {
    const now = Date.now();
    if (this.cachedFeatures && now - this.lastCacheTime < this.CACHE_TTL) {
      return this.cachedFeatures;
    }
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
    this.cachedFeatures = flags.map(f => ({
      ...f,
      userIdWhitelist: f.userIdWhitelist as string[] | null,
    }));
    this.lastCacheTime = now;
    return this.cachedFeatures;
  }

  async getRemoteConfig(key: string): Promise<RemoteConfigValue | null> {
    const configs = await this.getAllRemoteConfig();
    return configs.find(c => c.key === key) || null;
  }

  async getAllRemoteConfig(): Promise<RemoteConfigValue[]> {
    const now = Date.now();
    if (this.cachedRemoteConfig && now - this.lastConfigCacheTime < this.CACHE_TTL) {
      return this.cachedRemoteConfig;
    }
    const env = process.env.NODE_ENV || 'development';
    const configs = await this.prisma.remoteConfig.findMany({
      where: { OR: [{ environment: 'all' }, { environment: env }] },
    });
    this.cachedRemoteConfig = configs.map(c => ({ key: c.key, value: c.value, type: c.type }));
    this.lastConfigCacheTime = now;
    return this.cachedRemoteConfig;
  }

  invalidateCache(): void {
    this.cachedFeatures = null;
    this.cachedRemoteConfig = null;
    this.lastCacheTime = 0;
    this.lastConfigCacheTime = 0;
  }
}
