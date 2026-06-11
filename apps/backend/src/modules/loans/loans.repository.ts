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
}
