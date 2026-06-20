import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isDeleted: false, isActive: true },
      select: { balance: true, type: true, creditLimit: true, currency: true },
    });

    let totalBalance = 0;
    let totalCreditLimit = 0;
    const byType: Record<string, number> = {};

    for (const acct of accounts) {
      const bal = Number(acct.balance);
      totalBalance += bal;
      byType[acct.type] = (byType[acct.type] || 0) + bal;
      if (acct.type === 'credit_card' && acct.creditLimit) {
        totalCreditLimit += Number(acct.creditLimit);
      }
    }

    return {
      totalBalance,
      totalAccounts: accounts.length,
      totalCreditLimit,
      breakdown: byType,
      currency: accounts[0]?.currency || 'INR',
    };
  }
}
