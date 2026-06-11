import { Injectable } from '@nestjs/common';
import { LoansRepository } from './loans.repository';
import { CreateLoanDto, UpdateLoanDto } from './dto/loans.dto';

@Injectable()
export class LoansService {
  constructor(private readonly repo: LoansRepository) {}

  async create(userId: string, dto: CreateLoanDto) {
    const data: any = {
      userId,
      name: dto.name,
      totalAmount: dto.totalAmount ?? 0,
      paidAmount: dto.paidAmount ?? 0,
      interestPaid: dto.interestPaid ?? 0,
      monthlyEmi: dto.monthlyEmi ?? 0,
    };
    if (dto.emiDay !== undefined) {
      data.emiDay = dto.emiDay;
    }
    if (dto.startDate) {
      data.startDate = new Date(dto.startDate);
    }
    return this.repo.create(data);
  }

  async findAll(userId: string) {
    const loans = await this.repo.findAll(userId);
    const totalRemaining = loans.reduce(
      (sum, l) => sum + (Number(l.totalAmount) - Number(l.paidAmount)),
      0,
    );
    const totalEmi = loans.reduce((sum, l) => sum + Number(l.monthlyEmi), 0);
    const now = new Date();
    const enriched = loans.map((l) => {
      let nextEmiDate: string | null = null;
      if (l.emiDay) {
        const next = new Date(now.getFullYear(), now.getMonth(), l.emiDay);
        if (next < now) {
          next.setMonth(next.getMonth() + 1);
        }
        nextEmiDate = next.toISOString().split('T')[0];
      }
      return {
        ...l,
        totalAmount: Number(l.totalAmount),
        paidAmount: Number(l.paidAmount),
        interestPaid: Number(l.interestPaid),
        monthlyEmi: Number(l.monthlyEmi),
        nextEmiDate,
        remaining: Number(l.totalAmount) - Number(l.paidAmount),
      };
    });
    return { loans: enriched, totalRemaining, totalEmi, count: loans.length };
  }

  async findOne(id: string, userId: string) {
    const loan = await this.repo.findOne(id, userId);
    if (!loan) {
      return null;
    }
    let nextEmiDate: string | null = null;
    if (loan.emiDay) {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), loan.emiDay);
      if (next < now) {
        next.setMonth(next.getMonth() + 1);
      }
      nextEmiDate = next.toISOString().split('T')[0];
    }
    return {
      ...loan,
      totalAmount: Number(loan.totalAmount),
      paidAmount: Number(loan.paidAmount),
      interestPaid: Number(loan.interestPaid),
      monthlyEmi: Number(loan.monthlyEmi),
      nextEmiDate,
      remaining: Number(loan.totalAmount) - Number(loan.paidAmount),
    };
  }

  async update(id: string, userId: string, dto: UpdateLoanDto) {
    const data: any = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.totalAmount !== undefined) {
      data.totalAmount = dto.totalAmount;
    }
    if (dto.paidAmount !== undefined) {
      data.paidAmount = dto.paidAmount;
    }
    if (dto.interestPaid !== undefined) {
      data.interestPaid = dto.interestPaid;
    }
    if (dto.monthlyEmi !== undefined) {
      data.monthlyEmi = dto.monthlyEmi;
    }
    if (dto.emiDay !== undefined) {
      data.emiDay = dto.emiDay;
    }
    if (dto.startDate !== undefined) {
      data.startDate = new Date(dto.startDate);
    }
    await this.repo.updateMany({ id, userId }, data);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    return this.repo.updateMany({ id, userId }, { deletedAt: new Date() });
  }
}
