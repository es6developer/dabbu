import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  async sendRequest(userId: string, phone: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const digits = phone.replace(/\D/g, '').slice(-10);
    const receiver = await this.prisma.user.findFirst({
      where: { phone: { endsWith: digits }, isActive: true },
    });
    if (!receiver) {
      throw new NotFoundException('No user found with that phone number');
    }
    if (receiver.id === userId) {
      throw new BadRequestException('Cannot send request to yourself');
    }
    if (receiver.isCouple) {
      throw new ConflictException('This user is already in a couple');
    }

    const existing = await this.prisma.coupleRequest.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: receiver.id } },
    });
    if (existing && existing.status === 'pending') {
      throw new ConflictException('Request already sent. Waiting for approval.');
    }
    if (existing && existing.status === 'approved') {
      throw new ConflictException('You are already connected with this user');
    }

    const request = await this.prisma.coupleRequest.upsert({
      where: { senderId_receiverId: { senderId: userId, receiverId: receiver.id } },
      update: { status: 'pending' },
      create: { senderId: userId, receiverId: receiver.id, status: 'pending' },
    });

    this.notificationService
      ?.sendPush(receiver.id, 'Couple Request', `${user.firstName} wants to connect with you!`, {
        type: 'couple_request',
        requestId: request.id,
      })
      ?.catch(() => {});

    return {
      message: 'Couple request sent! Waiting for approval.',
      receiver: {
        id: receiver.id,
        firstName: receiver.firstName,
        lastName: receiver.lastName,
        phone: receiver.phone,
      },
    };
  }

  async approveRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, isCouple: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, isCouple: true } },
      },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.receiverId !== userId) {
      throw new BadRequestException('This request was not sent to you');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }
    if (request.sender.isCouple || request.receiver.isCouple) {
      throw new ConflictException('One of the users is already in a couple');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.coupleRequest.update({ where: { id: requestId }, data: { status: 'approved' } });

      await tx.user.update({
        where: { id: request.senderId },
        data: {
          partnerId: request.receiverId,
          isCouple: true,
          isCoupleMode: true,
          partnerLinkedAt: now,
        },
      });
      await tx.user.update({
        where: { id: request.receiverId },
        data: {
          partnerId: request.senderId,
          isCouple: true,
          isCoupleMode: true,
          partnerLinkedAt: now,
        },
      });

      const existing = await (tx as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: request.senderId, partner2Id: request.receiverId },
            { partner1Id: request.receiverId, partner2Id: request.senderId },
          ],
        },
      });
      if (!existing) {
        await (tx as any).couple.create({
          data: {
            partner1Id: request.senderId,
            partner2Id: request.receiverId,
            status: 'active',
            linkedAt: now,
          },
        });
      }
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isCouple: true,
        isCoupleMode: true,
        partnerLinkedAt: true,
        partner: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    this.notificationService
      ?.sendPush(
        request.senderId,
        'Request Approved',
        `${request.receiver.firstName} accepted your couple request!`,
        { type: 'couple_approved', screen: 'Dashboard' },
      )
      ?.catch(() => {});

    return { message: 'You are now connected!', user: updatedUser };
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.receiverId !== userId) {
      throw new BadRequestException('This request was not sent to you');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }
    await this.prisma.coupleRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });
    return { message: 'Request rejected' };
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.senderId !== userId) {
      throw new BadRequestException('You can only cancel your own requests');
    }
    await this.prisma.coupleRequest.delete({ where: { id: requestId } });
    return { message: 'Request cancelled' };
  }

  async listRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.coupleRequest.findMany({
        where: { senderId: userId },
        include: {
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupleRequest.findMany({
        where: { receiverId: userId },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { sent, received };
  }

  async toggleMode(userId: string, isCoupleMode: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, partnerId: true, isCouple: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isInCouple = user.isCouple || !!user.partnerId;
    if (!isInCouple) {
      const couple = await (this.prisma as any).couple.findFirst({
        where: {
          OR: [{ partner1Id: userId }, { partner2Id: userId }],
          status: 'active',
        },
      });
      if (!couple) {
        throw new BadRequestException('You are not in a couple');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isCouple: true, isCoupleMode },
      select: { id: true, isCouple: true, isCoupleMode: true },
    });
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isCouple: true,
        isCoupleMode: true,
        partnerLinkedAt: true,
        partner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isCoupleMode: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const couple = await (this.prisma as any).couple.findFirst({
      where: {
        OR: [{ partner1Id: userId }, { partner2Id: userId }],
        status: 'active',
      },
      select: { id: true, linkedAt: true, createdAt: true },
    });

    return { ...user, couple };
  }

  async removePartner(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCouple: true, partnerId: true },
    });
    if (!user || !user.isCouple || !user.partnerId) {
      throw new BadRequestException('You are not in a couple');
    }

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).couple.updateMany({
        where: {
          OR: [
            { partner1Id: userId, partner2Id: user.partnerId! },
            { partner1Id: user.partnerId!, partner2Id: userId },
          ],
        },
        data: { status: 'disconnected' },
      });
      await tx.user.update({
        where: { id: userId },
        data: { partnerId: null, isCouple: false, isCoupleMode: false, partnerLinkedAt: null },
      });
      await tx.user.update({
        where: { id: user.partnerId! },
        data: { partnerId: null, isCouple: false, isCoupleMode: false, partnerLinkedAt: null },
      });
    });

    return { message: 'Couple relationship removed' };
  }

  async createInviteCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invite = await this.prisma.coupleInviteCode.create({
      data: {
        senderId: userId,
        code,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    return { inviteCode: invite.code, expiresIn: '30 minutes' };
  }

  async joinWithCode(userId: string, code: string) {
    const invite = await this.prisma.coupleInviteCode.findFirst({
      where: { code: code.toUpperCase(), status: 'active', expiredAt: { gte: new Date() } },
    });
    if (!invite) {
      throw new BadRequestException('Invalid or expired invite code');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const sender = await this.prisma.user.findUnique({ where: { id: invite.senderId } });
    if (!sender || sender.isCouple) {
      throw new BadRequestException('Inviter is no longer available');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.coupleInviteCode.update({
        where: { id: invite.id },
        data: { status: 'used', usedById: userId, usedAt: now },
      });
      await tx.user.update({
        where: { id: invite.senderId },
        data: { partnerId: userId, isCouple: true, isCoupleMode: true, partnerLinkedAt: now },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          partnerId: invite.senderId,
          isCouple: true,
          isCoupleMode: true,
          partnerLinkedAt: now,
        },
      });

      const existing = await (tx as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: invite.senderId, partner2Id: userId },
            { partner1Id: userId, partner2Id: invite.senderId },
          ],
        },
      });
      if (!existing) {
        await (tx as any).couple.create({
          data: {
            partner1Id: invite.senderId,
            partner2Id: userId,
            status: 'active',
            linkedAt: now,
          },
        });
      }
    });

    return { message: 'Successfully joined couple space' };
  }

  async findCoupleGroup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isCouple: true,
        partnerId: true,
        partner: { select: { id: true, firstName: true } },
      },
    });
    if (!user?.partnerId) {
      throw new NotFoundException('Couple not found');
    }

    const couple = await (this.prisma as any).couple.findFirst({
      where: {
        OR: [
          { partner1Id: userId, partner2Id: user.partnerId },
          { partner1Id: user.partnerId, partner2Id: userId },
        ],
        status: 'active',
      },
    });

    if (!couple) {
      throw new NotFoundException('Couple not found');
    }

    return couple;
  }

  async getCoupleDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isCouple: true,
        isCoupleMode: true,
        partnerId: true,
        partnerLinkedAt: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
    if (!user?.partnerId) {
      throw new NotFoundException('Not in a couple');
    }

    const [partner, couple, coupleProfile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.partnerId },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      }),
      (this.prisma as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: userId, partner2Id: user.partnerId },
            { partner1Id: user.partnerId, partner2Id: userId },
          ],
          status: 'active',
        },
      }),
      (this.prisma as any).coupleFinanceProfile.findFirst({
        where: {
          OR: [
            { partner1Id: userId, partner2Id: user.partnerId },
            { partner1Id: user.partnerId, partner2Id: userId },
          ],
        },
        select: { groupId: true },
      }),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      partnerTransactions,
      userTransactions,
      partnerGoalsAgg,
      userGoalsAgg,
      userBills,
      sharedExpenses,
      coupleIncomes,
      userNetWorth,
      netWorthSnapshots,
      coupleLevel,
      planners,
      coupleIntelligence,
      userBadges,
      partnerGoalsList,
      userGoalsList,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId: user.partnerId, deletedAt: null, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.goal.aggregate({
        where: { userId: user.partnerId, deletedAt: null, isCompleted: false },
        _sum: { currentAmount: true, targetAmount: true },
      }),
      this.prisma.goal.aggregate({
        where: { userId, deletedAt: null, isCompleted: false },
        _sum: { currentAmount: true, targetAmount: true },
      }),
      this.prisma.bill.findMany({
        where: { userId, deletedAt: null, isPaid: false, dueDate: { gte: now } },
        take: 5,
        orderBy: { dueDate: 'asc' },
        select: { id: true, name: true, amount: true, dueDate: true, category: true },
      }),
      coupleProfile?.groupId
        ? this.prisma.sharedExpense.findMany({
            where: { groupId: coupleProfile.groupId, date: { gte: startOfMonth } },
            orderBy: { date: 'desc' },
            take: 20,
            select: {
              id: true,
              description: true,
              amount: true,
              paidBy: true,
              date: true,
              category: true,
            },
          })
        : Promise.resolve([]),
      coupleProfile?.groupId
        ? this.prisma.coupleFinanceIncome.findMany({
            where: { groupId: coupleProfile.groupId, date: { gte: startOfMonth } },
            orderBy: { date: 'desc' },
            take: 20,
            select: { id: true, source: true, amount: true, date: true, type: true },
          })
        : Promise.resolve([]),
      (this.prisma as any).userNetWorth.findUnique({
        where: { userId },
        select: {
          totalAssets: true,
          totalLiabilities: true,
          bank: true,
          cash: true,
          gold: true,
          property: true,
          investments: true,
          fixedDeposits: true,
          homeLoan: true,
          personalLoan: true,
          creditCardDebt: true,
          otherLiabilities: true,
        },
      }),
      (this.prisma as any).netWorthSnapshot.findMany({
        where: { userId },
        orderBy: { snapshotDate: 'asc' },
        take: 12,
        select: { snapshotDate: true, netWorth: true, totalAssets: true, totalLiabilities: true },
      }),
      coupleProfile?.groupId
        ? (this.prisma as any).coupleLevel.findUnique({ where: { groupId: coupleProfile.groupId } })
        : Promise.resolve(null),
      coupleProfile?.groupId
        ? (this.prisma as any).couplePlanner.findMany({
            where: { groupId: coupleProfile.groupId },
            orderBy: { startedAt: 'desc' },
          })
        : Promise.resolve([]),
      coupleProfile?.groupId
        ? (this.prisma as any).coupleIntelligence.findFirst({
            where: { coupleProfile: { groupId: coupleProfile.groupId } },
            orderBy: { computedAt: 'desc' },
          })
        : Promise.resolve(null),
      this.prisma.userBadge.findMany({
        where: { userId, isEarned: true },
        include: { badge: { select: { name: true, icon: true, tier: true } } },
      }),
      coupleProfile?.groupId
        ? this.prisma.goal.findMany({
            where: { userId: user.partnerId, deletedAt: null, isCompleted: false },
            select: {
              id: true,
              name: true,
              targetAmount: true,
              currentAmount: true,
              type: true,
              icon: true,
              color: true,
              deadline: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      coupleProfile?.groupId
        ? this.prisma.goal.findMany({
            where: { userId, deletedAt: null, isCompleted: false },
            select: {
              id: true,
              name: true,
              targetAmount: true,
              currentAmount: true,
              type: true,
              icon: true,
              color: true,
              deadline: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    const partnerAmount = Number(partnerTransactions._sum.amount || 0);
    const userAmount = Number(userTransactions._sum.amount || 0);
    const thisMonthTotal = partnerAmount + userAmount;
    const partnerGoalsProgress = Number(partnerGoalsAgg._sum.currentAmount || 0);
    const partnerGoalsTarget = Number(partnerGoalsAgg._sum.targetAmount || 0);
    const userGoalsProgress = Number(userGoalsAgg._sum.currentAmount || 0);
    const userGoalsTarget = Number(userGoalsAgg._sum.targetAmount || 0);

    const sharedTotalExpenses = (sharedExpenses as any[]).reduce(
      (s: number, e: any) => s + Number(e.amount),
      0,
    );
    const sharedTotalIncome = (coupleIncomes as any[]).reduce(
      (s: number, i: any) => s + Number(i.amount),
      0,
    );

    const healthScore = coupleLevel?.healthScore ?? 0;
    const achievementsCount = userBadges.length;
    const xpProgress = coupleLevel?.xp ?? 0;
    const xpRequired = (coupleLevel?.level ?? 1) * 200;
    const level = coupleLevel?.level ?? 1;
    const levelName =
      level >= 4 ? 'Platinum' : level >= 3 ? 'Gold' : level >= 2 ? 'Silver' : 'Bronze';

    const savingsAmount = sharedTotalIncome - sharedTotalExpenses;

    const lastMonthIncome = coupleProfile?.groupId
      ? await this.prisma.coupleFinanceIncome
          .aggregate({
            where: {
              groupId: coupleProfile.groupId,
              date: { gte: startOfLastMonth, lt: startOfMonth },
            },
            _sum: { amount: true },
          })
          .then((r) => Number(r._sum.amount || 0))
      : 0;
    const lastMonthExpenses = coupleProfile?.groupId
      ? await this.prisma.sharedExpense
          .aggregate({
            where: {
              groupId: coupleProfile.groupId,
              date: { gte: startOfLastMonth, lt: startOfMonth },
            },
            _sum: { amount: true },
          })
          .then((r) => Number(r._sum.amount || 0))
      : 0;
    const change =
      lastMonthExpenses > 0
        ? Math.round(((sharedTotalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
        : null;

    const assets =
      Number(userNetWorth?.totalAssets || 0) + Number((userNetWorth as any)?.totalAssets || 0);
    const liabilities = Number(userNetWorth?.totalLiabilities || 0);
    const partnerUserNetWorth = await (this.prisma as any).userNetWorth
      .findUnique({
        where: { userId: user.partnerId },
        select: { totalAssets: true, totalLiabilities: true },
      })
      .catch(() => null);
    const combinedAssets = assets + Number(partnerUserNetWorth?.totalAssets || 0);
    const combinedLiabilities = liabilities + Number(partnerUserNetWorth?.totalLiabilities || 0);

    const allGoals = [...partnerGoalsList, ...userGoalsList];
    const balanceAmount = Math.abs(partnerAmount - userAmount);

    const aiSummary = coupleIntelligence
      ? {
          text:
            (coupleIntelligence as any).recommendations?.[0] ||
            (coupleIntelligence as any).insights?.[0] ||
            null,
        }
      : null;

    return {
      user: { ...user, monthlySpent: userAmount, monthlyIncome: userAmount > 0 ? userAmount : 0 },
      partner: {
        ...partner,
        monthlySpent: partnerAmount,
        monthlyIncome: partnerAmount > 0 ? partnerAmount : 0,
      },
      couple: couple ? { id: couple.id, linkedAt: couple.linkedAt, status: couple.status } : null,
      groupId: coupleProfile?.groupId || null,
      totalMonthlySpent: thisMonthTotal,
      sharedMonthlyExpenses: sharedTotalExpenses,
      sharedMonthlyIncome: sharedTotalIncome,
      recentExpenses: sharedExpenses,
      recentIncomes: coupleIncomes,
      goalsProgress: partnerGoalsProgress + userGoalsProgress,
      goalsTarget: partnerGoalsTarget + userGoalsTarget,
      upcomingBills: userBills,
      partnerSince: user.partnerLinkedAt?.toISOString().split('T')[0] || null,
      togetherSince: user.partnerLinkedAt?.toISOString() || null,
      partners: {
        partner: {
          ...partner,
          monthlySpent: partnerAmount,
          monthlyIncome: partnerAmount > 0 ? partnerAmount : 0,
        },
      },
      healthScore,
      sharedBalance: { amount: balanceAmount },
      monthlySnapshot: {
        income: sharedTotalIncome,
        expenses: sharedTotalExpenses,
        savings: Math.max(0, savingsAmount),
        savingsRate:
          sharedTotalIncome > 0
            ? Math.round((Math.max(0, savingsAmount) / sharedTotalIncome) * 100)
            : 0,
        change,
      },
      netWorth: {
        total: combinedAssets - combinedLiabilities,
        assets: combinedAssets,
        liabilities: combinedLiabilities,
        trend: (netWorthSnapshots as any[]).map((s: any) => ({
          date: s.snapshotDate,
          netWorth: Number(s.netWorth || 0),
          assets: Number(s.totalAssets || 0),
          liabilities: Number(s.totalLiabilities || 0),
        })),
      },
      goals: allGoals.map((g: any) => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount || 0),
        currentAmount: Number(g.currentAmount || 0),
        type: g.type,
        icon: g.icon,
        color: g.color,
        deadline: g.deadline,
      })),
      planners: (planners as any[]).map((pl: any) => ({
        id: pl.id,
        plannerType: pl.plannerType,
        status: pl.status,
        targetAmount: Number(pl.targetAmount || 0),
        currentSavings: Number(pl.currentSavings || 0),
        monthlyTarget: pl.monthlyTarget ? Number(pl.monthlyTarget) : null,
        deadline: pl.deadline,
        title: pl.title,
        category: pl.category,
        icon: pl.icon,
      })),
      gamification: coupleLevel
        ? {
            level: levelName,
            xp: xpProgress,
            xpRequired,
            xpProgress,
            achievements: achievementsCount,
            achievementsCount,
            healthScore,
          }
        : null,
      aiSummary,
    };
  }

  private async findCoupleGroupId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    });
    if (!user?.partnerId) {
      return null;
    }
    const profile = await (this.prisma as any).coupleFinanceProfile.findFirst({
      where: {
        OR: [
          { partner1Id: userId, partner2Id: user.partnerId },
          { partner1Id: user.partnerId, partner2Id: userId },
        ],
      },
      select: { groupId: true },
    });
    return profile?.groupId || null;
  }

  async getPlanners(userId: string) {
    const groupId = await this.findCoupleGroupId(userId);
    if (!groupId) {
      return [];
    }
    const planners = await (this.prisma as any).couplePlanner.findMany({
      where: { groupId },
      orderBy: { startedAt: 'desc' },
    });
    return planners.map((pl: any) => ({
      id: pl.id,
      plannerType: pl.plannerType,
      status: pl.status,
      targetAmount: Number(pl.targetAmount || 0),
      currentSavings: Number(pl.currentSavings || 0),
    }));
  }

  async createPlanner(userId: string, type: string, body: any) {
    const groupId = await this.findCoupleGroupId(userId);
    if (!groupId) {
      throw new NotFoundException('Couple group not found');
    }
    const planner = await (this.prisma as any).couplePlanner.create({
      data: {
        groupId,
        plannerType: type.toUpperCase(),
        status: 'active',
        targetAmount: body.targetAmount || 0,
        title: body.title || type,
        category: body.category,
        icon: body.icon,
      },
    });
    return planner;
  }

  async contributeToPlanner(userId: string, id: string, body: any) {
    const planner = await (this.prisma as any).couplePlanner.findUnique({ where: { id } });
    if (!planner) {
      throw new NotFoundException('Planner not found');
    }
    const amount = Number(body.amount || 0);
    const updated = await (this.prisma as any).couplePlanner.update({
      where: { id },
      data: { currentSavings: Number(planner.currentSavings || 0) + amount },
    });
    return updated;
  }

  async getPlannerByType(userId: string, type: string) {
    const groupId = await this.findCoupleGroupId(userId);
    if (!groupId) {
      throw new NotFoundException('Couple group not found');
    }
    const planner = await (this.prisma as any).couplePlanner.findFirst({
      where: { groupId, plannerType: type.toUpperCase() },
    });
    return planner || null;
  }

  async getTimeline(userId: string) {
    const groupId = await this.findCoupleGroupId(userId);
    if (!groupId) {
      return [];
    }
    const events = await (this.prisma as any).coupleTimelineEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return events;
  }

  async getCoach(userId: string) {
    const groupId = await this.findCoupleGroupId(userId);
    if (!groupId) {
      return { insights: [] };
    }
    const intelligence = await (this.prisma as any).coupleIntelligence.findFirst({
      where: { coupleProfile: { groupId } },
      orderBy: { computedAt: 'desc' },
    });
    if (!intelligence) {
      return { insights: [] };
    }
    return {
      insights: (intelligence as any).insights || [],
      recommendations: (intelligence as any).recommendations || [],
      compatibilityScore: (intelligence as any).compatibilityScore || 0,
    };
  }

  async getGamification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    });
    if (!user?.partnerId) {
      return null;
    }

    const [coupleRecord, badges, streak, partnerBadges] = await Promise.all([
      (this.prisma as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: userId, partner2Id: user.partnerId },
            { partner1Id: user.partnerId, partner2Id: userId },
          ],
          status: 'active',
        },
      }),
      this.prisma.userBadge.findMany({
        where: { userId, isEarned: true },
        include: {
          badge: { select: { name: true, icon: true, tier: true, description: true, code: true } },
        },
        orderBy: { earnedAt: 'desc' },
      }),
      this.prisma.userStreak.findMany({ where: { userId }, orderBy: { streakType: 'asc' } }),
      this.prisma.userBadge.findMany({
        where: { userId: user.partnerId, isEarned: true },
        include: { badge: { select: { name: true, icon: true, tier: true } } },
        orderBy: { earnedAt: 'desc' },
        take: 10,
      }),
    ]);

    const coupleLevel = coupleRecord
      ? await (this.prisma as any).coupleLevel.findFirst({
          where: {
            OR: [{ groupId: { not: undefined } }],
          },
        })
      : null;

    const level = coupleLevel?.level ?? 1;
    const levelName =
      level >= 4 ? 'Platinum' : level >= 3 ? 'Gold' : level >= 2 ? 'Silver' : 'Bronze';

    return {
      level: levelName,
      xp: coupleLevel?.xp ?? 0,
      xpProgress: coupleLevel?.xp ?? 0,
      xpRequired: level * 200,
      achievements: badges.length,
      achievementsCount: badges.length,
      healthScore: coupleLevel?.healthScore ?? 0,
      badges: badges.map((b: any) => ({
        name: b.badge.name,
        icon: b.badge.icon,
        tier: b.badge.tier,
        description: b.badge.description,
      })),
      streaks: streak.map((s: any) => ({
        type: s.streakType,
        current: s.currentStreak,
        longest: s.longestStreak,
      })),
      partnerAchievements: partnerBadges.length,
    };
  }
}
