import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LensPreferencesService {
  private readonly logger = new Logger(LensPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserLensPreferences(userId: string) {
    const userLenses = await this.prisma.userLens.findMany({
      where: { userId },
      include: {
        lens: {
          select: { type: true, name: true, icon: true, description: true },
        },
      },
      orderBy: { lastSwitchedAt: 'desc' },
    });
    return userLenses;
  }

  async getLensOnboardingStatus(userId: string, lensType: string) {
    const lens = await this.prisma.lens.findUnique({ where: { type: lensType as any } });
    if (!lens) return null;

    return this.prisma.userLens.findUnique({
      where: { userId_lensId: { userId, lensId: lens.id } },
    });
  }

  async updateOnboardingStep(userId: string, lensType: string, step: string) {
    const lens = await this.prisma.lens.findUnique({ where: { type: lensType as any } });
    if (!lens) throw new Error(`Lens ${lensType} not found`);

    return this.prisma.userLens.upsert({
      where: { userId_lensId: { userId, lensId: lens.id } },
      update: { onboardingStep: step, isOnboarded: step === 'complete' },
      create: { userId, lensId: lens.id, onboardingStep: step, isOnboarded: step === 'complete' },
    });
  }

  async markLensOnboarded(userId: string, lensType: string) {
    return this.updateOnboardingStep(userId, lensType, 'complete');
  }
}
