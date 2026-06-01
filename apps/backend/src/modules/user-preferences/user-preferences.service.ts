import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UserPreferencesService {
  private readonly logger = new Logger(UserPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dashboardLayout: true,
        bottomMenuConfig: true,
        preferredPrimaryColor: true,
      },
    });
    return {
      dashboardLayout: user?.dashboardLayout || this.defaultDashboardLayout(),
      bottomMenuConfig: user?.bottomMenuConfig || this.defaultBottomMenuConfig(),
      preferredPrimaryColor: user?.preferredPrimaryColor || null,
    };
  }

  async updateDashboardLayout(userId: string, layout: any[]) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { dashboardLayout: layout },
    });
    return { message: 'Dashboard layout updated' };
  }

  async updateBottomMenuConfig(userId: string, config: any[]) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { bottomMenuConfig: config },
    });
    return { message: 'Bottom menu updated' };
  }

  async updatePrimaryColor(userId: string, color: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredPrimaryColor: color },
    });
    return { message: 'Primary color updated' };
  }

  private defaultDashboardLayout() {
    return [
      { id: 'balance', visible: true, order: 0 },
      { id: 'quickActions', visible: true, order: 1 },
      { id: 'features', visible: true, order: 2 },
      { id: 'snapshots', visible: true, order: 3 },
      { id: 'recentActivity', visible: true, order: 4 },
    ];
  }

  private defaultBottomMenuConfig() {
    return [
      { id: 'Dashboard', visible: true, order: 0 },
      { id: 'Accounts', visible: true, order: 1 },
      { id: 'Shared', visible: true, order: 2 },
      { id: 'Reminders', visible: true, order: 3 },
      { id: 'SMS', visible: true, order: 4 },
      { id: 'Settings', visible: true, order: 5, locked: true },
    ];
  }
}
