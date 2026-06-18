import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EmergencyFundService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const [stats, netWorth] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense', deletedAt: null },
        _avg: { amount: true },
      }),
      this.prisma.userNetWorth.findUnique({ where: { userId } }),
    ]);

    const monthlyExpense = Math.max(Math.round(Number(stats._avg.amount || 0)) * 30, 10000);
    const savedAmount = Math.max(Number(netWorth?.cash || 0), 0);
    const targetMonths = 6;
    const targetAmount = monthlyExpense * targetMonths;
    const coverageMonths =
      monthlyExpense > 0 ? Math.round((savedAmount / monthlyExpense) * 10) / 10 : 0;
    const progress = Math.min(coverageMonths / targetMonths, 1);
    const remaining = Math.max(0, targetAmount - savedAmount);

    return {
      monthlyExpense,
      savedAmount,
      targetAmount,
      targetMonths,
      coverageMonths,
      progress,
      remaining,
      monthlyContribution: Math.ceil(remaining / targetMonths),
    };
  }

  async update(userId: string, savedAmount?: number) {
    const existing = await this.prisma.userNetWorth.findUnique({ where: { userId } });
    if (existing) {
      await this.prisma.userNetWorth.update({
        where: { userId },
        data: { cash: savedAmount ?? existing.cash },
      });
    } else {
      await this.prisma.userNetWorth.create({
        data: { userId, cash: savedAmount ?? 0 },
      });
    }
    return this.get(userId);
  }
}
