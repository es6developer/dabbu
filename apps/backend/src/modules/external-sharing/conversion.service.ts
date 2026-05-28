import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface TriggerResult {
  triggered: boolean;
  eventType: string;
  score: number;
  triggerData: Record<string, any>;
  bannerMessage: string;
  bannerPriority: number;
}

const BANNERS = [
  { message: 'Track all your personal expenses in Dabbu', priority: 10, triggerKey: 'settlement_amount' },
  { message: 'Unlock advanced analytics for your groups', priority: 20, triggerKey: 'participation_count' },
  { message: 'Get 1 month Premium FREE', priority: 30, triggerKey: 'group_count' },
  { message: 'You\'re a power user! Convert to permanent account', priority: 40, triggerKey: 'engagement_score' },
  { message: 'Import your split history instantly', priority: 50, triggerKey: 'trip_organizer' },
];

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(tempUserId: string) {
    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
      include: {
        groupMemberships: {
          include: {
            group: {
              include: {
                expenses: { select: { amount: true, paidByMemberId: true } },
                settlements: { select: { amount: true, fromMemberId: true, toMemberId: true, status: true } },
              },
            },
          },
        },
        conversionEvents: { select: { eventType: true } },
      },
    });

    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    if (tempUser.convertedToUserId) {
      return { converted: true, message: 'User already converted' };
    }

    const triggers = this.evaluateTriggers(tempUser);
    const activeTriggers = triggers.filter(t => t.triggered);
    activeTriggers.sort((a, b) => b.bannerPriority - a.bannerPriority);

    for (const trigger of activeTriggers) {
      const existingEvent = await this.prisma.conversionEvent.findFirst({
        where: { tempUserId, eventType: trigger.eventType },
      });

      if (!existingEvent) {
        await this.prisma.conversionEvent.create({
          data: {
            tempUserId,
            eventType: trigger.eventType,
            triggerData: trigger.triggerData,
            score: trigger.score,
          },
        });
      }
    }

    await this.prisma.tempUser.update({
      where: { id: tempUserId },
      data: {
        engagementScore: this.calculateEngagementScore(tempUser),
        lastActiveAt: new Date(),
      },
    });

    return {
      evaluated: true,
      triggerCount: activeTriggers.length,
      topTrigger: activeTriggers[0]?.eventType ?? null,
      score: this.calculateEngagementScore(tempUser),
    };
  }

  async getActiveTriggers(tempUserId: string) {
    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
      include: {
        groupMemberships: {
          include: {
            group: {
              include: {
                expenses: { select: { amount: true, paidByMemberId: true } },
                settlements: { select: { amount: true, status: true } },
              },
            },
          },
        },
      },
    });

    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    const triggers = this.evaluateTriggers(tempUser);
    return triggers.filter(t => t.triggered).map(t => ({
      eventType: t.eventType,
      score: t.score,
      bannerMessage: t.bannerMessage,
      bannerPriority: t.bannerPriority,
      triggerData: t.triggerData,
    }));
  }

  async logAction(tempUserId: string, eventType: string, response?: string, metadata?: Record<string, any>) {
    const tempUser = await this.prisma.tempUser.findUnique({ where: { id: tempUserId } });
    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    await this.prisma.conversionEvent.updateMany({
      where: { tempUserId, eventType, isActioned: false },
      data: {
        isActioned: true,
        actionedAt: new Date(),
        response: response ?? null,
      },
    });

    await this.prisma.tempUser.update({
      where: { id: tempUserId },
      data: { lastActiveAt: new Date() },
    });

    return { success: true };
  }

  async getPersonalizedBanners(tempUserId: string) {
    const triggers = await this.getActiveTriggers(tempUserId);

    const banners = triggers
      .filter(t => t.bannerPriority > 0)
      .sort((a, b) => b.bannerPriority - a.bannerPriority)
      .slice(0, 3)
      .map(t => ({
        message: t.bannerMessage,
        priority: t.bannerPriority,
        triggerType: t.eventType,
        score: t.score,
        ctaType: this.getCtaForTrigger(t.eventType),
      }));

    return banners;
  }

  async logOnboardingEvent(tempUserId: string, eventType: string, source?: string, metadata?: Record<string, any>) {
    const tempUser = await this.prisma.tempUser.findUnique({ where: { id: tempUserId } });
    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    const event = await this.prisma.onboardingEvent.create({
      data: {
        tempUserId,
        eventType,
        source: source ?? null,
        metadata: metadata ?? undefined,
      },
    });

    return event;
  }

  async mergeAccount(tempUserId: string, fullUserId: string) {
    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
      include: {
        groupMemberships: { where: { isActive: true } },
        conversionEvents: true,
        onboardingEvents: true,
        premiumTrials: { where: { status: 'active' } },
        referrerLinks: true,
        referralHistory: true,
        referredUsers: true,
        installEvents: true,
      },
    });

    if (!tempUser) {
      throw new NotFoundException('Temp user not found');
    }

    if (tempUser.convertedToUserId) {
      throw new ConflictException('Temp user already merged');
    }

    const fullUser = await this.prisma.user.findUnique({ where: { id: fullUserId } });
    if (!fullUser) {
      throw new NotFoundException('Full user not found');
    }

    const fullUserEmail = fullUser.email;
    const tempUserEmail = tempUser.email;

    if (tempUserEmail && tempUserEmail !== fullUserEmail) {
      this.logger.warn(`Identity mismatch: temp email ${tempUserEmail}, full email ${fullUserEmail}`);
    }

    for (const membership of tempUser.groupMemberships) {
      const existingMember = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: membership.groupId, userId: fullUserId } },
      });

      if (!existingMember) {
        await this.prisma.groupMember.create({
          data: {
            groupId: membership.groupId,
            userId: fullUserId,
            role: membership.role,
            nickname: membership.nickname,
            isActive: true,
            joinedAt: membership.joinedAt,
          },
        });
      }

      await this.prisma.groupMemberTemp.update({
        where: { id: membership.id },
        data: { isActive: false, leftAt: new Date() },
      });
    }

    for (const trial of tempUser.premiumTrials) {
      await this.prisma.premiumTrial.update({
        where: { id: trial.id },
        data: { userId: fullUserId, tempUserId: null },
      });
    }

    for (const link of tempUser.referrerLinks) {
      await this.prisma.referralLink.update({
        where: { id: link.id },
        data: { userId: fullUserId, tempUserId: null },
      });
    }

    for (const hist of tempUser.referralHistory) {
      await this.prisma.referralHistory.update({
        where: { id: hist.id },
        data: { referrerUserId: fullUserId, referrerTempId: null },
      });
    }

    for (const hist of tempUser.referredUsers) {
      await this.prisma.referralHistory.update({
        where: { id: hist.id },
        data: { referredUserId: fullUserId, referredTempId: null },
      });
    }

    const conversionData = {
      scores: { engagement: tempUser.engagementScore },
      triggers: tempUser.conversionEvents.map(e => e.eventType),
      groupCount: tempUser.groupCount,
      expenseCount: tempUser.expenseCount,
      totalSettlements: tempUser.totalSettlements?.toString() ?? '0',
    };

    await this.prisma.tempUser.update({
      where: { id: tempUserId },
      data: {
        convertedToUserId: fullUserId,
        convertedAt: new Date(),
        conversionMethod: 'signup',
        conversionData,
        isActive: false,
        sessionToken: null,
        refreshToken: null,
        sessionExpiresAt: null,
      },
    });

    this.logger.log(`Merged temp user ${tempUserId} into full user ${fullUserId}`);

    return {
      success: true,
      fullUserId,
      groupsTransferred: tempUser.groupMemberships.length,
      trialsTransferred: tempUser.premiumTrials.length,
    };
  }

  private evaluateTriggers(tempUser: any): TriggerResult[] {
    const results: TriggerResult[] = [];

    const totalSettlements = tempUser.groupMemberships.reduce((sum: number, m: any) => {
      const groupSettlements = m.group.settlements
        ?.filter((s: any) => s.status === 'completed')
        ?.reduce((s: number, st: any) => s + Number(st.amount), 0) ?? 0;
      return sum + groupSettlements;
    }, 0);

    const settlementTrigger: TriggerResult = {
      triggered: totalSettlements > 1000,
      eventType: 'settlement_threshold',
      score: totalSettlements > 5000 ? 90 : totalSettlements > 2000 ? 70 : 50,
      triggerData: { amount: totalSettlements, threshold: 1000 },
      bannerMessage: BANNERS[0].message,
      bannerPriority: totalSettlements > 5000 ? 50 : 30,
    };
    results.push(settlementTrigger);

    const participationCount = tempUser.groupMemberships.reduce((sum: number, m: any) => {
      return sum + (m.group.expenses?.length ?? 0);
    }, 0);

    const participationTrigger: TriggerResult = {
      triggered: participationCount > 3,
      eventType: 'multi_participation',
      score: participationCount > 10 ? 85 : participationCount > 6 ? 65 : 45,
      triggerData: { expenseCount: participationCount, threshold: 3 },
      bannerMessage: BANNERS[1].message,
      bannerPriority: participationCount > 10 ? 60 : 40,
    };
    results.push(participationTrigger);

    const groupTrigger: TriggerResult = {
      triggered: tempUser.groupCount > 1,
      eventType: 'multi_group',
      score: tempUser.groupCount > 3 ? 80 : 60,
      triggerData: { groupCount: tempUser.groupCount, threshold: 1 },
      bannerMessage: BANNERS[2].message,
      bannerPriority: tempUser.groupCount > 3 ? 70 : 45,
    };
    results.push(groupTrigger);

    const engagementScore = this.calculateEngagementScore(tempUser);
    const engagementTrigger: TriggerResult = {
      triggered: engagementScore > 60,
      eventType: 'high_engagement',
      score: engagementScore,
      triggerData: { engagementScore, threshold: 60 },
      bannerMessage: BANNERS[3].message,
      bannerPriority: engagementScore > 80 ? 80 : 55,
    };
    results.push(engagementTrigger);

    const organizedExpenses = tempUser.groupMemberships.reduce((sum: number, m: any) => {
      const paidCount = m.group.expenses?.filter((e: any) =>
        e.paidByMemberId === m.id
      )?.length ?? 0;
      return sum + paidCount;
    }, 0);

    const organizerTrigger: TriggerResult = {
      triggered: organizedExpenses > 2,
      eventType: 'trip_organizer',
      score: organizedExpenses > 10 ? 90 : organizedExpenses > 5 ? 75 : 50,
      triggerData: { expensesOrganized: organizedExpenses, threshold: 2 },
      bannerMessage: BANNERS[4].message,
      bannerPriority: organizedExpenses > 10 ? 90 : 60,
    };
    results.push(organizerTrigger);

    return results;
  }

  private calculateEngagementScore(tempUser: any): number {
    let score = 0;

    const recency = tempUser.lastActiveAt
      ? Math.max(0, Math.min(100, (Date.now() - new Date(tempUser.lastActiveAt).getTime()) / 86400000))
      : 30;

    if (recency < 1) score += 20;
    else if (recency < 3) score += 15;
    else if (recency < 7) score += 10;
    else score += 5;

    score += Math.min(tempUser.groupCount * 10, 30);

    const totalExpenses = tempUser.groupMemberships?.reduce((sum: number, m: any) =>
      sum + (m.group.expenses?.length ?? 0), 0) ?? 0;
    score += Math.min(totalExpenses * 2, 25);

    const completedSettlements = tempUser.groupMemberships?.reduce((sum: number, m: any) =>
      sum + (m.group.settlements?.filter((s: any) => s.status === 'completed')?.length ?? 0), 0) ?? 0;
    score += Math.min(completedSettlements * 3, 25);

    if (tempUser.email) score += 5;
    if (tempUser.phone) score += 5;
    if (tempUser.googleId) score += 5;

    return Math.min(score, 100);
  }

  private getCtaForTrigger(eventType: string): string {
    const ctas: Record<string, string> = {
      settlement_threshold: 'Track Personal Expenses',
      multi_participation: 'View Analytics',
      multi_group: 'Claim Free Premium',
      high_engagement: 'Create Account',
      trip_organizer: 'Import History',
    };
    return ctas[eventType] ?? 'Learn More';
  }
}
