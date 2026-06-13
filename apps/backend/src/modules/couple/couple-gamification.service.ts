import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const XP_TABLE = {
  ADD_EXPENSE: 10,
  SETTLE_UP: 25,
  CREATE_GOAL: 50,
  CONTRIBUTE_GOAL: 15,
  COMPLETE_GOAL: 200,
  CREATE_PLANNER: 75,
  HIT_SAVINGS_TARGET: 100,
  SEVEN_DAY_STREAK: 50,
  ADD_INCOME: 10,
  PAY_BILL_ON_TIME: 20,
  DAILY_LOGIN: 5,
  ADD_BUDGET: 15,
  STAY_UNDER_BUDGET: 50,
  ADD_NET_WORTH: 30,
};

const LEVELS = [
  { level: 1, name: 'Bronze Couple', xpRequired: 0 },
  { level: 2, name: 'Silver Couple', xpRequired: 1000 },
  { level: 3, name: 'Gold Couple', xpRequired: 5000 },
  { level: 4, name: 'Platinum Couple', xpRequired: 20000 },
];

const ACHIEVEMENTS = [
  { code: 'first_goal', name: 'First Steps', description: 'Create your first goal', icon: 'flag' },
  {
    code: 'goal_crushers',
    name: 'Goal Crushers',
    description: 'Complete your first goal',
    icon: 'trophy',
  },
  {
    code: 'one_lakh_club',
    name: '₹1 Lakh Club',
    description: 'Save ₹1,00,000 together',
    icon: 'cash',
  },
  {
    code: 'no_missed_emi',
    name: 'No Missed EMI',
    description: '3 months of on-time EMI payments',
    icon: 'shield',
  },
  {
    code: 'half_year_strong',
    name: 'Half Year Strong',
    description: '6-month savings streak',
    icon: 'flame',
  },
  { code: 'planners', name: 'Planners', description: 'Create 2 financial planners', icon: 'map' },
  { code: 'baby_ready', name: 'Baby Ready', description: 'Complete baby planner', icon: 'heart' },
  { code: 'home_owners', name: 'Home Owners', description: 'Complete house planner', icon: 'home' },
  {
    code: 'centurions',
    name: 'Centurions',
    description: 'Achieve health score of 100',
    icon: 'star',
  },
  {
    code: 'power_couple',
    name: 'Power Couple',
    description: 'Reach Platinum level',
    icon: 'diamond',
  },
  {
    code: 'settle_up_champ',
    name: 'Settle Up Champ',
    description: 'Complete 50 settlements',
    icon: 'swap-horizontal',
  },
  {
    code: 'budget_masters',
    name: 'Budget Masters',
    description: 'Stay under budget 3 months straight',
    icon: 'pie-chart',
  },
];

@Injectable()
export class CoupleGamificationService {
  private readonly logger = new Logger(CoupleGamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getGamification(groupId: string) {
    const [level, planners, timelineEvents] = await Promise.all([
      this.getOrCreateLevel(groupId),
      this.prisma.couplePlanner.count({ where: { groupId } }),
      this.prisma.coupleTimelineEvent.count({ where: { groupId } }),
    ]);

    const currentLevel = LEVELS.find((l) => l.level === level.level) || LEVELS[0];
    const nextLevel = LEVELS.find((l) => l.level === level.level + 1);
    const xpProgress = nextLevel ? level.xp - currentLevel.xpRequired : level.xp;
    const xpRequired = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0;

    const earnedAchievements = await this.checkAchievements(groupId, level);
    const streak = await this.getStreak(groupId);

    return {
      level: currentLevel.name,
      levelNumber: level.level,
      xp: level.xp,
      xpProgress,
      xpRequired,
      healthScore: level.healthScore || 0,
      achievements: earnedAchievements,
      streak,
      nextLevel: nextLevel?.name || 'Max Level',
    };
  }

  async addXp(groupId: string, action: keyof typeof XP_TABLE) {
    const xpAmount = XP_TABLE[action];
    if (!xpAmount) {
      return;
    }

    const level = await this.getOrCreateLevel(groupId);
    const newXp = level.xp + xpAmount;

    let newLevelNumber = level.level;
    for (const l of LEVELS) {
      if (newXp >= l.xpRequired) {
        newLevelNumber = l.level;
      }
    }

    await this.prisma.coupleLevel.update({
      where: { id: level.id },
      data: { xp: newXp, level: newLevelNumber },
    });

    return { xpAdded: xpAmount, totalXp: newXp, newLevel: newLevelNumber !== level.level };
  }

  async updateHealthScore(groupId: string, score: number) {
    const level = await this.getOrCreateLevel(groupId);
    const newScore = Math.min(100, Math.max(0, score));
    await this.prisma.coupleLevel.update({
      where: { id: level.id },
      data: { healthScore: newScore },
    });
    return { healthScore: newScore };
  }

  private async getOrCreateLevel(groupId: string) {
    let level = await this.prisma.coupleLevel.findUnique({ where: { groupId } });
    if (!level) {
      level = await this.prisma.coupleLevel.create({
        data: { groupId, level: 1, xp: 0, healthScore: 0 },
      });
    }
    return level;
  }

  private async getStreak(groupId: string) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentEvents = await this.prisma.coupleTimelineEvent.findMany({
      where: { groupId, createdAt: { gte: oneWeekAgo } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const activeDays = new Set(recentEvents.map((e) => e.createdAt.toISOString().split('T')[0]))
      .size;

    return Math.min(activeDays, 7);
  }

  async checkAchievements(groupId: string, level?: any) {
    if (!level) {
      level = await this.getOrCreateLevel(groupId);
    }

    const earned: {
      code: string;
      name: string;
      description: string;
      icon: string;
      earnedAt: string;
      earned: boolean;
    }[] = [];

    const [goalCount, plannersCount, savingsTotal] = await Promise.all([
      this.prisma.sharedGoal.count({ where: { groupId } }),
      this.prisma.couplePlanner.count({ where: { groupId } }),
      this.prisma.coupleFinanceSaving.aggregate({ where: { groupId }, _sum: { amount: true } }),
    ]);

    const totalSavings = Number(savingsTotal._sum.amount || 0);

    for (const ach of ACHIEVEMENTS) {
      let earned_ = false;
      switch (ach.code) {
        case 'first_goal':
          earned_ = goalCount >= 1;
          break;
        case 'goal_crushers':
          earned_ = goalCount >= 3;
          break;
        case 'one_lakh_club':
          earned_ = totalSavings >= 100000;
          break;
        case 'planners':
          earned_ = plannersCount >= 2;
          break;
        case 'baby_ready':
          earned_ = plannersCount >= 1;
          break;
        case 'power_couple':
          earned_ = level.level >= 4;
          break;
        case 'centurions':
          earned_ = (level.healthScore || 0) >= 100;
          break;
        default:
          earned_ = false;
      }
      earned.push({ ...ach, earnedAt: earned_ ? new Date().toISOString() : '', earned: earned_ });
    }

    return earned;
  }
}
