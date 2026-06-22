import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { GamificationService } from '../gamification/gamification.service';
import { NetWorthService } from '../net-worth/net-worth.service';
import { GoalsService } from '../goals/goals.service';
import { LoansRepository } from '../loans/loans.repository';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';

@Injectable()
export class WealthService {
  constructor(
    private readonly aiService: AiService,
    private readonly gamificationService: GamificationService,
    private readonly netWorthService: NetWorthService,
    private readonly goalsService: GoalsService,
    private readonly loansRepo: LoansRepository,
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async getDashboard(userId: string) {
    const lensFilter = await this.lensData.buildLensFilter(userId);
    const [healthScore, gamification, netWorth, goalStats, recentTxnCount, monthlyStats, loanLiabilities] =
      await Promise.all([
        this.aiService.computeHealthScore(userId).catch(() => null),
        this.gamificationService.getUserGamification(userId).catch(() => null),
        this.netWorthService.get(userId).catch(() => null),
        this.goalsService.getStats(userId).catch(() => null),
        this.prisma.transaction.count({
          where: { userId, ...lensFilter, deletedAt: null },
        }),
        this.getMonthlyStats(userId),
        this.loansRepo.getTotalLiability(userId).catch(() => ({ totalLoanAmount: 0, totalPaid: 0 })),
      ]);

    const insights = await this.aiService
      .generateInsights('dashboard', { userId })
      .catch(() => []);

    const milestones = await this.aiService
      .checkMilestones(userId)
      .catch(() => []);

    const streak = gamification?.streaks?.[0] || null;
    const badges = gamification?.badges || [];
    const allBadges = gamification?.allBadges || [];

    return {
      netWorth: netWorth
        ? {
            totalAssets: Number(netWorth.totalAssets || 0),
            totalLiabilities: Number(netWorth.totalLiabilities || 0),
            netWorth: Number(netWorth.netWorth || 0),
            snapshots: netWorth.snapshots || [],
          }
        : null,
      healthScore: healthScore || null,
      insights: Array.isArray(insights) ? insights : [],
      milestones: Array.isArray(milestones) ? milestones : [],
      streak: streak
        ? {
            type: streak.streakType,
            currentStreak: streak.currentStreak || 0,
            longestStreak: streak.longestStreak || 0,
            lastActivity: streak.lastActivityAt,
          }
        : null,
      achievements: {
        earned: badges.filter((b: any) => b.isEarned).map((b: any) => ({
          id: b.badge?.id || b.badgeId,
          code: b.badge?.code || '',
          name: b.badge?.name || '',
          description: b.badge?.description || '',
          icon: b.badge?.icon || '',
          tier: b.badge?.tier || '',
          earnedAt: b.earnedAt,
        })),
        all: allBadges.map((b: any) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          description: b.description,
          icon: b.icon,
          tier: b.tier,
        })),
        earnedCount: gamification?.earnedCount || 0,
        totalCount: gamification?.totalBadges || allBadges.length,
      },
      goals: goalStats
        ? {
            total: goalStats.total || 0,
            completed: goalStats.completed || 0,
            active: goalStats.active || 0,
            totalSaved: Number(goalStats.totalSaved || 0),
            totalTarget: Number(goalStats.totalTarget || 0),
            progress: goalStats.progress || 0,
          }
        : null,
      monthly: monthlyStats,
      totalTransactions: recentTxnCount,
      loanLiabilities: {
        totalLoanAmount: Number(loanLiabilities.totalLoanAmount || 0),
        totalPaid: Number(loanLiabilities.totalPaid || 0),
        outstandingDebt: Number(loanLiabilities.totalLoanAmount || 0) - Number(loanLiabilities.totalPaid || 0),
      },
    };
  }

  private async getMonthlyStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [thisMonth, lastMonth] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          ...lensFilter,
          deletedAt: null,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          ...lensFilter,
          deletedAt: null,
          date: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const thisAmt = Number(thisMonth._sum.amount || 0);
    const lastAmt = Number(lastMonth._sum.amount || 0);

    return {
      thisMonth: thisAmt,
      lastMonth: lastAmt,
      change: lastAmt > 0 ? ((thisAmt - lastAmt) / lastAmt) * 100 : 0,
    };
  }
}
