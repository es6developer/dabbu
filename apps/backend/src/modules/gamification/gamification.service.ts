import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const DEFAULT_BADGES = [
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
            select: { targetAmount: true, currentAmount: true },
          });
          const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
          currentProgress = totalSaved;
          earned = totalSaved >= criteria.threshold;
          break;
        }
        case 'budget_streak_months': {
          const streak = await this.prisma.userStreak.findUnique({
            where: { userId_streakType: { userId, streakType: 'monthly' } },
          });
          currentProgress = streak?.currentStreak || 0;
          earned = currentProgress >= criteria.threshold;
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
