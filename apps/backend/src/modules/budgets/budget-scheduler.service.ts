import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BudgetsRepository } from './budgets.repository';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BudgetSchedulerService {
  private readonly logger = new Logger(BudgetSchedulerService.name);

  constructor(
    private readonly repo: BudgetsRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkBudgetThresholds() {
    this.logger.log('Checking budget thresholds...');

    const budgets = await this.prisma.budget.findMany({
      where: { deletedAt: null, isActive: true },
    });

    let alertsCreated = 0;

    for (const budget of budgets) {
      const amount = Number(budget.amount);
      const spent = Number(budget.spent);
      if (amount <= 0) {
        continue;
      }

      const percentage = Math.round((spent / amount) * 100);
      const threshold = budget.notifyAt ?? 80;

      if (percentage < threshold) {
        continue;
      }

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: budget.userId,
          type: 'budget_alert',
          title: { contains: budget.name },
          createdAt: { gte: new Date(Date.now() - 86400000 * 3) },
        },
      });
      if (existing) {
        continue;
      }

      const isExceeded = percentage >= 100;

      await this.prisma.notification.create({
        data: {
          userId: budget.userId,
          type: 'budget_alert',
          title: isExceeded ? 'Budget Exceeded' : 'Budget Alert',
          message: isExceeded
            ? `Your "${budget.name}" budget of ₹${amount.toLocaleString()} has been exceeded (${percentage}% used).`
            : `Your "${budget.name}" budget is at ${percentage}% (₹${spent.toLocaleString()} of ₹${amount.toLocaleString()}).`,
          data: { budgetId: budget.id, percentage, spent, amount },
          priority: isExceeded ? 'high' : 'medium',
        },
      });

      this.notificationService
        .sendPush(
          budget.userId,
          isExceeded ? 'Budget Exceeded' : 'Budget Alert',
          isExceeded
            ? `Your "${budget.name}" budget of ₹${amount.toLocaleString()} has been exceeded (${percentage}% used).`
            : `Your "${budget.name}" budget is at ${percentage}% (₹${spent.toLocaleString()} of ₹${amount.toLocaleString()}).`,
          { type: 'budget_alert', budgetId: budget.id, percentage, spent, amount },
        )
        .catch((err) => this.logger.error(`Push failed for budget alert: ${err.message}`));

      alertsCreated++;
    }

    if (alertsCreated > 0) {
      this.logger.log(`Created ${alertsCreated} budget alerts`);
    }
  }
}
