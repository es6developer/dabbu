import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';

@Injectable()
export class ForecastRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async findTransactions(userId: string, startDate: Date) {
    const lensFilter = await this.lensData.buildLensFilter(userId);
    return this.prisma.transaction.findMany({
      where: { userId, ...lensFilter, deletedAt: null, date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });
  }

  async findUnpaidBills(userId: string) {
    const lensFilter = await this.lensData.buildLensFilter(userId);
    return this.prisma.bill.findMany({
      where: { userId, ...lensFilter, deletedAt: null, isPaid: false },
      select: { amount: true, dueDate: true, frequency: true, isRecurring: true, name: true },
    });
  }

  async findLoans(userId: string) {
    return this.prisma.userLoan.findMany({
      where: { userId, deletedAt: null },
      select: { monthlyEmi: true, emiDay: true, name: true },
    });
  }

  async findLoansForPayoff(userId: string) {
    return this.prisma.userLoan.findMany({
      where: { userId, deletedAt: null },
    });
  }

  async findLoanById(userId: string, loanId: string) {
    return this.prisma.userLoan.findMany({
      where: { userId, deletedAt: null, id: loanId },
    });
  }

  async findGoals(userId: string) {
    const lensFilter = await this.lensData.buildLensFilter(userId);
    return this.prisma.goal.findMany({
      where: { userId, ...lensFilter, deletedAt: null },
      select: { name: true, targetAmount: true, currentAmount: true, deadline: true },
    });
  }

}
