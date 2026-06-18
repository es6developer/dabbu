import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecurringSchedulerService {
  private readonly logger = new Logger(RecurringSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processRecurringTransactions() {
    this.logger.log('Processing recurring transactions...');

    const recurringTxs = await this.prisma.transaction.findMany({
      where: {
        isRecurring: true,
        deletedAt: null,
        recurringId: { not: null },
        recurringFrequency: { not: null },
      },
      orderBy: { date: 'desc' },
    });

    const seriesMap = new Map<string, typeof recurringTxs>();
    for (const tx of recurringTxs) {
      const rid = tx.recurringId!;
      if (!seriesMap.has(rid)) {
        seriesMap.set(rid, []);
      }
      seriesMap.get(rid)!.push(tx);
    }

    let created = 0;
    for (const [recurringId, instances] of seriesMap) {
      try {
        const latest = instances[0];
        const endDate = latest.recurringEndDate;
        if (endDate && new Date(endDate) < new Date()) {
          continue;
        }

        const nextDate = this.calculateNextDate(latest.date, latest.recurringFrequency!);
        if (!nextDate || nextDate > new Date()) {
          continue;
        }

        const alreadyExists = instances.some(
          (t) => t.date.toDateString() === nextDate.toDateString(),
        );
        if (alreadyExists) {
          continue;
        }

        await this.prisma.transaction.create({
          data: {
            userId: latest.userId,
            accountId: latest.accountId,
            categoryId: latest.categoryId,
            expenseGroupId: latest.expenseGroupId,
            amount: latest.amount,
            type: latest.type,
            date: nextDate,
            description: latest.description,
            notes: latest.notes,
            tags: latest.tags ?? [],
            isRecurring: true,
            recurringId,
            recurringFrequency: latest.recurringFrequency,
            recurringEndDate: latest.recurringEndDate,
            status: 'pending',
            metadata: latest.metadata ?? {},
          },
        });
        created++;
      } catch (err: any) {
        this.logger.error(`Failed to process recurring series ${recurringId}: ${err.message}`);
      }
    }

    if (created > 0) {
      this.logger.log(`Created ${created} recurring transaction instances`);
    }
  }

  private calculateNextDate(lastDate: Date, frequency: string): Date | null {
    const next = new Date(lastDate);
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return null;
    }
    while (next <= new Date()) {
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'yearly':
          next.setFullYear(next.getFullYear() + 1);
          break;
      }
    }
    return next;
  }
}
