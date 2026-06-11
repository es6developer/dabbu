import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBillReminderDto } from './dto/create-bill-reminder.dto';
import { UpdateBillReminderDto } from './dto/update-bill-reminder.dto';

@Injectable()
export class BillRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBillReminderDto) {
    const bill = await this.prisma.bill.create({
      data: {
        userId,
        name: dto.name,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        accountId: dto.accountId || null,
        categoryId: dto.categoryId || null,
        isRecurring: dto.isRecurring ?? false,
        frequency: dto.frequency || null,
        reminderDays: dto.reminderDays ?? 5,
        notes: dto.notes || null,
        payee: dto.payee || null,
        autopayUrl: dto.autopayUrl || null,
      },
      include: { category: true, account: true },
    });
    return this.format(bill);
  }

  async findAll(userId: string) {
    const bills = await this.prisma.bill.findMany({
      where: { userId, deletedAt: null },
      include: { category: true, account: true },
      orderBy: { dueDate: 'asc' },
    });
    return bills.map((b) => this.format(b));
  }

  async findOne(userId: string, id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true, account: true },
    });
    if (!bill) {
      throw new NotFoundException('Bill reminder not found');
    }
    return this.format(bill);
  }

  async update(userId: string, id: string, dto: UpdateBillReminderDto) {
    const existing = await this.prisma.bill.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Bill reminder not found');
    }

    const data: any = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.amount !== undefined) {
      data.amount = dto.amount;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = new Date(dto.dueDate);
    }
    if (dto.accountId !== undefined) {
      data.accountId = dto.accountId;
    }
    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId;
    }
    if (dto.isRecurring !== undefined) {
      data.isRecurring = dto.isRecurring;
    }
    if (dto.frequency !== undefined) {
      data.frequency = dto.frequency;
    }
    if (dto.reminderDays !== undefined) {
      data.reminderDays = dto.reminderDays;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }
    if (dto.payee !== undefined) {
      data.payee = dto.payee;
    }
    if (dto.autopayUrl !== undefined) {
      data.autopayUrl = dto.autopayUrl;
    }
    if (dto.paidAmount !== undefined) {
      data.paidAmount = dto.paidAmount;
    }
    if (dto.isPaid !== undefined) {
      data.isPaid = dto.isPaid;
    }
    if (dto.paidDate !== undefined) {
      data.paidDate = new Date(dto.paidDate);
    }

    const bill = await this.prisma.bill.update({
      where: { id },
      data,
      include: { category: true, account: true },
    });
    return this.format(bill);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.bill.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Bill reminder not found');
    }
    await this.prisma.bill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async getUpcoming(userId: string, days: number = 7) {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const bills = await this.prisma.bill.findMany({
      where: {
        userId,
        deletedAt: null,
        isPaid: false,
        dueDate: { gte: now, lte: end },
      },
      include: { category: true, account: true },
      orderBy: { dueDate: 'asc' },
    });
    return bills.map((b) => this.format(b));
  }

  async getOverdue(userId: string) {
    const now = new Date();
    const bills = await this.prisma.bill.findMany({
      where: {
        userId,
        deletedAt: null,
        isPaid: false,
        dueDate: { lt: now },
      },
      include: { category: true, account: true },
      orderBy: { dueDate: 'asc' },
    });
    return bills.map((b) => this.format(b));
  }

  async markPaid(userId: string, id: string, paidAmount?: number) {
    const existing = await this.prisma.bill.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Bill reminder not found');
    }

    const data: any = {
      isPaid: true,
      paidDate: new Date(),
    };
    if (paidAmount !== undefined) {
      data.paidAmount = paidAmount;
    } else {
      data.paidAmount = existing.amount;
    }

    const bill = await this.prisma.bill.update({
      where: { id },
      data,
      include: { category: true, account: true },
    });
    return this.format(bill);
  }

  private format(b: any) {
    const remaining = Number(b.amount) - Number(b.paidAmount);
    return {
      id: b.id,
      name: b.name,
      amount: Number(b.amount),
      paidAmount: Number(b.paidAmount),
      remaining: Math.max(0, remaining),
      dueDate: b.dueDate,
      isPaid: b.isPaid,
      paidDate: b.paidDate,
      isRecurring: b.isRecurring,
      frequency: b.frequency,
      reminderDays: b.reminderDays,
      notes: b.notes,
      payee: b.payee,
      autopayUrl: b.autopayUrl,
      account: b.account ? { id: b.account.id, name: b.account.name } : null,
      category: b.category
        ? {
            id: b.category.id,
            name: b.category.name,
            icon: b.category.icon,
            color: b.category.color,
          }
        : null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }
}
