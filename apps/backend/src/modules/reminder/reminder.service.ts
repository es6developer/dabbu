import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay, isBefore } from 'date-fns';
import { CreateReminderDto, UpdateReminderDto, ListRemindersQueryDto } from './dto';
import { ReminderFrequency, ReminderStatus } from './interfaces';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}
  
  private async lensWhere(userId: string): Promise<{ lensId?: string }> {
    return this.lensData.buildLensFilter(userId);
  }

  async create(userId: string, dto: CreateReminderDto) {
    const { recurring, ...reminderData } = dto;
    const lensId = await this.lensData.getActiveLens(userId);

    return this.prisma.$transaction(async (tx) => {
      const reminder = await tx.reminder.create({
        data: {
          userId,
          lensId,
          title: reminderData.title,
          description: reminderData.description || null,
          type: reminderData.type,
          priority: reminderData.priority,
          status: reminderData.status || ReminderStatus.PENDING,
          remindAt: new Date(reminderData.startDate),
          startDate: new Date(reminderData.startDate),
          dueDate: reminderData.dueDate ? new Date(reminderData.dueDate) : null,
          snoozedUntil: reminderData.snoozedUntil ? new Date(reminderData.snoozedUntil) : null,
          isRecurring: reminderData.isRecurring,
          categoryId: reminderData.categoryId || null,
          metadata: reminderData.metadata || undefined,
        } as any,
      });

      if (dto.isRecurring && recurring) {
        const nextTriggerAt = this._calculateNextTrigger({
          frequency: recurring.frequency,
          interval: recurring.interval,
          daysOfWeek: recurring.daysOfWeek,
          dayOfMonth: recurring.dayOfMonth,
          monthOfYear: recurring.monthOfYear,
          startDate: new Date(dto.startDate),
        });

        await tx.recurringReminder.create({
          data: {
            userId,
            title: reminder.title,
            type: reminder.type,
            startDate: nextTriggerAt,
            reminderId: reminder.id,
            frequency: recurring.frequency,
            interval: recurring.interval ?? 1,
            daysOfWeek: recurring.daysOfWeek ? JSON.stringify(recurring.daysOfWeek) : null,
            dayOfMonth: recurring.dayOfMonth ?? null,
            monthOfYear: recurring.monthOfYear ?? null,
            endDate: recurring.endDate ? new Date(recurring.endDate) : null,
            occurrences: recurring.occurrences ?? null,
            count: 0,
            nextTriggerAt,
            isActive: true,
          },
        });
      }

      return this._formatReminder(reminder);
    });
  }

  async findAll(userId: string, query: ListRemindersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      deletedAt: null,
      ...(await this.lensWhere(userId)),
    };

    if (query.type) {
      where.type = query.type;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }
    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) {
        where.startDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startDate.lte = new Date(query.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.reminder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          recurring: true,
          category: true,
        },
      }),
      this.prisma.reminder.count({ where }),
    ]);

    return {
      data: items.map((item) => this._formatReminder(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensWhere(userId)) },
      include: {
        recurring: true,
        category: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }
    return this._formatReminder(reminder);
  }

  async update(userId: string, id: string, dto: UpdateReminderDto) {
    const existing = await this.prisma.reminder.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensWhere(userId)) },
    });

    if (!existing) {
      throw new NotFoundException('Reminder not found');
    }

    const { recurring, ...reminderData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (reminderData.title !== undefined) {
        updateData.title = reminderData.title;
      }
      if (reminderData.description !== undefined) {
        updateData.description = reminderData.description;
      }
      if (reminderData.type !== undefined) {
        updateData.type = reminderData.type;
      }
      if (reminderData.priority !== undefined) {
        updateData.priority = reminderData.priority;
      }
      if (reminderData.status !== undefined) {
        updateData.status = reminderData.status;
      }
      if (reminderData.startDate !== undefined) {
        updateData.startDate = new Date(reminderData.startDate);
      }
      if (reminderData.dueDate !== undefined) {
        updateData.dueDate = reminderData.dueDate ? new Date(reminderData.dueDate) : null;
      }
      if (reminderData.snoozedUntil !== undefined) {
        updateData.snoozedUntil = reminderData.snoozedUntil
          ? new Date(reminderData.snoozedUntil)
          : null;
      }
      if (reminderData.isRecurring !== undefined) {
        updateData.isRecurring = reminderData.isRecurring;
      }
      if (reminderData.categoryId !== undefined) {
        updateData.categoryId = reminderData.categoryId;
      }
      if (reminderData.metadata !== undefined) {
        updateData.metadata = reminderData.metadata;
      }

      const reminder = await tx.reminder.update({
        where: { id },
        data: updateData,
      });

      if (recurring) {
        const existingRecurring = await tx.recurringReminder.findUnique({
          where: { reminderId: id },
        });

        const recurringData: any = {
          frequency: recurring.frequency,
          interval: recurring.interval ?? 1,
          daysOfWeek: recurring.daysOfWeek ? JSON.stringify(recurring.daysOfWeek) : null,
          dayOfMonth: recurring.dayOfMonth ?? null,
          monthOfYear: recurring.monthOfYear ?? null,
          endDate: recurring.endDate ? new Date(recurring.endDate) : null,
          occurrences: recurring.occurrences ?? null,
        };

        recurringData.nextTriggerAt = this._calculateNextTrigger({
          frequency: recurring.frequency,
          interval: recurring.interval,
          daysOfWeek: recurring.daysOfWeek,
          dayOfMonth: recurring.dayOfMonth,
          monthOfYear: recurring.monthOfYear,
          startDate: reminder.startDate || new Date(),
        });

        if (existingRecurring) {
          await tx.recurringReminder.update({
            where: { reminderId: id },
            data: recurringData,
          });
        } else if (dto.isRecurring) {
          await tx.recurringReminder.create({
            data: {
              userId,
              title: reminder.title,
              type: reminder.type,
              startDate: reminder.startDate || new Date(),
              reminderId: id,
              ...recurringData,
              count: 0,
              isActive: true,
            },
          });
        }
      }

      return this._formatReminder(
        await tx.reminder.findUnique({
          where: { id },
          include: { recurring: true, category: true },
        }),
      );
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.reminder.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensWhere(userId)) },
    });

    if (!existing) {
      throw new NotFoundException('Reminder not found');
    }

    await this.prisma.reminder.update({
      where: { id },
      data: { deletedAt: new Date() } as any,
    });

    return { message: 'Reminder deleted successfully' };
  }

  async complete(userId: string, id: string) {
    const existing = await this.prisma.reminder.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensWhere(userId)) },
    });

    if (!existing) {
      throw new NotFoundException('Reminder not found');
    }

    const reminder = await this.prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.COMPLETED,
        completedAt: new Date(),
      } as any,
      include: { recurring: true, category: true },
    });

    if (reminder.isRecurring && reminder.recurring) {
      await this._handleRecurrenceAfterCompletion(reminder);
    }

    return this._formatReminder(reminder);
  }

  async snooze(userId: string, id: string, until: string) {
    const existing = await this.prisma.reminder.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensWhere(userId)) },
    });

    if (!existing) {
      throw new NotFoundException('Reminder not found');
    }

    const snoozedUntil = new Date(until);
    if (isBefore(snoozedUntil, new Date())) {
      throw new BadRequestException('Snooze time must be in the future');
    }

    const reminder = await this.prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.SNOOZED,
        snoozedUntil,
      } as any,
      include: { recurring: true, category: true },
    });

    return this._formatReminder(reminder);
  }

  async getUpcoming(userId: string, days: number = 7) {
    const now = new Date();
    const futureDate = addDays(now, days);

    const items = await this.prisma.reminder.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(await this.lensWhere(userId)),
        status: { notIn: [ReminderStatus.COMPLETED, ReminderStatus.DISMISSED] },
        startDate: { gte: now, lte: futureDate },
      } as any,
      orderBy: { startDate: 'asc' },
      include: { recurring: true, category: true },
    });

    return items.map((item) => this._formatReminder(item));
  }

  async getTodayReminders(userId: string) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const items = await this.prisma.reminder.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(await this.lensWhere(userId)),
        status: { notIn: [ReminderStatus.COMPLETED, ReminderStatus.DISMISSED] },
        startDate: { gte: todayStart, lte: todayEnd },
      } as any,
      orderBy: { startDate: 'asc' },
      include: { recurring: true, category: true },
    });

    return items.map((item) => this._formatReminder(item));
  }

  async getOverdue(userId: string) {
    const now = new Date();

    const items = await this.prisma.reminder.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(await this.lensWhere(userId)),
        status: { notIn: [ReminderStatus.COMPLETED, ReminderStatus.DISMISSED] },
        dueDate: { lt: now },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
      } as any,
      orderBy: { dueDate: 'asc' },
      include: { recurring: true, category: true },
    });

    return items.map((item) => this._formatReminder(item));
  }

  private _calculateNextTrigger(params: {
    frequency: ReminderFrequency;
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
    startDate: Date;
    occurrences?: number;
    currentCount?: number;
  }): Date {
    const { frequency, interval = 1, startDate } = params;
    const baseDate = new Date(startDate);

    switch (frequency) {
      case ReminderFrequency.DAILY:
        return addDays(baseDate, interval);
      case ReminderFrequency.WEEKLY:
        return addWeeks(baseDate, interval);
      case ReminderFrequency.BIWEEKLY:
        return addWeeks(baseDate, 2 * interval);
      case ReminderFrequency.MONTHLY:
        return addMonths(baseDate, interval);
      case ReminderFrequency.QUARTERLY:
        return addMonths(baseDate, 3 * interval);
      case ReminderFrequency.YEARLY:
        return addYears(baseDate, interval);
      case ReminderFrequency.CUSTOM:
        if (params.daysOfWeek?.length) {
          return addDays(baseDate, 1);
        }
        if (params.dayOfMonth) {
          return addMonths(baseDate, 1);
        }
        return addDays(baseDate, interval);
      default:
        return addDays(baseDate, interval);
    }
  }

  private async _handleRecurrenceAfterCompletion(reminder: any) {
    const recurring = reminder.recurring;
    if (!recurring) {
      return;
    }

    const newCount = (recurring.count || 0) + 1;

    if (recurring.occurrences && newCount >= recurring.occurrences) {
      await this.prisma.recurringReminder.update({
        where: { reminderId: reminder.id },
        data: { count: newCount, isActive: false, nextTriggerAt: null } as any,
      });
      return;
    }

    if (recurring.endDate && isBefore(new Date(recurring.endDate), new Date())) {
      await this.prisma.recurringReminder.update({
        where: { reminderId: reminder.id },
        data: { count: newCount, isActive: false, nextTriggerAt: null } as any,
      });
      return;
    }

    const nextTriggerAt = this._calculateNextTrigger({
      frequency: recurring.frequency,
      interval: recurring.interval,
      daysOfWeek: recurring.daysOfWeek ? JSON.parse(recurring.daysOfWeek) : undefined,
      dayOfMonth: recurring.dayOfMonth,
      monthOfYear: recurring.monthOfYear,
      startDate: new Date(),
      currentCount: newCount,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.recurringReminder.update({
        where: { reminderId: reminder.id },
        data: {
          count: newCount,
          lastTriggeredAt: new Date(),
          nextTriggerAt,
        } as any,
      });

      const existing = await tx.reminder.findUnique({ where: { id: reminder.id } });

      if (existing && existing.isRecurring) {
        await tx.reminder.create({
          data: {
            userId: existing.userId,
            title: existing.title,
            description: existing.description,
            type: existing.type,
            priority: existing.priority,
            status: ReminderStatus.PENDING,
            remindAt: nextTriggerAt,
            startDate: nextTriggerAt,
            dueDate: existing.dueDate ? addDays(nextTriggerAt, 1) : null,
            isRecurring: true,
            lensId: existing.lensId,
            categoryId: existing.categoryId,
            metadata: existing.metadata as any,
          },
        });
      }
    });
  }

  private async _updateQuota(userId: string, resource: string, tx: any) {
    const today = new Date();
    const periodStart = startOfDay(today);
    const periodEnd = endOfDay(today);

    const quota = await tx.quotaTracking.findFirst({
      where: {
        userId,
        resource,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    });

    if (quota) {
      if (quota.used >= quota.limit) {
        throw new BadRequestException(`Quota exceeded for resource: ${resource}`);
      }
      await tx.quotaTracking.update({
        where: { id: quota.id },
        data: { used: { increment: 1 } },
      });
    } else {
      await tx.quotaTracking.create({
        data: {
          userId,
          resource,
          used: 1,
          limit: 100,
          periodStart,
          periodEnd,
        },
      });
    }
  }

  private _formatReminder(reminder: any) {
    if (!reminder) {
      return null;
    }

    let parsedDaysOfWeek: number[] | undefined;
    if (reminder.recurring?.daysOfWeek) {
      try {
        parsedDaysOfWeek =
          typeof reminder.recurring.daysOfWeek === 'string'
            ? JSON.parse(reminder.recurring.daysOfWeek)
            : reminder.recurring.daysOfWeek;
      } catch {
        parsedDaysOfWeek = undefined;
      }
    }

    return {
      ...reminder,
      recurring: reminder.recurring
        ? {
            ...reminder.recurring,
            daysOfWeek: parsedDaysOfWeek,
          }
        : undefined,
    };
  }
}
