import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LoansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.userLoan.create({ data });
  }

  async findAll(userId: string) {
    return this.prisma.userLoan.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.userLoan.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async updateMany(where: any, data: any) {
    return this.prisma.userLoan.updateMany({ where, data });
  }

  async createEmiPayment(data: any) {
    return (this.prisma as any).emiPayment.create({ data });
  }

  async findEmiPayments(loanId: string) {
    return (this.prisma as any).emiPayment.findMany({
      where: { loanId },
      orderBy: { paidDate: 'desc' },
    });
  }

  async findEmiPaymentsByUser(userId: string) {
    return (this.prisma as any).emiPayment.findMany({
      where: { userId },
      orderBy: { paidDate: 'desc' },
      include: { loan: { select: { name: true, type: true } } },
    });
  }

  async getTotalLiability(userId: string) {
    const result = await this.prisma.userLoan.aggregate({
      where: { userId, deletedAt: null },
      _sum: { totalAmount: true, paidAmount: true },
    });
    return {
      totalLoanAmount: Number(result._sum.totalAmount || 0),
      totalPaid: Number(result._sum.paidAmount || 0),
    };
  }
}
