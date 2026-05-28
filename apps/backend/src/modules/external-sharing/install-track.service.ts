import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const APP_STORE_LINKS = {
  ios: 'https://apps.apple.com/app/dabbu/id123456789',
  android: 'https://play.google.com/store/apps/details?id=com.dabbu.app',
};

@Injectable()
export class InstallTrackService {
  private readonly logger = new Logger(InstallTrackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async trackInstall(tempUserId: string, deviceId?: string, platform?: string, source?: string) {
    const tempUser = await this.prisma.tempUser.findUnique({ where: { id: tempUserId } });
    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    const installUrl = platform
      ? APP_STORE_LINKS[platform as keyof typeof APP_STORE_LINKS] ?? APP_STORE_LINKS.ios
      : APP_STORE_LINKS.ios;

    const tracking = await this.prisma.installTracking.create({
      data: {
        tempUserId,
        deviceId: deviceId ?? null,
        platform: platform ?? null,
        installSource: source ?? 'banner',
        installUrl,
        redirectCount: 1,
        lastRedirectedAt: new Date(),
      },
    });

    this.logger.log(`Install tracking created for temp user ${tempUserId}, source: ${source}`);

    return {
      trackingId: tracking.id,
      installUrl,
      platform,
      store: platform === 'android' ? 'play_store' : 'app_store',
    };
  }

  async getAppStoreLinks() {
    return {
      ios: {
        url: APP_STORE_LINKS.ios,
        storeName: 'App Store',
      },
      android: {
        url: APP_STORE_LINKS.android,
        storeName: 'Google Play',
      },
    };
  }

  async confirmInstall(tempUserId: string, deviceId?: string) {
    const tempUser = await this.prisma.tempUser.findUnique({ where: { id: tempUserId } });
    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    const [tracking] = await this.prisma.installTracking.findMany({
      where: { tempUserId, isInstalled: false },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (tracking) {
      await this.prisma.installTracking.update({
        where: { id: tracking.id },
        data: {
          isInstalled: true,
          deviceId: deviceId ?? tracking.deviceId,
        },
      });
    }

    await this.prisma.onboardingEvent.create({
      data: {
        tempUserId,
        eventType: 'app_install_clicked',
        source: 'install_tracking',
        metadata: { deviceId, confirmedAt: new Date().toISOString() },
      },
    });

    await this.prisma.tempUser.update({
      where: { id: tempUserId },
      data: { lastActiveAt: new Date() },
    });

    return { success: true, message: 'Installation confirmed' };
  }
}
