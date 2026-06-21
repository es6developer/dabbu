import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../common/cache/cache.service';
import { LensType } from '@prisma/client';

@Injectable()
export class LensCacheService {
  private readonly logger = new Logger(LensCacheService.name);

  constructor(private readonly cache: CacheService) {}

  private buildKey(prefix: string, lens?: LensType, userId?: string): string {
    const parts = [prefix];
    if (userId) parts.push(userId);
    if (lens) parts.push(lens);
    return parts.join('::');
  }

  async getCurrentLens(userId: string): Promise<unknown | null> {
    return this.cache.get(this.buildKey('lens:current', undefined, userId));
  }

  async setCurrentLens(userId: string, data: unknown): Promise<void> {
    this.cache.set(this.buildKey('lens:current', undefined, userId), data, 300_000);
  }

  async getLensConfig(lens: LensType): Promise<unknown | null> {
    return this.cache.get(this.buildKey('lens:config', lens));
  }

  async setLensConfig(lens: LensType, data: unknown): Promise<void> {
    this.cache.set(this.buildKey('lens:config', lens), data, 3_600_000);
  }

  async getDashboard(userId: string, lens: LensType): Promise<unknown | null> {
    return this.cache.get(this.buildKey('lens:dashboard', lens, userId));
  }

  async setDashboard(userId: string, lens: LensType, data: unknown): Promise<void> {
    this.cache.set(this.buildKey('lens:dashboard', lens, userId), data, 120_000);
  }

  async getFeatures(lens: LensType): Promise<unknown | null> {
    return this.cache.get(this.buildKey('lens:features', lens));
  }

  async setFeatures(lens: LensType, data: unknown): Promise<void> {
    this.cache.set(this.buildKey('lens:features', lens), data, 3_600_000);
  }

  async getNavigation(lens: LensType): Promise<unknown | null> {
    return this.cache.get(this.buildKey('lens:navigation', lens));
  }

  async setNavigation(lens: LensType, data: unknown): Promise<void> {
    this.cache.set(this.buildKey('lens:navigation', lens), data, 3_600_000);
  }

  async getTheme(lens: LensType): Promise<unknown | null> {
    return this.cache.get(this.buildKey('lens:theme', lens));
  }

  async setTheme(lens: LensType, data: unknown): Promise<void> {
    this.cache.set(this.buildKey('lens:theme', lens), data, 86_400_000);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `lens:current::${userId}`,
      `lens:dashboard::${userId}`,
    ];
    for (const p of patterns) {
      this.cache.invalidate(p);
    }
  }

  async invalidateLensConfig(lens: LensType): Promise<void> {
    this.cache.invalidate(`lens:config::${lens}`);
    this.cache.invalidate(`lens:features::${lens}`);
    this.cache.invalidate(`lens:navigation::${lens}`);
    this.cache.invalidate(`lens:theme::${lens}`);
  }

  async invalidateAll(): Promise<void> {
    this.cache.invalidate();
  }
}
