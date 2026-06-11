import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NetWorthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(userId: string) {
    return this.prisma.userNetWorth.findUnique({ where: { userId } });
  }

  async create(data: any) {
    return this.prisma.userNetWorth.create({ data });
  }

  async upsert(where: any, update: any, create: any) {
    return this.prisma.userNetWorth.upsert({ where, update, create });
  }

  async findSnapshots(userId: string, take = 6) {
    return this.prisma.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'desc' },
      take,
      select: { snapshotDate: true, netWorth: true, totalAssets: true, totalLiabilities: true },
    });
  }

  async upsertSnapshot(where: any, update: any, create: any) {
    return this.prisma.netWorthSnapshot.upsert({ where, update, create });
  }
}
