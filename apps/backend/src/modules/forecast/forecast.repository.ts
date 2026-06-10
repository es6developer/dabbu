import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ForecastRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTransactions(userId: string, startDate: Date) {
    return this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });
  }

  async findAccounts(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      select: { balance: true, type: true },
    });
  }

  async findUnpaidBills(userId: string) {
    return this.prisma.bill.findMany({
      where: { userId, deletedAt: null, isPaid: false },
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
    return this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      select: { name: true, targetAmount: true, currentAmount: true, deadline: true },
    });
  }

  async findAccountBalances(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      select: { balance: true },
    });
  }
}
