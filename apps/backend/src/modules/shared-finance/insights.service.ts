import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface Insight {
  type: 'positive' | 'negative' | 'info' | 'warning';
  category: string;
  message: string;
  metric?: number;
  suggestion?: string;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getGroupInsights(groupId: string, userId: string, fromDate?: string, toDate?: string) {
    await this.validateGroupMember(groupId, userId);

    const dateFilter: any = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    const where: any = { groupId, deletedAt: null };
    if (fromDate || toDate) where.date = dateFilter;

    const [expenses, members, settlements, subscriptions, budgets] = await Promise.all([
      this.prisma.groupExpense.findMany({
        where,
        include: {
          paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          splits: true,
        },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId, isActive: true, deletedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      }),
      this.prisma.settlement.findMany({
        where: { groupId, status: 'pending', deletedAt: null },
        include: {
          fromMember: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          toMember: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.sharedSubscription.findMany({
        where: { groupId, deletedAt: null, isActive: true },
      }),
      this.prisma.sharedBudget.findMany({
        where: { groupId, isActive: true },
      }),
    ]);

    const insights: Insight[] = [];
    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

    insights.push(...this.generateMemberPaymentInsights(expenses, members, totalAmount));
    insights.push(...this.generateCategoryInsights(expenses, totalAmount));
    insights.push(...this.generateSettlementInsights(settlements));
    insights.push(...this.generateSubscriptionSavingsInsights(subscriptions, totalAmount));
    insights.push(...this.generateBudgetInsights(budgets, expenses));
    insights.push(...this.generateSpendingPatternInsights(expenses, members));
    insights.push(...this.generateAnomalyInsights(expenses, members));

    return {
      groupId,
      insights,
      summary: {
        totalExpenses: expenses.length,
        totalAmount,
        memberCount: members.length,
        pendingSettlements: settlements.length,
        activeSubscriptions: subscriptions.length,
      },
    };
  }

  async getTripInsights(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: {
          include: {
            expenses: {
              where: { deletedAt: null },
              include: {
                paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
                splits: true,
              },
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!trip) throw new ForbiddenException('Trip not found');
    await this.validateGroupMember(trip.groupId, userId);

    const insights: Insight[] = [];
    const allExpenses = trip.days.flatMap((d) => d.expenses);
    const totalAmount = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const dayCount = trip.days.length;
    const budget = Number(trip.budget) || 0;

    insights.push(...this.generateHotelCostInsights(allExpenses, totalAmount));
    insights.push(...this.generateFoodBudgetInsights(allExpenses, trip.days));
    insights.push(...this.generateDayGapInsights(trip.days, allExpenses));
    insights.push(...this.generatePerPersonDailyInsights(allExpenses, trip, userId));
    insights.push(...this.generateTripBudgetInsights(totalAmount, budget));

    return {
      tripId,
      destination: trip.destination,
      insights,
      summary: {
        totalExpenses: allExpenses.length,
        totalAmount,
        dayCount,
        budget,
        remaining: budget - totalAmount,
      },
    };
  }

  async getCoupleInsights(groupId: string, userId: string, fromDate?: string, toDate?: string) {
    await this.validateGroupMember(groupId, userId);

    const profile = await this.prisma.coupleFinanceProfile.findUnique({
      where: { groupId },
    });

    if (!profile) throw new ForbiddenException('Not a couple group');

    const dateFilter: any = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    const where: any = { groupId, deletedAt: null };
    if (fromDate || toDate) where.date = dateFilter;

    const expenses = await this.prisma.groupExpense.findMany({
      where,
      include: {
        paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        splits: {
          include: { member: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
        },
      },
    });

    const partners = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    const insights: Insight[] = [];

    const partner1 = partners.find((p) => p.id === profile.partner1Id);
    const partner2 = partners.find((p) => p.id === profile.partner2Id);

    if (!partner1 || !partner2) {
      throw new ForbiddenException('Partners not found');
    }

    insights.push(...this.generatePartnerSpendingInsights(expenses, partner1, partner2));
    insights.push(...this.generateIncomeRatioInsights(profile, expenses, partner1, partner2));
    insights.push(...this.generateSavingsGoalInsights(profile));
    const subInsights = await this.generateCoupleSubscriptionInsights(groupId);
    insights.push(...subInsights);

    return {
      groupId,
      partner1: { id: partner1.user.id, name: `${partner1.user.firstName} ${partner1.user.lastName}`.trim() },
      partner2: { id: partner2.user.id, name: `${partner2.user.firstName} ${partner2.user.lastName}`.trim() },
      insights,
      summary: {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((s, e) => s + Number(e.amount), 0),
        salary1: Number(profile.salary1) || 0,
        salary2: Number(profile.salary2) || 0,
        savingsGoal: Number(profile.sharedSavingsGoal) || 0,
        savingsCurrent: Number(profile.sharedSavingsCurrent) || 0,
      },
    };
  }

  // ─── Group Insights ──────────────────────────────────

  private generateMemberPaymentInsights(expenses: any[], members: any[], totalAmount: number): Insight[] {
    const insights: Insight[] = [];
    if (!expenses.length || !totalAmount) return insights;

    const payerMap = new Map<string, { name: string; total: number; count: number }>();
    for (const e of expenses) {
      const payerId = e.paidBy.userId;
      const name = `${e.paidBy.user.firstName} ${e.paidBy.user.lastName}`.trim();
      const curr = payerMap.get(payerId) || { name, total: 0, count: 0 };
      curr.total += Number(e.amount);
      curr.count += 1;
      payerMap.set(payerId, curr);
    }

    const topPayer = Array.from(payerMap.entries()).sort((a, b) => b[1].total - a[1].total)[0];
    if (topPayer) {
      const pct = this.roundTo((topPayer[1].total / totalAmount) * 100);
      insights.push({
        type: 'info',
        category: 'spending',
        message: `${topPayer[1].name} paid most expenses this period (${pct}% of total, ₹${Math.round(topPayer[1].total)})`,
        metric: pct,
        suggestion: pct > 50
          ? `Consider settling up with ${topPayer[1].name} to balance the books`
          : undefined,
      });
    }

    return insights;
  }

  private generateCategoryInsights(expenses: any[], totalAmount: number): Insight[] {
    const insights: Insight[] = [];
    if (!expenses.length) return insights;

    const categoryMap = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || 'other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(e.amount));
    }

    const topCategory = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const avgAmount = totalAmount / expenses.length;

    if (topCategory) {
      const pct = this.roundTo((topCategory[1] / totalAmount) * 100);
      insights.push({
        type: 'info',
        category: 'categories',
        message: `${topCategory[0]} spending is ₹${Math.round(topCategory[1])} (${pct}% of total)`,
        metric: pct,
        suggestion: pct > 40
          ? `Consider setting a budget for ${topCategory[0]} to control costs`
          : undefined,
      });
    }

    if (expenses.length > 5) {
      const foodTotal = categoryMap.get('food') || categoryMap.get('Food') || categoryMap.get('groceries') || 0;
      const foodPct = totalAmount > 0 ? this.roundTo((foodTotal / totalAmount) * 100) : 0;
      if (foodPct > 30) {
        insights.push({
          type: 'warning',
          category: 'food',
          message: `Food spending is ${foodPct}% of total (₹${Math.round(foodTotal)}), consider meal planning`,
          metric: foodPct,
          suggestion: 'Try cooking together or ordering in bulk to reduce costs',
        });
      }
    }

    return insights;
  }

  private generateSettlementInsights(settlements: any[]): Insight[] {
    const insights: Insight[] = [];

    if (settlements.length > 0) {
      insights.push({
        type: 'warning',
        category: 'settlements',
        message: `${settlements.length} pending settlement${settlements.length > 1 ? 's' : ''} need attention`,
        metric: settlements.length,
        suggestion: 'Settle up soon to avoid confusion and maintain trust',
      });
    }

    return insights;
  }

  private generateSubscriptionSavingsInsights(subscriptions: any[], totalAmount: number): Insight[] {
    const insights: Insight[] = [];

    if (subscriptions.length > 0) {
      const monthlySubCost = subscriptions.reduce((s, sub) => {
        const amt = Number(sub.amount);
        return s + (sub.billingCycle === 'yearly' ? amt / 12 : sub.billingCycle === 'quarterly' ? amt / 3 : amt);
      }, 0);

      insights.push({
        type: 'positive',
        category: 'subscriptions',
        message: `Group shares ${subscriptions.length} subscription${subscriptions.length > 1 ? 's' : ''} (₹${Math.round(monthlySubCost)}/mo total)`,
        metric: monthlySubCost,
        suggestion: 'Review subscriptions periodically to cancel unused ones',
      });
    }

    return insights;
  }

  private generateBudgetInsights(budgets: any[], expenses: any[]): Insight[] {
    const insights: Insight[] = [];

    for (const budget of budgets) {
      const spent = expenses
        .filter((e) => (e.category || 'other') === budget.category)
        .reduce((s, e) => s + Number(e.amount), 0);
      const pct = Number(budget.totalAmount) > 0 ? this.roundTo((spent / Number(budget.totalAmount)) * 100) : 0;

      if (pct > 100) {
        insights.push({
          type: 'negative',
          category: 'budget',
          message: `${budget.name} (${budget.category}) exceeded budget by ${this.roundTo(pct - 100)}%`,
          metric: pct,
          suggestion: 'Review expenses in this category and consider increasing the budget',
        });
      } else if (pct > 80) {
        insights.push({
          type: 'warning',
          category: 'budget',
          message: `${budget.name} (${budget.category}) is at ${pct}% of budget`,
          metric: pct,
          suggestion: 'Watch spending in this category to stay within budget',
        });
      }
    }

    return insights;
  }

  private generateSpendingPatternInsights(expenses: any[], members: any[]): Insight[] {
    const insights: Insight[] = [];
    if (expenses.length < 5) return insights;

    const monthly = new Map<string, number>();
    const monthlyCount = new Map<string, number>();

    for (const e of expenses) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      monthly.set(key, (monthly.get(key) || 0) + Number(e.amount));
      monthlyCount.set(key, (monthlyCount.get(key) || 0) + 1);
    }

    const sortedMonths = Array.from(monthly.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (sortedMonths.length >= 2) {
      const last = sortedMonths[sortedMonths.length - 1][1];
      const prev = sortedMonths[sortedMonths.length - 2][1];
      if (prev > 0) {
        const change = this.roundTo(((last - prev) / prev) * 100);
        if (Math.abs(change) > 20) {
          insights.push({
            type: change > 0 ? 'warning' : 'positive',
            category: 'trends',
            message: `Monthly spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}% compared to previous month`,
            metric: change,
            suggestion: change > 0
              ? 'Review recent expenses to identify what is driving costs up'
              : 'Good job reducing spending!',
          });
        }
      }
    }

    return insights;
  }

  private generateAnomalyInsights(expenses: any[], members: any[]): Insight[] {
    const insights: Insight[] = [];
    if (expenses.length < 3) return insights;

    const amounts = expenses.map((e) => Number(e.amount));
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, a) => s + (a - avg) ** 2, 0) / amounts.length);
    const threshold = avg + 2 * stdDev;

    const anomalies = expenses.filter((e) => Number(e.amount) > threshold);
    for (const anomaly of anomalies) {
      insights.push({
        type: 'warning',
        category: 'anomaly',
        message: `Large expense detected: ${anomaly.description} (₹${Math.round(Number(anomaly.amount))})`,
        metric: Number(anomaly.amount),
        suggestion: 'Verify this expense and ensure it was split correctly',
      });
    }

    return insights;
  }

  // ─── Trip Insights ───────────────────────────────────

  private generateHotelCostInsights(expenses: any[], totalAmount: number): Insight[] {
    const hotel = expenses.filter(
      (e) => e.category?.toLowerCase().includes('hotel') || e.category?.toLowerCase().includes('accommodation'),
    );
    const hotelTotal = hotel.reduce((s, e) => s + Number(e.amount), 0);

    if (totalAmount > 0 && hotelTotal > 0) {
      const pct = this.roundTo((hotelTotal / totalAmount) * 100);
      return [{
        type: pct > 50 ? 'warning' : 'info',
        category: 'accommodation',
        message: `Hotel costs are ${pct}% of total trip budget (₹${Math.round(hotelTotal)})`,
        metric: pct,
        suggestion: pct > 60 ? 'Consider budget accommodation or sharing rooms' : undefined,
      }];
    }

    return [];
  }

  private generateFoodBudgetInsights(expenses: any[], days: any[]): Insight[] {
    const food = expenses.filter(
      (e) => e.category?.toLowerCase().includes('food') || e.category?.toLowerCase().includes('meal'),
    );
    const foodTotal = food.reduce((s, e) => s + Number(e.amount), 0);
    const dayCount = days.length;

    if (dayCount > 0) {
      const perDay = this.roundTo(foodTotal / dayCount);
      const avgBudget = 1500;
      const exceeded = perDay - avgBudget;

      if (exceeded > 0) {
        return [{
          type: 'warning',
          category: 'food',
          message: `Food expenses exceeded daily budget by ₹${Math.round(exceeded)} (₹${perDay}/day vs ₹${avgBudget})`,
          metric: perDay,
          suggestion: 'Try local eateries or cook some meals to save on food costs',
        }];
      }
    }

    return [];
  }

  private generateDayGapInsights(days: any[], expenses: any[]): Insight[] {
    const insights: Insight[] = [];

    for (const day of days) {
      const dayExpenses = expenses.filter(
        (e) => e.tripDayId === day.id || e.date.toDateString() === day.date.toDateString(),
      );
      if (dayExpenses.length === 0) {
        const dateStr = day.date.toISOString().split('T')[0];
        insights.push({
          type: 'info',
          category: 'gaps',
          message: `${dateStr} has no expenses planned`,
          metric: 0,
          suggestion: 'Plan activities and budget for this day',
        });
      }
    }

    return insights;
  }

  private generatePerPersonDailyInsights(expenses: any[], trip: any, userId: string): Insight[] {
    const insights: Insight[] = [];

    const group = trip.groupId;
    const memberCount = new Set(expenses.map((e) => e.paidBy.userId)).size || 1;
    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const dayCount = trip.days.length || 1;

    const perPerson = this.roundTo(totalAmount / memberCount);
    const perDay = this.roundTo(perPerson / dayCount);

    if (perPerson > 0) {
      insights.push({
        type: 'info',
        category: 'per-person',
        message: `Per-person spend is ₹${perPerson} total (₹${perDay}/day)`,
        metric: perDay,
        suggestion: perDay > 5000
          ? 'Consider finding cheaper alternatives for meals and activities'
          : undefined,
      });
    }

    return insights;
  }

  private generateTripBudgetInsights(totalAmount: number, budget: number): Insight[] {
    if (!budget) return [];

    const pct = this.roundTo((totalAmount / budget) * 100);

    if (pct > 100) {
      return [{
        type: 'negative',
        category: 'budget',
        message: `Trip expenses exceeded budget by ${this.roundTo(pct - 100)}%`,
        metric: pct,
        suggestion: 'Track remaining expenses carefully to avoid overspending',
      }];
    }

    if (pct > 80) {
      return [{
        type: 'warning',
        category: 'budget',
        message: `Trip budget is at ${pct}% (₹${Math.round(totalAmount)} of ₹${Math.round(budget)})`,
        metric: pct,
        suggestion: 'You have limited budget remaining, spend wisely',
      }];
    }

    return [{
      type: 'positive',
      category: 'budget',
      message: `Trip is within budget at ${pct}% spent`,
      metric: pct,
    }];
  }

  // ─── Couple Insights ─────────────────────────────────

  private generatePartnerSpendingInsights(expenses: any[], partner1: any, partner2: any): Insight[] {
    const insights: Insight[] = [];

    const p1Total = expenses
      .filter((e) => e.paidBy.userId === partner1.user.id)
      .reduce((s, e) => s + Number(e.amount), 0);
    const p2Total = expenses
      .filter((e) => e.paidBy.userId === partner2.user.id)
      .reduce((s, e) => s + Number(e.amount), 0);

    const p1Name = `${partner1.user.firstName}`;
    const p2Name = `${partner2.user.firstName}`;

    if (p1Total > 0 || p2Total > 0) {
      const total = p1Total + p2Total;
      const p1Pct = total > 0 ? this.roundTo((p1Total / total) * 100) : 50;
      const p2Pct = total > 0 ? this.roundTo((p2Total / total) * 100) : 50;

      if (p1Pct > p2Pct + 10) {
        const diff = this.roundTo(((p1Total - p2Total) / p2Total) * 100);
        insights.push({
          type: 'info',
          category: 'spending balance',
          message: `${p1Name} spent ${diff}% more than ${p2Name} (₹${Math.round(p1Total)} vs ₹${Math.round(p2Total)})`,
          metric: diff,
          suggestion: 'Consider splitting major expenses more evenly going forward',
        });
      } else if (p2Pct > p1Pct + 10) {
        const diff = this.roundTo(((p2Total - p1Total) / p1Total) * 100);
        insights.push({
          type: 'info',
          category: 'spending balance',
          message: `${p2Name} spent ${diff}% more than ${p1Name} (₹${Math.round(p2Total)} vs ₹${Math.round(p1Total)})`,
          metric: diff,
          suggestion: 'Consider splitting major expenses more evenly going forward',
        });
      } else {
        insights.push({
          type: 'positive',
          category: 'spending balance',
          message: `Both partners have balanced spending (${p1Name}: ${p1Pct}%, ${p2Name}: ${p2Pct}%)`,
          metric: Math.abs(p1Pct - p2Pct),
        });
      }
    }

    return insights;
  }

  private generateIncomeRatioInsights(profile: any, expenses: any[], partner1: any, partner2: any): Insight[] {
    const insights: Insight[] = [];

    const salary1 = Number(profile.salary1) || 0;
    const salary2 = Number(profile.salary2) || 0;
    const totalSalary = salary1 + salary2;

    if (totalSalary > 0) {
      const ratio1 = this.roundTo((salary1 / totalSalary) * 100);
      const ratio2 = this.roundTo((salary2 / totalSalary) * 100);
      const p1Name = `${partner1.user.firstName}`;
      const p2Name = `${partner2.user.firstName}`;

      insights.push({
        type: 'info',
        category: 'income ratio',
        message: `Income ratio is ${ratio1}:${ratio2} (${p1Name}:${p2Name})`,
        metric: Math.abs(ratio1 - ratio2),
        suggestion: ratio1 > ratio2 + 20
          ? `Based on income ratio, ${p1Name} should contribute proportionally more to shared expenses`
          : ratio2 > ratio1 + 20
            ? `Based on income ratio, ${p2Name} should contribute proportionally more to shared expenses`
            : 'Income-based split is fairly balanced',
      });

      const p1Paid = expenses
        .filter((e) => e.paidBy.userId === partner1.user.id)
        .reduce((s, e) => s + Number(e.amount), 0);
      const p2Paid = expenses
        .filter((e) => e.paidBy.userId === partner2.user.id)
        .reduce((s, e) => s + Number(e.amount), 0);
      const totalPaid = p1Paid + p2Paid;
      const actualRatio1 = totalPaid > 0 ? this.roundTo((p1Paid / totalPaid) * 100) : 50;

      if (totalPaid > 0 && Math.abs(actualRatio1 - ratio1) > 10) {
        insights.push({
          type: 'warning',
          category: 'fairness',
          message: `Based on income ratio (${ratio1}:${ratio2}), ${p1Name} should contribute more (actual: ${actualRatio1}%)`,
          metric: Math.abs(actualRatio1 - ratio1),
          suggestion: 'Update your contribution rules to reflect income-based fair sharing',
        });
      }
    }

    return insights;
  }

  private generateSavingsGoalInsights(profile: any): Insight[] {
    const insights: Insight[] = [];

    const goal = Number(profile.sharedSavingsGoal) || 0;
    const current = Number(profile.sharedSavingsCurrent) || 0;

    if (goal > 0) {
      const pct = this.roundTo((current / goal) * 100);
      const remaining = goal - current;

      insights.push({
        type: pct >= 100 ? 'positive' : 'info',
        category: 'savings',
        message: `Shared savings goal is ${Math.min(pct, 100)}% complete (₹${Math.round(current)} of ₹${Math.round(goal)})`,
        metric: pct,
        suggestion: pct < 50
          ? `₹${Math.round(remaining)} remaining - consider increasing monthly contributions`
          : pct < 100
            ? `₹${Math.round(remaining)} more to reach your savings goal!`
            : 'Savings goal achieved! Set a new target.',
      });
    }

    return insights;
  }

  private async generateCoupleSubscriptionInsights(groupId: string): Promise< Insight[]> {
    const insights: Insight[] = [];

    const subscriptions = await this.prisma.sharedSubscription.findMany({
      where: { groupId, deletedAt: null, isActive: true },
    });

    const totalMonthly = subscriptions.reduce((s, sub) => {
      const amt = Number(sub.amount);
      return s + (sub.billingCycle === 'yearly' ? amt / 12 : sub.billingCycle === 'quarterly' ? amt / 3 : amt);
    }, 0);

    if (subscriptions.length > 1) {
      const possibleSaving = totalMonthly * 0.3;
      insights.push({
        type: 'info',
        category: 'subscriptions',
        message: `You have ${subscriptions.length} shared subscriptions (₹${Math.round(totalMonthly)}/mo)`,
        metric: totalMonthly,
        suggestion: possibleSaving > 100
          ? `Some subscriptions offer family plans. You could save ~₹${Math.round(possibleSaving)}/mo by consolidating`
          : 'Your subscriptions are reasonably priced',
      });
    }

    return insights;
  }

  // ─── Helpers ─────────────────────────────────────────

  private roundTo(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

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
