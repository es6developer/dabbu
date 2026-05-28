import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

type GroupExpenseWithPaidBy = Prisma.GroupExpenseGetPayload<{ include: { paidBy: { include: { user: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } } } } } }>;
type GroupMemberWithUser = Prisma.GroupMemberGetPayload<{ include: { user: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } } } }>;
type SettlementWithMembers = Prisma.SettlementGetPayload<{ include: { fromMember: { include: { user: { select: { id: true; firstName: true; lastName: true } } } }; toMember: { include: { user: { select: { id: true; firstName: true; lastName: true } } } }; group: { select: { name: true } } } }>;

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. GROUP PERSONALITY ────────────────────────────────
  async getGroupPersonality(groupId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Group not found');

    const [expenses, settlements, memberRows] = await Promise.all([
      this.prisma.groupExpense.findMany({
        where: { groupId, deletedAt: null },
        include: { paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlement.findMany({
        where: { groupId, deletedAt: null },
        include: { fromMember: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, toMember: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, group: { select: { name: true } } },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId, isActive: true, deletedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      }),
    ]);

    const members = memberRows.map(m => ({ id: m.userId, name: `${m.user.firstName} ${m.user.lastName}`.trim(), avatar: m.user.avatarUrl || undefined }));
    const findName = (uid: string) => members.find(m => m.id === uid)?.name || 'Unknown';

    const expenseData = expenses.map(e => ({
      id: e.id, amount: Number(e.amount), description: e.description, category: e.category, date: e.date,
      paidBy: e.paidBy.user.id, paidByName: `${e.paidBy.user.firstName} ${e.paidBy.user.lastName}`.trim(),
    }));

    const memberTotals = new Map<string, { total: number; count: number }>();
    for (const e of expenseData) {
      const d = memberTotals.get(e.paidBy) || { total: 0, count: 0 };
      d.total += e.amount; d.count++; memberTotals.set(e.paidBy, d);
    }
    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    const topSpender = sorted[0] ? { name: findName(sorted[0][0]), amount: sorted[0][1].total } : { name: 'No one', amount: 0 };

    const payerCount = new Map<string, number>();
    for (const s of settlements) payerCount.set(s.fromMember.user.id, (payerCount.get(s.fromMember.user.id) || 0) + 1);
    const fpArr = [...payerCount.entries()].sort((a, b) => b[1] - a[1]);
    const fastestPayer = fpArr[0] ? { name: findName(fpArr[0][0]), avgSettlementDays: 1 } : { name: 'N/A', avgSettlementDays: 0 };

    const expenseCount = new Map<string, number>();
    for (const e of expenseData) expenseCount.set(e.paidBy, (expenseCount.get(e.paidBy) || 0) + 1);
    const maArr = [...expenseCount.entries()].sort((a, b) => b[1] - a[1]);
    const mostActive = maArr[0] ? { name: findName(maArr[0][0]), expenseCount: maArr[0][1] } : { name: 'No one', expenseCount: 0 };

    const generosities = members.map(m => {
      const me = expenseData.filter(e => e.paidBy === m.id);
      return { name: m.name, timesPaid: me.length, totalAmount: me.reduce((s, e) => s + e.amount, 0) };
    }).filter(g => g.timesPaid > 0).sort((a, b) => b.timesPaid - a.timesPaid);
    const mostGenerous = generosities[0] || { name: 'No one', timesPaid: 0, totalAmount: 0 };

    const fuelMap = new Map<string, number>();
    for (const e of expenseData) {
      if (e.description?.toLowerCase().includes('fuel') || e.category?.toLowerCase().includes('fuel'))
        fuelMap.set(e.paidBy, (fuelMap.get(e.paidBy) || 0) + e.amount);
    }
    const fuelArr = [...fuelMap.entries()].sort((a, b) => b[1] - a[1]);

    const foodMap = new Map<string, number>();
    for (const e of expenseData) {
      if (e.description?.toLowerCase().includes('food') || e.category?.toLowerCase().includes('food') || e.description?.toLowerCase().includes('pizza'))
        foodMap.set(e.paidBy, (foodMap.get(e.paidBy) || 0) + e.amount);
    }
    const foodArr = [...foodMap.entries()].sort((a, b) => b[1] - a[1]);

    const badges: any[] = [];
    for (const [mid, d] of memberTotals) {
      if (sorted[0]?.[0] === mid) badges.push({ memberId: mid, memberName: findName(mid), badge: { id: 'top_spender', name: 'Top Spender', emoji: '👑', description: 'Highest total spending', rarity: 'epic' } });
      if (d.count >= 10) badges.push({ memberId: mid, memberName: findName(mid), badge: { id: 'payment_machine', name: 'Payment Machine', emoji: '🏧', description: `Paid ${d.count} times`, rarity: 'rare' } });
    }
    if (fuelArr[0]) badges.push({ memberId: fuelArr[0][0], memberName: findName(fuelArr[0][0]), badge: { id: 'fuel_king', name: 'Fuel King', emoji: '⛽', description: `₹${fuelArr[0][1].toLocaleString()} on fuel`, rarity: 'rare' } });
    if (foodArr[0]) badges.push({ memberId: foodArr[0][0], memberName: findName(foodArr[0][0]), badge: { id: 'foodie', name: 'Foodie', emoji: '🍕', description: `₹${foodArr[0][1].toLocaleString()} on food`, rarity: 'common' } });

    return {
      groupId, groupName: group.name, type: group.type,
      topSpender, fastestPayer, mostGenerous, mostActive,
      fuelKing: fuelArr[0] ? { name: findName(fuelArr[0][0]), amount: fuelArr[0][1] } : undefined,
      foodLover: foodArr[0] ? { name: findName(foodArr[0][0]), amount: foodArr[0][1] } : undefined,
      badges, insights: this.insights(expenseData, members), funFacts: this.funFacts(expenseData, members), humor: this.humor(expenseData),
    };
  }

  // ─── 2. COUPLE HEALTH ────────────────────────────────────
  async getCoupleHealth(groupId: string) {
    const [profile, expenses, memberRows] = await Promise.all([
      this.prisma.coupleFinanceProfile.findUnique({ where: { groupId } }),
      this.prisma.groupExpense.findMany({
        where: { groupId, deletedAt: null },
        include: { paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId, isActive: true, deletedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);
    if (!profile || memberRows.length < 2) throw new Error('Couple profile not found');

    const a = memberRows[0], b = memberRows[1];
    const aSpent = expenses.filter(e => e.paidBy.user.id === a.userId).reduce((s, e) => s + Number(e.amount), 0);
    const bSpent = expenses.filter(e => e.paidBy.user.id === b.userId).reduce((s, e) => s + Number(e.amount), 0);
    const total = aSpent + bSpent;
    const aPct = total > 0 ? Math.round((aSpent / total) * 100) : 50;
    const bPct = 100 - aPct;
    const dev = Math.abs(aPct - 50);
    const compat = dev <= 10 ? 90 : dev <= 20 ? 70 : dev <= 30 ? 50 : 30;

    const monthlyMap = new Map<string, number>();
    for (const e of expenses) {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(e.amount));
    }
    const mv = [...monthlyMap.values()];
    const trend = mv.length >= 2 ? (mv[mv.length - 1] < mv[0] ? 'up' : mv[mv.length - 1] > mv[0] * 1.1 ? 'down' : 'stable') : 'stable';
    const score = Math.round((compat + (trend === 'up' ? 90 : trend === 'stable' ? 70 : 40)) / 2);
    const level = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs_attention';

    const recs: string[] = [];
    if (dev > 20) recs.push(`Spending gap: ${aPct}% vs ${bPct}%. Consider shared budget.`);
    if (trend === 'down') recs.push('Savings trending down.');
    if (score >= 80) recs.push('Great financial teamwork!');
    if (aSpent === 0 || bSpent === 0) recs.push('One partner handles all spending — consider sharing expenses.');

    return {
      score, level,
      contributionRatio: { partnerA: `${a.user.firstName} ${a.user.lastName}`.trim(), partnerB: `${b.user.firstName} ${b.user.lastName}`.trim(), ratio: `${aPct}:${bPct}` },
      savingsTrend: trend, spendingCompatibility: compat, recommendations: recs,
      monthlyComparison: {
        partnerA: { name: `${a.user.firstName} ${a.user.lastName}`.trim(), spent: aSpent, topCategory: this.topCategory(expenses.filter(e => e.paidBy.user.id === a.userId)) },
        partnerB: { name: `${b.user.firstName} ${b.user.lastName}`.trim(), spent: bSpent, topCategory: this.topCategory(expenses.filter(e => e.paidBy.user.id === b.userId)) },
        difference: Math.abs(aSpent - bSpent),
      },
    };
  }

  // ─── 3. SMART REMINDERS ─────────────────────────────────
  async getSettlementReminders(userId: string) {
    const groups = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { groupId: true },
    });
    const pending = await this.prisma.settlement.findMany({
      where: { groupId: { in: groups.map(g => g.groupId) }, status: 'pending', deletedAt: null },
      include: { fromMember: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, toMember: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, group: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return pending.map(s => {
      const days = Math.abs(Math.round((Date.now() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: s.id, fromId: s.fromMember.user.id, fromName: `${s.fromMember.user.firstName} ${s.fromMember.user.lastName}`.trim(),
        toId: s.toMember.user.id, toName: `${s.toMember.user.firstName} ${s.toMember.user.lastName}`.trim(),
        amount: Number(s.amount), daysOutstanding: days, groupName: s.group.name, groupId: s.groupId,
        type: days > 7 ? 'overdue' : 'pending',
        message: days > 7
          ? `⏰ ${s.fromMember.user.firstName} owes ${s.toMember.user.firstName} ₹${Number(s.amount).toLocaleString()} (${days} days!)`
          : `${s.fromMember.user.firstName} owes ${s.toMember.user.firstName} ₹${Number(s.amount).toLocaleString()}`,
      };
    });
  }

  // ─── 4. TRIP STORY ───────────────────────────────────────
  async getTripStory(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { group: { select: { name: true, id: true } } },
    });
    if (!trip) throw new Error('Trip not found');

    const [expenses, memberRows] = await Promise.all([
      this.prisma.groupExpense.findMany({
        where: { groupId: trip.groupId, deletedAt: null },
        include: { paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId: trip.groupId, isActive: true, deletedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    const members = memberRows.map(m => ({ id: m.userId, name: `${m.user.firstName} ${m.user.lastName}`.trim() }));
    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const catMap = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + Number(e.amount));
    }
    const categoryBreakdown = [...catMap.entries()].map(([c, a]) => ({ category: c, amount: a, percentage: totalSpent > 0 ? Math.round((a / totalSpent) * 100) : 0 })).sort((a, b) => b.amount - a.amount);

    const memMap = new Map<string, number>();
    for (const e of expenses) memMap.set(e.paidBy.user.id, (memMap.get(e.paidBy.user.id) || 0) + Number(e.amount));
    const top = [...memMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSpender = { name: top ? (members.find(m => m.id === top[0])?.name || 'Unknown') : 'No one', amount: top ? top[1] : 0 };

    const dayMap = new Map<string, { count: number; total: number }>();
    for (const e of expenses) {
      const day = e.date.toISOString().split('T')[0];
      const d = dayMap.get(day) || { count: 0, total: 0 };
      d.count++; d.total += Number(e.amount); dayMap.set(day, d);
    }
    const timeline = [...dayMap.entries()].map(([d, v]) => ({ day: d, expenseCount: v.count, total: v.total })).sort((a, b) => a.day.localeCompare(b.day));

    const ff = this.funFacts(expenses.map(e => ({ id: e.id, amount: Number(e.amount), description: e.description, category: e.category, date: e.date, paidBy: e.paidBy.user.id, paidByName: e.paidBy.user.firstName })), members);
    const foodTotal = expenses.filter(e => e.category?.toLowerCase().includes('food')).reduce((s, e) => s + Number(e.amount), 0);
    const fuelTotal = expenses.filter(e => e.category?.toLowerCase().includes('fuel') || e.description?.toLowerCase().includes('petrol')).reduce((s, e) => s + Number(e.amount), 0);
    const accomTotal = expenses.filter(e => e.category?.toLowerCase().includes('hotel') || e.category?.toLowerCase().includes('stay')).reduce((s, e) => s + Number(e.amount), 0);

    return { tripId, tripName: trip.group.name, totalSpent, totalDays: timeline.length, categoryBreakdown, topSpender, funFact: ff[0] || 'Amazing trip!', timeline, highlights: ff.slice(0, 3), foodTotal, fuelTotal, accommodations: accomTotal };
  }

  // ─── 5. SUBSCRIPTION ANALYTICS ───────────────────────────
  async getSubscriptionAnalytics(groupId: string) {
    const subs = await this.prisma.sharedSubscription.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      include: { members: { include: { member: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } } }, paidBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
    });
    return subs.map(s => {
      const perPerson = Number(s.amount) / Math.max(s.members.length, 1);
      const days = Math.round((s.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        id: s.id, name: s.name, service: s.service, amount: Number(s.amount),
        billingCycle: s.billingCycle, perPerson, memberCount: s.members.length,
        nextBillingDate: s.nextBillingDate, daysUntilRenewal: days,
        status: days <= 3 ? 'due_soon' : 'active',
        paidBy: `${s.paidBy.user.firstName} ${s.paidBy.user.lastName}`.trim(),
        members: s.members.map(m => ({ id: m.member.user.id, name: `${m.member.user.firstName} ${m.member.user.lastName}`.trim(), share: Number(m.share) })),
      };
    });
  }

  // ─── 6. SMART ADD TO GROUP ──────────────────────────────
  async findMatchingGroups(description: string, amount: number, userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { group: { select: { id: true, name: true, type: true, expenses: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: 'desc' }, select: { amount: true } } } } },
    });
    const desc = description.toLowerCase();
    const patterns: [RegExp, string][] = [
      [/\b(petrol|fuel|shell|hp|indian oil)\b/i, 'fuel'],
      [/\b(zomato|swiggy|uber eats)\b/i, 'food'],
      [/\b(blinkit|zepto|instamart|big basket)\b/i, 'grocery'],
      [/\b(ola|uber|rapido)\b/i, 'travel'],
      [/\b(airbnb|booking|makemytrip|goibibo)\b/i, 'travel'],
      [/\b(netflix|prime|hotstar|spotify|jio cinema)\b/i, 'entertainment'],
    ];
    let matched = '';
    for (const [re, m] of patterns) { if (re.test(desc)) { matched = m; break; } }

    return memberships.map(m => {
      const g = m.group; let conf = 0; let reason = '';
      if (g.type === 'trip' && matched === 'travel') { conf = 0.8; reason = `Matches ${g.name} trip`; }
      else if (matched === 'entertainment') { conf = 0.6; reason = `Group ${g.name}`; }
      else if (matched === 'grocery') { conf = 0.5; reason = `Could be for ${g.name}`; }
      if (!conf) return null;
      if (g.expenses.some(e => Math.abs(Number(e.amount) - amount) / amount < 0.2)) conf = Math.min(conf + 0.15, 1);
      return { groupId: g.id, groupName: g.name, confidence: Math.round(conf * 100), reason, matchedMerchant: matched, matchedAmount: amount };
    }).filter(Boolean);
  }

  // ─── 7. LIFE EVENT ANALYTICS ────────────────────────────
  async getLifeEventAnalytics(eventId: string) {
    const event = await this.prisma.lifeEvent.findUnique({ where: { id: eventId }, include: { contributors: true, expenses: true } });
    if (!event) throw new Error('Event not found');
    const spent = event.expenses.reduce((s, e) => s + Number(e.amount), 0);
    const catBreak = new Map<string, number>();
    for (const e of event.expenses) catBreak.set(e.category, (catBreak.get(e.category) || 0) + Number(e.amount));
    return {
      id: event.id, eventType: event.eventType, eventName: event.eventName,
      totalBudget: event.totalBudget ? Number(event.totalBudget) : 0, totalSpent: spent,
      remaining: event.totalBudget ? Number(event.totalBudget) - spent : 0,
      contributors: event.contributors.map(c => ({ name: c.name, amount: Number(c.amount), role: c.role })),
      categoryBreakdown: [...catBreak.entries()].map(([c, a]) => ({ category: c, amount: a })),
      expenseCount: event.expenses.length,
      budgetUtilization: event.totalBudget ? Math.round((spent / Number(event.totalBudget)) * 100) : 0,
      timeline: event.expenses.sort((a, b) => a.date.getTime() - b.date.getTime()).map(e => ({ date: e.date, description: e.description, amount: Number(e.amount), category: e.category })),
    };
  }

  // ─── 8. TRUST SCORES ────────────────────────────────────
  async getTrustScores(groupId: string) {
    const [expenses, settlements, memberRows] = await Promise.all([
      this.prisma.groupExpense.findMany({ where: { groupId, deletedAt: null } }),
      this.prisma.settlement.findMany({ where: { groupId, deletedAt: null } }),
      this.prisma.groupMember.findMany({ where: { groupId, isActive: true, deletedAt: null }, include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } }),
    ]);

    return memberRows.map(m => {
      const mySets = settlements.filter(s => s.fromMemberId === m.id || s.toMemberId === m.id);
      const done = mySets.filter(s => s.status === 'completed').length;
      const rel = mySets.length > 0 ? Math.round((done / mySets.length) * 100) : 100;

      const myExp = expenses.filter(e => e.paidByMemberId === m.id);
      const avg = myExp.length > 0 ? myExp.reduce((s, e) => s + Number(e.amount), 0) / myExp.length : 0;
      const cons = myExp.filter(e => Math.abs(Number(e.amount) - avg) <= avg * 0.5).length;
      const contrib = myExp.length > 0 ? Math.round((cons / myExp.length) * 100) : 100;

      const asPayer = settlements.filter(s => s.fromMemberId === m.id);
      const avgDays = asPayer.length > 0 ? asPayer.reduce((sum, s) => sum + Math.abs(Math.round((Date.now() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24))), 0) / asPayer.length : 0;
      const speed = avgDays <= 1 ? 100 : avgDays <= 3 ? 80 : avgDays <= 7 ? 60 : avgDays <= 14 ? 40 : 20;
      const part = expenses.length > 0 ? Math.round((myExp.length / expenses.length) * 100) : 0;
      const score = Math.round((rel + contrib + speed + part) / 4);

      return { memberId: m.userId, memberName: `${m.user.firstName} ${m.user.lastName}`.trim(), avatarUrl: m.user.avatarUrl, score, settlementReliability: rel, contributionConsistency: contrib, reimbursementSpeed: speed, participationRate: part };
    }).sort((a, b) => b.score - a.score);
  }

  // ─── 9. MONTHLY REPORT ──────────────────────────────────
  async generateMonthlyReport(userId: string, month: number, year: number) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const txns = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end }, deletedAt: null },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const savings = income - expenses;

    const catBreak = new Map<string, number>();
    for (const t of txns) { if (t.type === 'expense') { const cat = t.category?.name || 'Other'; catBreak.set(cat, (catBreak.get(cat) || 0) + Number(t.amount)); } }
    const catBreakdown = [...catBreak.entries()].map(([c, a]) => ({ category: c, amount: a, percentage: expenses > 0 ? Math.round((a / expenses) * 100) : 0 })).sort((a, b) => b.amount - a.amount);

    const dayMap = new Map<string, number>();
    for (const t of txns) { if (t.type === 'expense') { const d = t.date.toISOString().split('T')[0]; dayMap.set(d, (dayMap.get(d) || 0) + Number(t.amount)); } }
    const topDay = [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const insights: string[] = [];
    if (savings < 0) insights.push('⚠️ Expenses exceeded income');
    else if (savings > income * 0.3) insights.push('🌟 Great savings rate!');
    else if (savings < income * 0.1) insights.push('💡 Try to increase savings');
    if (catBreakdown[0]) insights.push(`Most spent on ${catBreakdown[0].category}: ₹${catBreakdown[0].amount.toLocaleString()}`);

    return { month, year, totalIncome: income, totalExpenses: expenses, savings, savingsRate: income > 0 ? Math.round((savings / income) * 100) : 0, categoryBreakdown: catBreakdown, topSpendingDay: topDay ? { date: topDay[0], amount: topDay[1] } : null, transactionCount: txns.length, insights };
  }

  // ─── 10. STRESS DETECTION ───────────────────────────────
  async detectFinancialStress(userId: string) {
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const [txns, groups] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId, date: { gte: threeMonthsAgo }, deletedAt: null }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      this.prisma.groupMember.findMany({ where: { userId, isActive: true, deletedAt: null }, select: { groupId: true } }),
    ]);

    const pending = await this.prisma.settlement.findMany({
      where: { groupId: { in: groups.map(g => g.groupId) }, status: 'pending', deletedAt: null },
    });

    const indicators: any[] = [];
    const monthly = new Map<string, number>();
    for (const t of txns) { if (t.type === 'expense') { const k = `${t.date.getFullYear()}-${t.date.getMonth()}`; monthly.set(k, (monthly.get(k) || 0) + Number(t.amount)); } }
    const vals = [...monthly.values()];
    if (vals.length >= 2 && vals[vals.length - 1] > vals[0] * 1.3) indicators.push({ type: 'rising_spending', severity: 'moderate', description: 'Monthly spending is trending up', trend: 'worsening', recommendation: 'Review expense patterns' });

    if (pending.length >= 5) indicators.push({ type: 'repeated_borrowing', severity: 'high', description: `${pending.length} pending settlements`, trend: 'worsening', recommendation: 'Settle pending dues promptly' });

    const expenseTxns = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const incomeTxns = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    if (incomeTxns > 0 && expenseTxns > incomeTxns * 0.9) indicators.push({ type: 'reduced_savings', severity: 'high', description: 'Spending is 90%+ of income', trend: 'worsening', recommendation: 'Create a budget to increase savings' });

    return { indicators, healthScore: this.calcHealth(incomeTxns, expenseTxns, pending.length) };
  }

  // ─── 11. POLLS ──────────────────────────────────────────
  async createPoll(groupId: string, userId: string, question: string, options: string[], expiresInHours?: number) {
    return this.prisma.groupPoll.create({
      data: { groupId, question, createdBy: userId, expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : null, options: { create: options.map((t, i) => ({ text: t, sortOrder: i })) } },
      include: { options: true },
    });
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    const existing = await this.prisma.pollVote.findUnique({ where: { pollId_userId: { pollId, userId } } });
    if (existing) throw new Error('Already voted');
    await this.prisma.pollVote.create({ data: { pollId, optionId, userId } });
    return this.getPollResults(pollId);
  }

  async getPollResults(pollId: string) {
    const poll = await this.prisma.groupPoll.findUnique({
      where: { id: pollId },
      include: { options: { include: { _count: { select: { votes: true } } }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!poll) throw new Error('Poll not found');
    const total = poll.options.reduce((s, o) => s + o._count.votes, 0);
    return { ...poll, totalVotes: total, options: poll.options.map(o => ({ ...o, voteCount: o._count.votes, percentage: total > 0 ? Math.round((o._count.votes / total) * 100) : 0 })) };
  }

  // ─── 12. GROCERY ────────────────────────────────────────
  async createGroceryList(groupId: string, name: string, createdBy: string) {
    return this.prisma.sharedGroceryList.create({ data: { groupId, name, createdBy } });
  }

  async addGroceryItem(listId: string, name: string, quantity: number, unit: string, estimatedPrice?: number, category?: string, assignedTo?: string) {
    return this.prisma.groceryItem.create({ data: { listId, name, quantity, unit, estimatedPrice, category: category || 'other', assignedTo } });
  }

  async getGroceryAnalytics(groupId: string) {
    const lists = await this.prisma.sharedGroceryList.findMany({
      where: { groupId }, include: { items: true }, orderBy: { createdAt: 'desc' },
    });
    const est = lists.reduce((s, l) => s + (l.totalEstimated ? Number(l.totalEstimated) : 0), 0);
    const act = lists.reduce((s, l) => s + (l.totalActual ? Number(l.totalActual) : 0), 0);
    const purchased = lists.reduce((s, l) => s + l.items.filter(i => i.isPurchased).length, 0);
    const total = lists.reduce((s, l) => s + l.items.length, 0);
    const catMap = new Map<string, number>();
    for (const l of lists) for (const i of l.items) catMap.set(i.category, (catMap.get(i.category) || 0) + Number(i.actualPrice || i.estimatedPrice || 0));
    return { totalLists: lists.length, totalEstimated: est, totalActual: act, savings: est - act, purchaseRate: total > 0 ? Math.round((purchased / total) * 100) : 0, categoryBreakdown: [...catMap.entries()].map(([c, a]) => ({ category: c, amount: a })), lists: lists.map(l => ({ id: l.id, name: l.name, status: l.status, itemCount: l.items.length, purchasedCount: l.items.filter(i => i.isPurchased).length, totalEstimated: l.totalEstimated ? Number(l.totalEstimated) : 0, totalActual: l.totalActual ? Number(l.totalActual) : 0 })) };
  }

  // ─── 13. QR SPLIT ──────────────────────────────────────
  async createQRSplitSession(tableName: string, createdBy: string, groupId?: string, expiresInMinutes?: number) {
    return this.prisma.qRSplitSession.create({ data: { groupId, tableName, createdBy, expiresAt: expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000) : null } });
  }

  async joinQRSplit(sessionId: string, name: string) {
    return this.prisma.qRSplitParticipant.create({ data: { sessionId, name } });
  }

  async addQRSplitItem(sessionId: string, name: string, price: number, quantity?: number, assignedTo?: string) {
    return this.prisma.qRSplitItem.create({ data: { sessionId, name, price, quantity: quantity || 1, assignedTo } });
  }

  async settleQRSplit(sessionId: string) {
    const session = await this.prisma.qRSplitSession.findUnique({ where: { id: sessionId }, include: { items: true, participants: true } });
    if (!session) throw new Error('Session not found');
    const total = session.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    return this.prisma.qRSplitSession.update({ where: { id: sessionId }, data: { totalAmount: total, status: 'settled', settledAt: new Date() } });
  }

  // ─── 14. WRAPPED ────────────────────────────────────────
  async getYearlyWrapped(userId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const [txns, memberships, challenges] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId, date: { gte: start, lte: end }, deletedAt: null }, include: { category: { select: { name: true } } } }),
      this.prisma.groupMember.findMany({ where: { userId, isActive: true, deletedAt: null }, select: { groupId: true } }),
      this.prisma.challengeParticipant.findMany({ where: { userId }, include: { challenge: true } }),
    ]);

    const groups = await this.prisma.sharedFinanceGroup.findMany({ where: { id: { in: memberships.map(m => m.groupId) } } });
    const groupExpenses = await this.prisma.groupExpense.findMany({ where: { groupId: { in: memberships.map(m => m.groupId) }, deletedAt: null, date: { gte: start, lte: end } } });

    const spent = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const saved = income - spent;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = new Map<string, number>();
    for (const t of txns) { if (t.type === 'expense') { const k = `${t.date.getMonth()}`; monthMap.set(k, (monthMap.get(k) || 0) + Number(t.amount)); } }
    const topMonth = [...monthMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const savingsMap = new Map<string, number>();
    for (const t of txns) { const k = `${t.date.getMonth()}`; savingsMap.set(k, (savingsMap.get(k) || 0) + (t.type === 'income' ? Number(t.amount) : -Number(t.amount))); }
    const topSavings = [...savingsMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const catTotals = new Map<string, number>();
    for (const t of txns) { if (t.type === 'expense') { const cat = t.category?.name || 'Other'; catTotals.set(cat, (catTotals.get(cat) || 0) + Number(t.amount)); } }
    const topCat = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0];

    const foodTotal = txns.filter(t => (t.category?.name || '').toLowerCase().includes('food') && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const fuelTotal = txns.filter(t => (t.category?.name || '').toLowerCase().includes('fuel') && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    const settlements = await this.prisma.settlement.findMany({ where: { groupId: { in: memberships.map(m => m.groupId) }, deletedAt: null } });
    const done = settlements.filter(s => s.status === 'completed').length;
    const settleRate = settlements.length > 0 ? Math.round((done / settlements.length) * 100) : 0;

    const ff: string[] = [];
    if (foodTotal > 0) ff.push(`🍕 Spent ₹${foodTotal.toLocaleString()} on food`);
    if (fuelTotal > 0) ff.push(`⛽ ₹${fuelTotal.toLocaleString()} on fuel`);
    if (groupExpenses.length > 0) ff.push(`👥 Shared ${groupExpenses.length} expenses`);
    if (challenges.length > 0) ff.push(`🏆 Completed ${challenges.filter(c => c.bestStreak >= 7).length} challenges`);

    return { year, totalSpent: spent, totalSaved: saved, totalIncome: income, mostExpensiveMonth: topMonth ? { month: monthNames[parseInt(topMonth[0])] || 'N/A', amount: topMonth[1] } : { month: 'N/A', amount: 0 }, topCategory: topCat ? { category: topCat[0], amount: topCat[1] } : { category: 'N/A', amount: 0 }, topSavingsMonth: topSavings ? { month: monthNames[parseInt(topSavings[0])] || 'N/A', amount: topSavings[1] } : { month: 'N/A', amount: 0 }, totalTrips: groups.filter(g => g.type === 'trip').length, totalGroups: memberships.length, badgesEarned: challenges.filter(c => c.bestStreak >= 7).length, financialGrowth: income > 0 ? Math.round((saved / income) * 100) : 0, settlementRate: settleRate, foodTotal, fuelTotal, funFacts: ff };
  }

  // ─── 15. FUNNY INSIGHTS ────────────────────────────────
  async getFunnyInsights(groupId: string) {
    const data = await this.getGroupPersonality(groupId);
    const humor: string[] = [];
    if (data.mostGenerous.timesPaid > 0) humor.push(`😅 ${data.mostGenerous.name} paid ${data.mostGenerous.timesPaid} times — MVP!`);
    humor.push(...data.funFacts.slice(0, 2));
    humor.push(...data.humor.slice(0, 2));

    const pending = await this.prisma.settlement.findMany({
      where: { groupId, status: 'pending', deletedAt: null },
      include: { fromMember: { include: { user: { select: { firstName: true } } } }, toMember: { include: { user: { select: { firstName: true } } } } },
      take: 3, orderBy: { createdAt: 'desc' },
    });
    for (const s of pending) humor.push(`😄 ${s.fromMember.user.firstName} still owes ${s.toMember.user.firstName} — from last time!`);
    return humor;
  }

  // ─── 16. MEMORIES ──────────────────────────────────────
  async generateMemories(userId: string) {
    const [expenses, trips, goals] = await Promise.all([
      this.prisma.groupExpense.findMany({
        where: { deletedAt: null },
        include: { paidBy: { include: { user: { select: { firstName: true, lastName: true } } } }, group: { select: { name: true, members: { where: { userId }, select: { id: true } } } } },
        orderBy: { date: 'desc' }, take: 50,
      }),
      this.prisma.trip.findMany({
        where: { group: { members: { some: { userId } } } },
        include: { group: { select: { name: true, members: { where: { userId }, select: { id: true } } } } },
        orderBy: { startDate: 'desc' }, take: 10,
      }),
      this.prisma.goal.findMany({ where: { userId, isCompleted: true }, orderBy: { completedAt: 'desc' }, take: 10 }),
    ]);

    const myExpenses = expenses.filter(e => e.group?.members?.length > 0);
    const myTrips = trips.filter(t => t.group?.members?.length > 0);

    const memories: any[] = [];
    for (const t of myTrips) memories.push({ id: `trip_${t.id}`, userId, type: 'trip', title: `${t.group.name} Trip`, description: `Destination: ${t.destination || 'A memorable trip'}`, emoji: '✈️', memoryDate: t.startDate });
    for (const e of myExpenses.filter(e => Number(e.amount) > 5000).slice(0, 5)) memories.push({ id: `expense_${e.id}`, userId, type: 'expense', title: `${e.description || 'Expense'} at ${e.group?.name || ''}`, description: `₹${Number(e.amount).toLocaleString()} — ${e.paidBy.user.firstName} paid`, emoji: '💸', amount: Number(e.amount), memoryDate: e.date });
    for (const g of goals) memories.push({ id: `milestone_${g.id}`, userId, type: 'milestone', title: `Goal: ${g.name}`, description: `Target ₹${Number(g.targetAmount).toLocaleString()} achieved!`, emoji: '🎯', memoryDate: g.completedAt || g.createdAt });

    for (const m of memories) {
      await this.prisma.memoryEntry.upsert({ where: { id: m.id }, update: {}, create: m }).catch(() => {});
    }
    return memories.sort((a, b) => new Date(b.memoryDate).getTime() - new Date(a.memoryDate).getTime());
  }

  // ─── 17. FINANCIAL HEALTH SCORE ─────────────────────────
  async getFinancialHealth(userId: string) {
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const [txns, groups] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId, date: { gte: threeMonthsAgo }, deletedAt: null } }),
      this.prisma.groupMember.findMany({ where: { userId, isActive: true, deletedAt: null }, select: { groupId: true } }),
    ]);
    const pending = await this.prisma.settlement.findMany({ where: { groupId: { in: groups.map(g => g.groupId) }, status: 'pending', deletedAt: null } });

    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const sr = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    const settleScore = pending.length === 0 ? 100 : Math.max(0, 100 - pending.length * 10);
    const budgetScore = income > 0 ? (expenses / income <= 0.5 ? 95 : expenses / income <= 0.7 ? 80 : expenses / income <= 0.9 ? 65 : expenses / income <= 1 ? 50 : 30) : 70;
    const savingsScore = sr >= 30 ? 95 : sr >= 20 ? 80 : sr >= 10 ? 60 : sr >= 0 ? 40 : 20;
    const amts = txns.filter(t => t.type === 'expense').map(t => Number(t.amount));
    const avg = amts.length > 0 ? amts.reduce((s, a) => s + a, 0) / amts.length : 0;
    const var_ = amts.length > 0 ? amts.reduce((s, a) => s + (a - avg) ** 2, 0) / amts.length : 0;
    const cv = avg > 0 ? Math.sqrt(var_) / avg : 0;
    const discScore = cv <= 0.5 ? 90 : cv <= 1 ? 70 : cv <= 1.5 ? 50 : 30;

    const overall = Math.round((budgetScore + settleScore + savingsScore + discScore) / 4);
    const stressLevel = overall < 40 ? 'high' : overall < 65 ? 'moderate' : 'low';
    const warnings: string[] = [];
    if (settleScore < 50) warnings.push('Settlement reliability is low');
    if (sr < 10) warnings.push('Savings rate is very low');
    if (expenses > income) warnings.push('Spending exceeds income');
    const recs: string[] = [];
    if (sr < 20) recs.push('Aim to save at least 20%');
    if (settleScore < 70) recs.push('Settle dues within 3 days');
    if (overall >= 80) recs.push('Great financial health!');
    return { overall, budgeting: budgetScore, settlement: settleScore, savings: savingsScore, discipline: discScore, stressLevel, warnings, recommendations: recs, savingsRate: sr };
  }

  // ─── 18. SAVINGS CHALLENGES ─────────────────────────────
  async getAvailableChallenges() {
    return this.prisma.savingsChallenge.findMany({
      where: { isActive: true, isPublic: true },
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async joinChallenge(challengeId: string, userId: string) {
    return this.prisma.challengeParticipant.create({ data: { challengeId, userId } }).catch(() => { throw new Error('Already joined or not found'); });
  }

  async completeChallengeDay(challengeId: string, userId: string, savingsAmount?: number) {
    const p = await this.prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId, userId } } });
    if (!p) throw new Error('Not a participant');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (p.lastCompletedAt) {
      const last = new Date(p.lastCompletedAt); last.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - last.getTime()) / 86400000);
      if (diff === 0) throw new Error('Already completed today');
      const streak = diff === 1 ? p.streak + 1 : 1;
      const skipped = diff > 1 ? p.skipped + diff - 1 : p.skipped;
      return this.prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId, userId } }, data: { dayCount: { increment: 1 }, streak, bestStreak: Math.max(p.bestStreak, streak), skipped, savingsAmount: { increment: savingsAmount || 0 }, completedToday: true, lastCompletedAt: new Date() } });
    }
    return this.prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId, userId } }, data: { dayCount: { increment: 1 }, streak: { increment: 1 }, bestStreak: 1, savingsAmount: { increment: savingsAmount || 0 }, completedToday: true, lastCompletedAt: new Date() } });
  }

  async getChallengeLeaderboard(challengeId: string) {
    return (await this.prisma.challengeParticipant.findMany({ where: { challengeId }, orderBy: [{ streak: 'desc' }, { savingsAmount: 'desc' }], take: 20 })).map((p, i) => ({ rank: i + 1, userId: p.userId, streak: p.streak, bestStreak: p.bestStreak, dayCount: p.dayCount, savingsAmount: Number(p.savingsAmount) }));
  }

  // ─── HELPERS ────────────────────────────────────────────
  private insights(data: { paidBy: string; amount: number }[], members: { id: string; name: string }[]): string[] {
    const r: string[] = [];
    const totals = new Map<string, number>();
    for (const d of data) totals.set(d.paidBy, (totals.get(d.paidBy) || 0) + d.amount);
    const s = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    if (s[0]) r.push(`${members.find(m => m.id === s[0][0])?.name || 'Someone'} spent the most — ₹${s[0][1].toLocaleString()}`);
    const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.amount, 0) / Math.max(members.length, 1)) : 0;
    if (avg > 0) r.push(`Average: ₹${avg.toLocaleString()}/person`);
    return r;
  }

  private funFacts(data: { paidBy: string; amount: number; description?: string; category?: string }[], members: { id: string; name: string }[]): string[] {
    const r: string[] = [];
    const totals = new Map<string, number>();
    for (const d of data) totals.set(d.paidBy, (totals.get(d.paidBy) || 0) + d.amount);
    const s = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    if (s.length > 1) r.push(`👑 ${members.find(m => m.id === s[0][0])?.name || 'Someone'} carried the team — ₹${s[0][1].toLocaleString()}`);
    const food = data.filter(d => d.category?.toLowerCase().includes('food'));
    if (food.length > 0) r.push(`🍕 Food total: ₹${food.reduce((s, d) => s + d.amount, 0).toLocaleString()}`);
    return r;
  }

  private humor(data: { date: Date }[]): string[] {
    const r: string[] = [];
    const midnight = data.filter(d => { const h = d.date.getHours(); return h >= 22 || h < 5; });
    if (midnight.length >= 2) r.push(`🌙 ${midnight.length} late-night purchases`);
    return r;
  }

  private topCategory(expenses: { category: string | null; amount: import('@prisma/client/runtime/library').Decimal }[]): string {
    const map = new Map<string, number>();
    for (const e of expenses) { const c = e.category || 'Other'; map.set(c, (map.get(c) || 0) + Number(e.amount)); }
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }

  private calcHealth(income: number, expenses: number, pending: number): number {
    let score = 70;
    if (income > 0) { const r = (income - expenses) / income; score += r >= 0.3 ? 20 : r >= 0.1 ? 10 : r >= 0 ? 0 : -20; }
    return Math.max(0, Math.min(100, score - Math.min(pending * 3, 30)));
  }
}
