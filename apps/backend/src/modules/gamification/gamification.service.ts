import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const DEFAULT_BADGES = [
  {
    code: 'first_expense',
    name: 'First Expense Tracked',
    description: 'Track your first expense',
    icon: 'cash',
    category: 'expense',
    tier: 'bronze',
    criteria: { type: 'expense_count', threshold: 1 },
  },
  {
    code: 'expense_50',
    name: 'Expense Tracker',
    description: 'Track 50 expenses',
    icon: 'receipt',
    category: 'expense',
    tier: 'silver',
    criteria: { type: 'expense_count', threshold: 50 },
  },
  {
    code: 'expense_500',
    name: 'Expense Master',
    description: 'Track 500 expenses',
    icon: 'star',
    category: 'expense',
    tier: 'gold',
    criteria: { type: 'expense_count', threshold: 500 },
  },
  {
    code: 'savings_1000',
    name: 'First ₹1,000 Saved',
    description: 'Save ₹1,000 towards goals',
    icon: 'piggy-bank',
    category: 'savings',
    tier: 'bronze',
    criteria: { type: 'total_savings', threshold: 1000 },
  },
  {
    code: 'savings_50000',
    name: 'Serious Saver',
    description: 'Save ₹50,000 towards goals',
    icon: 'wallet',
    category: 'savings',
    tier: 'gold',
    criteria: { type: 'total_savings', threshold: 50000 },
  },
  {
    code: 'savings_1lac',
    name: 'Savings Champion',
    description: 'Save ₹1,00,000 towards goals',
    icon: 'trophy',
    category: 'savings',
    tier: 'diamond',
    criteria: { type: 'total_savings', threshold: 100000 },
  },
  {
    code: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day tracking streak',
    icon: 'fire',
    category: 'streak',
    tier: 'bronze',
    criteria: { type: 'streak_daily', threshold: 7 },
  },
  {
    code: 'streak_30',
    name: 'Monthly Momentum',
    description: 'Maintain a 30-day tracking streak',
    icon: 'calendar',
    category: 'streak',
    tier: 'silver',
    criteria: { type: 'streak_daily', threshold: 30 },
  },
  {
    code: 'streak_100',
    name: 'Century Streak',
    description: 'Maintain a 100-day tracking streak',
    icon: 'award',
    category: 'streak',
    tier: 'gold',
    criteria: { type: 'streak_daily', threshold: 100 },
  },
  {
    code: 'streak_365',
    name: 'Year of Finance',
    description: 'Maintain a 365-day tracking streak',
    icon: 'crown',
    category: 'streak',
    tier: 'diamond',
    criteria: { type: 'streak_daily', threshold: 365 },
  },
  {
    code: 'goal_1',
    name: 'Goal Getter',
    description: 'Complete your first goal',
    icon: 'flag',
    category: 'goal',
    tier: 'bronze',
    criteria: { type: 'goal_completed', threshold: 1 },
  },
  {
    code: 'goal_10',
    name: 'Goal Crusher',
    description: 'Complete 10 goals',
    icon: 'target',
    category: 'goal',
    tier: 'gold',
    criteria: { type: 'goal_completed', threshold: 10 },
  },
  {
    code: 'bill_5',
    name: 'Bill Paymaster',
    description: 'Pay 5 bills on time',
    icon: 'document-text',
    category: 'bill',
    tier: 'bronze',
    criteria: { type: 'bill_paid', threshold: 5 },
  },
  {
    code: 'bill_50',
    name: 'Bill Champion',
    description: 'Pay 50 bills on time',
    icon: 'shield-checkmark',
    category: 'bill',
    tier: 'gold',
    criteria: { type: 'bill_paid', threshold: 50 },
  },
  {
    code: 'budget_3',
    name: 'Budget Master',
    description: 'Stay under budget for 3 months',
    icon: 'stats-chart',
    category: 'budget',
    tier: 'silver',
    criteria: { type: 'budget_streak_months', threshold: 3 },
  },
  {
    code: 'budget_12',
    name: 'Budget Guru',
    description: 'Stay under budget for 12 months',
    icon: 'trophy',
    category: 'budget',
    tier: 'diamond',
    criteria: { type: 'budget_streak_months', threshold: 12 },
  },
  {
    code: 'social_5',
    name: 'Social Spender',
    description: 'Join 5 shared expense groups',
    icon: 'people',
    category: 'social',
    tier: 'silver',
    criteria: { type: 'group_count', threshold: 5 },
  },
  {
    code: 'settlement_10',
    name: 'Settlement Star',
    description: 'Complete 10 settlements',
    icon: 'swap-horizontal',
    category: 'social',
    tier: 'gold',
    criteria: { type: 'settlement_count', threshold: 10 },
  },
  {
    code: 'welcome',
    name: 'Welcome to Dabbu',
    description: 'Create your account and start your financial journey',
    icon: 'heart',
    category: 'milestone',
    tier: 'bronze',
    criteria: { type: 'signup', threshold: 1 },
  },
  {
    code: 'first_budget',
    name: 'Budget Beginner',
    description: 'Create your first budget',
    icon: 'clipboard',
    category: 'budget',
    tier: 'bronze',
    criteria: { type: 'budget_count', threshold: 1 },
  },
];
  {
    code: 'first_goal',
    name: 'First Goal Completed',
    description: 'Complete your first financial goal',
    icon: 'flag',
    category: 'savings',
    tier: 'bronze',
    criteria: { type: 'goal_completed', threshold: 1 },
  },
  {
    code: 'tracking_30',
    name: '30 Days Tracking',
    description: 'Track your expenses for 30 consecutive days',
    icon: 'calendar',
    category: 'streak',
    tier: 'bronze',
    criteria: { type: 'streak_daily', threshold: 30 },
  },
  {
    code: 'savings_champion',
    name: 'Savings Champion',
    description: 'Save ₹10,000 in total across all goals',
    icon: 'trophy',
    category: 'savings',
    tier: 'silver',
    criteria: { type: 'total_savings', threshold: 10000 },
  },
  {
    code: 'budget_master',
    name: 'Budget Master',
    description: 'Stay under budget for 3 consecutive months',
    icon: 'stats-chart',
    category: 'expense',
    tier: 'silver',
    criteria: { type: 'budget_streak_months', threshold: 3 },
  },
];

