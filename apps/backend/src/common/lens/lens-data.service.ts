import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LensDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpaceIdsForLens(userId: string, lens?: string): Promise<string[]> {
    if (!lens) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { activeLens: true },
      });
      lens = user?.activeLens || 'PERSONAL';
    }

    if (lens === 'PARTNERED' || lens === 'FAMILY') {
      const mappedType = lens === 'PARTNERED' ? 'COUPLE' : lens;
      const spaces = await this.prisma.spaceMember.findMany({
        where: { userId },
        select: { space: { select: { id: true, type: true } } },
      });
      return spaces
        .filter((s) => s.space.type === mappedType)
        .map((s) => s.space.id)
        .slice(0, 1);
    }

    return [];
  }

  async getSpaceIdForLens(userId: string, lens?: string): Promise<string | null> {
    const ids = await this.getSpaceIdsForLens(userId, lens);
    return ids[0] || null;
  }

  async getActiveLens(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeLens: true },
    });
    return user?.activeLens || 'PERSONAL';
  }

  /** Build a Prisma where clause that filters data to the user's active lens.
   *  For FULL lens, no filter is applied (all data visible). */
  async buildLensFilter(userId: string): Promise<{ lensId?: string }> {
    const lens = await this.getActiveLens(userId);
    if (lens === 'FULL') {
      return {};
    }
    return { lensId: lens };
  }
}
