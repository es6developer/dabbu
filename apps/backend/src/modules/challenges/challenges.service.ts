import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  async getChallenges(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [txns, goals, streak, savings] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, date: { gte: startOfMonth } },
        select: { amount: true, date: true, type: true },
      }),
      this.prisma.goal.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, currentAmount: true, targetAmount: true },
      }),
      this.prisma.userStreak.findUnique({
        where: { userId_streakType: { userId, streakType: 'daily' } },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: 'income', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    const monthlyIncome = Number(savings._sum.amount || 0);
    const monthlySpent = txns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const monthlySaved = Math.max(0, monthlyIncome - monthlySpent);
    const currentStreak = streak?.currentStreak || 0;
    const goalCount = goals.length;
    const goalProgress = goals.length > 0
      ? goals.reduce((s, g) => s + (Number(g.currentAmount) / Number(g.targetAmount)) * 100, 0) / goals.length
      : 0;

    const challenges = [
      {
        id: 'save_30_days',
        title: '30 Day Saving Challenge',
        description: 'Save money for 30 consecutive days',
        type: 'streak',
        progress: Math.min(currentStreak, 30),
        target: 30,
        completed: currentStreak >= 30,
        icon: '🔥',
      },
      {
        id: 'no_spend_weekend',
        title: 'No Spend Weekend',
        description: 'Track a weekend with zero expenses',
        type: 'weekly',
        progress: txns.filter((t) => t.date >= startOfWeek && t.type === 'expense').length === 0 ? 1 : 0,
        target: 1,
        completed: txns.filter((t) => t.date >= startOfWeek && t.type === 'expense').length === 0,
        icon: '💪',
      },
      {
        id: 'emergency_fund',
        title: 'Emergency Fund',
        description: 'Save 3 months of expenses as emergency fund',
        type: 'goal',
        progress: goals.find((g) => g.name.toLowerCase().includes('emergency'))
          ? Math.min(Math.round((Number(goals.find((g) => g.name.toLowerCase().includes('emergency'))!.currentAmount) / Number(goals.find((g) => g.name.toLowerCase().includes('emergency'))!.targetAmount)) * 100), 100)
          : 0,
        target: 100,
        completed: goals.some((g) => g.name.toLowerCase().includes('emergency') && Number(g.currentAmount) >= Number(g.targetAmount)),
        icon: '🛡️',
      },
      {
        id: 'save_this_month',
        title: 'Monthly Savings Challenge',
        description: 'Save 20% of your monthly income',
        type: 'savings',
        progress: monthlyIncome > 0 ? Math.min(Math.round((monthlySaved / monthlyIncome) * 100), 100) : 0,
        target: 20,
        completed: monthlyIncome > 0 && monthlySaved / monthlyIncome >= 0.2,
        icon: '💰',
      },
      {
        id: 'goal_master',
        title: 'Goal Crusher',
        description: 'Create and contribute to at least 3 goals',
        type: 'goals',
        progress: Math.min(goalCount, 3),
        target: 3,
        completed: goalCount >= 3,
        icon: '🏆',
      },
    ];

    return {
      active: challenges.filter((c) => !c.completed),
      completed: challenges.filter((c) => c.completed),
      all: challenges,
      totalCompleted: challenges.filter((c) => c.completed).length,
      totalActive: challenges.length,
    };
  }
}
