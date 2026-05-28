import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTripDto, UpdateTripDto, CreateTripDayDto } from './dto/expenses.dto';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(groupId: string, userId: string, dto: CreateTripDto) {
    await this.validateGroupMember(groupId, userId);

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const existing = await this.prisma.trip.findUnique({ where: { groupId } });
    if (existing) {
      throw new BadRequestException('A trip already exists for this group');
    }

    const trip = await this.prisma.trip.create({
      data: {
        groupId,
        destination: dto.destination,
        description: dto.notes,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        budget: dto.budget || 0,
        status: 'planning',
      },
      include: {
        days: { orderBy: { date: 'asc' } },
      },
    });

    this.logger.log(`Trip created for group ${groupId}: ${dto.destination}`);
    return trip;
  }

  async findOne(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const trip = await this.prisma.trip.findUnique({
      where: { groupId },
      include: {
        days: {
          orderBy: { date: 'asc' },
          include: {
            expenses: {
              where: { deletedAt: null },
              include: {
                paidBy: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                  },
                },
                splits: {
                  include: {
                    member: {
                      include: {
                        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!trip) throw new NotFoundException('No trip found for this group');
    return trip;
  }

  async update(groupId: string, userId: string, dto: UpdateTripDto) {
    await this.validateGroupMember(groupId, userId);

    const trip = await this.prisma.trip.findUnique({ where: { groupId } });
    if (!trip) throw new NotFoundException('No trip found for this group');

    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const updated = await this.prisma.trip.update({
      where: { groupId },
      data: {
        destination: dto.destination,
        description: dto.notes,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
      },
      include: {
        days: { orderBy: { date: 'asc' } },
      },
    });

    this.logger.log(`Trip updated for group ${groupId}`);
    return updated;
  }

  async addDay(groupId: string, userId: string, dto: CreateTripDayDto) {
    await this.validateGroupMember(groupId, userId);

    const trip = await this.prisma.trip.findUnique({ where: { groupId } });
    if (!trip) throw new NotFoundException('No trip found for this group');

    const day = await this.prisma.tripDay.create({
      data: {
        tripId: trip.id,
        date: new Date(dto.date),
        notes: dto.notes,
      },
    });

    this.logger.log(`Trip day added for group ${groupId}: ${dto.date}`);
    return day;
  }

  async getDashboard(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const trip = await this.prisma.trip.findUnique({
      where: { groupId },
      include: {
        days: {
          orderBy: { date: 'asc' },
          include: {
            expenses: {
              where: { deletedAt: null },
              include: {
                paidBy: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                  },
                },
                splits: {
                  include: {
                    member: {
                      include: {
                        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!trip) throw new NotFoundException('No trip found for this group');

    const totalDays = trip.days.length;
    const allExpenses = trip.days.flatMap((d) => d.expenses);
    const totalSpent = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const budget = Number(trip.budget);
    const remaining = Math.max(0, budget - totalSpent);
    const dailyAvg = totalDays > 0 ? Math.round((totalSpent / totalDays) * 100) / 100 : 0;

    const categorySpend = new Map<string, number>();
    for (const exp of allExpenses) {
      categorySpend.set(exp.category, (categorySpend.get(exp.category) || 0) + Number(exp.amount));
    }

    const memberSpend = new Map<string, number>();
    for (const exp of allExpenses) {
      const userShare = Number(exp.amount) / exp.splits.length;
      for (const split of exp.splits) {
        memberSpend.set(split.memberId, (memberSpend.get(split.memberId) || 0) + userShare);
      }
    }

    const memberIds = [...memberSpend.keys()];
    const members = memberIds.length > 0 ? await this.prisma.groupMember.findMany({
      where: { id: { in: memberIds } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }) : [];
    const memberUserMap = new Map(members.map((m) => [m.id, m.user]));

    const dailySpend = trip.days.map((d) => {
      const dayTotal = d.expenses.reduce((s, e) => s + Number(e.amount), 0);
      return {
        date: d.date,
        notes: d.notes,
        total: dayTotal,
        expenseCount: d.expenses.length,
      };
    });

    return {
      trip: {
        id: trip.id,
        destination: trip.destination,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget,
        status: trip.status,
      },
      summary: {
        totalDays,
        totalSpent: Math.round(totalSpent * 100) / 100,
        remaining,
        dailyAverage: dailyAvg,
        budgetUtilization: budget > 0 ? Math.round((totalSpent / budget) * 10000) / 100 : 0,
        totalExpenses: allExpenses.length,
      },
      dailySpend,
      categoryBreakdown: Array.from(categorySpend.entries())
        .map(([category, total]) => ({
          category,
          total: Math.round(total * 100) / 100,
          percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      perPersonSpending: Array.from(memberSpend.entries())
        .map(([memberId, total]) => ({
          memberId,
          user: memberUserMap.get(memberId) || null,
          total: Math.round(total * 100) / 100,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  // ─── Helpers ───────────────────────────────────────

  private async validateGroupMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive || member.deletedAt) {
      throw new ForbiddenException('Not a group member');
    }
    return member;
  }
}