@Injectable()
export class GamificationService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedBadges();
  }

  private async seedBadges() {
    for (const badge of DEFAULT_BADGES) {
      await this.prisma.badge.upsert({
        where: { code: badge.code },
        update: {},
        create: badge,
      });
    }
  }

  async getUserGamification(userId: string) {
    const [userBadges, streaks] = await Promise.all([
      this.prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: [{ isEarned: 'desc' }, { progress: 'desc' }],
      }),
      this.prisma.userStreak.findMany({
        where: { userId },
      }),
    ]);

    const allBadges = await this.prisma.badge.findMany({
      orderBy: { tier: 'asc' },
    });

    return {
      badges: userBadges,
      allBadges,
      streaks,
      earnedCount: userBadges.filter((b) => b.isEarned).length,
      totalBadges: allBadges.length,
    };
  }

  async checkAndAwardBadges(userId: string): Promise<{ awarded: string[]; progress: any[] }> {
    const awarded: string[] = [];
    const progressUpdates: any[] = [];

    const badges = await this.prisma.badge.findMany();
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
    });

    for (const badge of badges) {
      const existing = userBadges.find((ub) => ub.badgeId === badge.id);
      if (existing?.isEarned) {continue;}

      const criteria = badge.criteria as any;
      let currentProgress = existing?.progress?.toNumber() || 0;
      let earned = false;

      switch (criteria.type) {
        case 'goal_completed': {
          const count = await this.prisma.goal.count({
            where: { userId, isCompleted: true, deletedAt: null },
          });
          currentProgress = count;
          earned = count >= criteria.threshold;
          break;
        }
        case 'streak_daily': {
          const streak = await this.prisma.userStreak.findUnique({
            where: { userId_streakType: { userId, streakType: 'daily' } },
          });
          currentProgress = streak?.currentStreak || 0;
          earned = currentProgress >= criteria.threshold;
          break;
        }
        case 'total_savings': {
          const goals = await this.prisma.goal.findMany({
            where: { userId, deletedAt: null },
            select: { currentAmount: true },
          });
          const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
          currentProgress = totalSaved;
          earned = totalSaved >= criteria.threshold;
          break;
        }
        case 'budget_streak_months': {
          const bStreak = await this.prisma.userStreak.findUnique({
            where: { userId_streakType: { userId, streakType: 'monthly' } },
          });
          currentProgress = bStreak?.currentStreak || 0;
          earned = currentProgress >= criteria.threshold;
          break;
        }
        case 'expense_count': {
          const expCount = await this.prisma.transaction.count({
            where: { userId, type: 'expense', deletedAt: null },
          });
          currentProgress = expCount;
          earned = expCount >= criteria.threshold;
          break;
        }
        case 'bill_paid': {
          const billCount = await this.prisma.bill.count({
            where: { userId, isPaid: true, deletedAt: null },
          });
          currentProgress = billCount;
          earned = billCount >= criteria.threshold;
          break;
        }
        case 'group_count': {
          const groupCount = await this.prisma.sharedGroupMember.count({
            where: { userId },
          });
          currentProgress = groupCount;
          earned = groupCount >= criteria.threshold;
          break;
        }
        case 'settlement_count': {
          const settlementCount = await this.prisma.settlement.count({
            where: { payerId: userId, status: 'completed' },
          });
          currentProgress = settlementCount;
          earned = settlementCount >= criteria.threshold;
          break;
        }
        case 'signup': {
          currentProgress = 1;
          earned = true;
          break;
        }
        case 'budget_count': {
          const budgetCount = await this.prisma.budget.count({
            where: { userId, deletedAt: null },
          });
          currentProgress = budgetCount;
          earned = budgetCount >= criteria.threshold;
          break;
        }
      }

      if (existing) {
        await this.prisma.userBadge.update({
          where: { id: existing.id },
          data: {
            progress: currentProgress,
            ...(earned && !existing.isEarned ? { isEarned: true, earnedAt: new Date() } : {}),
          },
        });
      } else {
        await this.prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
            progress: currentProgress,
            isEarned: earned,
            ...(earned ? { earnedAt: new Date() } : {}),
          },
        });
      }

      if (earned) {awarded.push(badge.code);}
      progressUpdates.push({ code: badge.code, progress: currentProgress, earned });
    }

    return { awarded, progress: progressUpdates };
  }

  async trackStreak(userId: string, type: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const streak = await this.prisma.userStreak.findUnique({
      where: { userId_streakType: { userId, streakType: type } },
    });

    let isConsecutive = false;

    if (streak?.lastActivityAt) {
      const last = new Date(streak.lastActivityAt);
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

      if (type === 'daily') {isConsecutive = diffDays === 1 || diffDays === 0;}
      if (type === 'weekly') {isConsecutive = diffDays <= 7;}
      if (type === 'monthly') {isConsecutive = diffDays <= 31;}
    }

    if (!streak) {
      await this.prisma.userStreak.create({
        data: {
          userId,
          streakType: type,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityAt: now,
        },
      });
    } else if (isConsecutive) {
      const newStreak = streak.currentStreak + 1;
      await this.prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastActivityAt: now,
        },
      });
    } else if (!isConsecutive && streak.lastActivityAt) {
      const last = new Date(streak.lastActivityAt);
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        await this.prisma.userStreak.update({
          where: { id: streak.id },
          data: { currentStreak: 1, lastActivityAt: now },
        });
      }
    }

    return this.prisma.userStreak.findUnique({
      where: { userId_streakType: { userId, streakType: type } },
    });
  }

  async getAllBadges() {
    return this.prisma.badge.findMany({ orderBy: { tier: 'asc' } });
  }
}
