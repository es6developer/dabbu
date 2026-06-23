import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SpacesMigrationService {
  constructor(private readonly prisma: PrismaService) {}

  async migrateCoupleToSpace(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { partner: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.partnerId || !user.partner) {
      throw new BadRequestException('User is not in couple mode (no partnerId)');
    }

    const existing = await this.prisma.space.findFirst({
      where: {
        type: 'COUPLE',
        members: { some: { userId } },
      },
    });
    if (existing) {
      return existing;
    }

    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const partnerName = [user.partner.firstName, user.partner.lastName].filter(Boolean).join(' ');

    const space = await this.prisma.space.create({
      data: {
        name: `${userName} & ${partnerName}'s Space`,
        type: 'COUPLE',
        createdBy: userId,
        lensId: 'PARTNERED',
        members: {
          createMany: {
            data: [
              { userId, role: 'owner' },
              { userId: user.partnerId, role: 'member' },
            ],
          },
        },
      },
    });

    const bothIds = [userId, user.partnerId];

    await this.prisma.transaction.updateMany({
      where: {
        userId: { in: bothIds },
        expenseGroupId: { not: null },
        spaceId: null,
      },
      data: { spaceId: space.id },
    });

    await this.prisma.goal.updateMany({
      where: {
        userId: { in: bothIds },
        spaceId: null,
      },
      data: { spaceId: space.id },
    });

    return space;
  }

  async migrateFamilyToSpace(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.userType !== 'family') {
      throw new BadRequestException('User is not family type');
    }

    const familyMemberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: { members: true },
        },
      },
    });

    if (!familyMemberships.length) {
      throw new NotFoundException('No family found for this user');
    }

    const results: any[] = [];
    for (const fm of familyMemberships) {
      const family = fm.family;

      const existing = await this.prisma.space.findFirst({
        where: {
          type: 'FAMILY',
          name: family.name,
          members: { some: { userId } },
        },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      const memberMap = new Map<string, { userId: string; role: string }>();
      for (const m of family.members) {
        if (!memberMap.has(m.userId)) {
          memberMap.set(m.userId, {
            userId: m.userId,
            role: m.userId === family.ownerId ? 'owner' : m.role,
          });
        }
      }

      const space = await this.prisma.space.create({
        data: {
          name: family.name,
          type: 'FAMILY',
          createdBy: userId,
          lensId: 'FAMILY',
          members: {
            createMany: {
              data: Array.from(memberMap.values()),
            },
          },
        },
      });

      const familyUserIds = Array.from(memberMap.keys());

      await this.prisma.transaction.updateMany({
        where: {
          userId: { in: familyUserIds },
          expenseGroupId: { not: null },
          spaceId: null,
        },
        data: { spaceId: space.id },
      });

      await this.prisma.goal.updateMany({
        where: {
          userId: { in: familyUserIds },
          spaceId: null,
        },
        data: { spaceId: space.id },
      });

      results.push(space);
    }

    return results.length === 1 ? results[0] : results;
  }

  async migrateAll(userId: string) {
    const result: Record<string, unknown> = {};
    try {
      result.couple = await this.migrateCoupleToSpace(userId);
    } catch (e: any) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        result.couple = { skipped: e.message };
      } else {
        result.couple = { error: e.message };
      }
    }
    try {
      result.family = await this.migrateFamilyToSpace(userId);
    } catch (e: any) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        result.family = { skipped: e.message };
      } else {
        result.family = { error: e.message };
      }
    }
    return result;
  }
}
