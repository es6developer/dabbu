import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async list(userId: string, type?: string, includeArchived = false) {
    const where: any = { userId, isDeleted: false, ...(await this.lensData.buildLensFilter(userId)) };
    if (type) where.type = type;
    if (!includeArchived) where.isArchived = false;

    return this.prisma.account.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getById(id: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, isDeleted: false, ...(await this.lensData.buildLensFilter(userId)) },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        balance: dto.balance ?? 0,
        currency: dto.currency ?? 'INR',
        description: dto.description,
        institution: dto.institution,
        color: dto.color,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateAccountDto) {
    await this.getById(id, userId);
    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.balance !== undefined && { balance: dto.balance }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.institution !== undefined && { institution: dto.institution }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.getById(id, userId);
    await this.prisma.account.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getStats(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isDeleted: false, isActive: true, ...(await this.lensData.buildLensFilter(userId)) },
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
