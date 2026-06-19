import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface LifeEventPlan {
  title: string;
  monthlyTarget: number;
  totalEstimate: number;
  targetDate: Date;
  milestones: { label: string; targetPercent: number }[];
}

const EVENT_PLANS: Record<string, (events: any[]) => LifeEventPlan | null> = {
  HOUSE: (events) => {
    const spends = events.filter((t) =>
      ['Rent', 'Home', 'Maintenance', 'Real Estate'].some((c) =>
        (t.description || '').toLowerCase().includes(c.toLowerCase()),
      ),
    );
    const avgMonthly = spends.length > 0
      ? spends.reduce((s, t) => s + Number(t.amount), 0) / Math.max(spends.length, 1)
      : 50000;
    return {
      title: 'Buy a Home',
      monthlyTarget: Math.round(avgMonthly * 1.2),
      totalEstimate: Math.round(avgMonthly * 240),
      targetDate: new Date(Date.now() + 5 * 365 * 86400000),
      milestones: [
        { label: 'Research & Shortlist', targetPercent: 10 },
        { label: 'Down Payment Saved', targetPercent: 25 },
        { label: 'Loan Pre-Approval', targetPercent: 50 },
        { label: 'Final Purchase', targetPercent: 100 },
      ],
    };
  },
  BABY: () => ({
    title: 'Plan for Baby',
    monthlyTarget: 15000,
    totalEstimate: 500000,
    targetDate: new Date(Date.now() + 365 * 86400000),
    milestones: [
      { label: 'Medical Fund', targetPercent: 20 },
      { label: 'Nursery Setup', targetPercent: 35 },
      { label: 'Delivery Costs', targetPercent: 60 },
      { label: 'First Year Care', targetPercent: 100 },
    ],
  }),
  WEDDING: (events) => {
    const related = events.filter((t) =>
      ['Wedding', 'Jewelry', 'Venue'].some((c) =>
        (t.description || '').toLowerCase().includes(c.toLowerCase()),
      ),
    );
    const avg = related.length > 0
      ? related.reduce((s, t) => s + Number(t.amount), 0) / related.length
      : 250000;
    return {
      title: 'Plan Wedding',
      monthlyTarget: Math.round(avg / 12),
      totalEstimate: Math.round(avg * 4),
      targetDate: new Date(Date.now() + 2 * 365 * 86400000),
      milestones: [
        { label: 'Venue Booking', targetPercent: 20 },
        { label: 'Guest List Finalized', targetPercent: 40 },
        { label: 'Vendors Confirmed', targetPercent: 60 },
        { label: 'Wedding Day', targetPercent: 100 },
      ],
    };
  },
  CAR: (events) => {
    const fuelSpend = events.filter((t) =>
      ['Fuel', 'Petrol', 'Diesel', 'Car Service'].some((c) =>
        (t.description || '').toLowerCase().includes(c.toLowerCase()),
      ),
    );
    const avgMonthly = fuelSpend.length > 0
      ? fuelSpend.reduce((s, t) => s + Number(t.amount), 0) / Math.max(fuelSpend.length, 1)
      : 8000;
    return {
      title: 'Buy a Car',
      monthlyTarget: Math.round(avgMonthly * 2),
      totalEstimate: Math.round(avgMonthly * 100),
      targetDate: new Date(Date.now() + 3 * 365 * 86400000),
      milestones: [
        { label: 'Research Models', targetPercent: 10 },
        { label: 'Down Payment Ready', targetPercent: 30 },
        { label: 'Test Drive & Book', targetPercent: 60 },
        { label: 'Ownership', targetPercent: 100 },
      ],
    };
  },
  VACATION: (events) => {
    const travel = events.filter((t) =>
      ['Flight', 'Hotel', 'Trip', 'Travel', 'Holiday'].some((c) =>
        (t.description || '').toLowerCase().includes(c.toLowerCase()),
      ),
    );
    const avg = travel.length > 0
      ? travel.reduce((s, t) => s + Number(t.amount), 0) / travel.length
      : 50000;
    return {
      title: 'Plan Vacation',
      monthlyTarget: Math.round(avg / 6),
      totalEstimate: Math.round(avg * 1.5),
      targetDate: new Date(Date.now() + 365 * 86400000),
      milestones: [
        { label: 'Destination Decided', targetPercent: 15 },
        { label: 'Flights Booked', targetPercent: 40 },
        { label: 'Accommodation', targetPercent: 60 },
        { label: 'Trip Complete', targetPercent: 100 },
      ],
    };
  },
  EDUCATION: (events) => {
    const edu = events.filter((t) =>
      ['Course', 'Tuition', 'Fee', 'Education', 'University'].some((c) =>
        (t.description || '').toLowerCase().includes(c.toLowerCase()),
      ),
    );
    const avg = edu.length > 0
      ? edu.reduce((s, t) => s + Number(t.amount), 0) / edu.length
      : 100000;
    return {
      title: 'Education Fund',
      monthlyTarget: Math.round(avg / 12),
      totalEstimate: Math.round(avg * 3),
      targetDate: new Date(Date.now() + 3 * 365 * 86400000),
      milestones: [
        { label: 'Enrollment', targetPercent: 20 },
        { label: 'Year 1 Complete', targetPercent: 40 },
        { label: 'Year 2 Complete', targetPercent: 60 },
        { label: 'Graduation', targetPercent: 100 },
      ],
    };
  },
  RETIREMENT: (events) => {
    const income = events.filter((t) => t.type === 'income');
    const avgMonthlyIncome = income.length > 0
      ? income.reduce((s, t) => s + Number(t.amount), 0) / Math.max(income.length, 1)
      : 100000;
    return {
      title: 'Retirement Planning',
      monthlyTarget: Math.round(avgMonthlyIncome * 0.3),
      totalEstimate: Math.round(avgMonthlyIncome * 0.3 * 12 * 25),
      targetDate: new Date(Date.now() + 25 * 365 * 86400000),
      milestones: [
        { label: 'Emergency Fund', targetPercent: 10 },
        { label: 'Retirement Account', targetPercent: 30 },
        { label: 'Diversified Portfolio', targetPercent: 50 },
        { label: 'On Track', targetPercent: 100 },
      ],
    };
  },
  BUSINESS: (events) => ({
    title: 'Start Business',
    monthlyTarget: 50000,
    totalEstimate: 500000,
    targetDate: new Date(Date.now() + 2 * 365 * 86400000),
    milestones: [
      { label: 'Business Plan', targetPercent: 15 },
      { label: 'Registration', targetPercent: 30 },
      { label: 'Initial Investment', targetPercent: 50 },
      { label: 'Operational', targetPercent: 100 },
    ],
  }),
};

@Injectable()
export class LifeEventsService {
  private readonly logger = new Logger(LifeEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.lifeEvent.findMany({
      where: { userId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async create(
    data: { eventType: string; title: string; description?: string; eventDate?: string; spaceId?: string; source?: string },
    userId: string,
  ) {
    return this.prisma.lifeEvent.create({
      data: {
        userId,
        eventType: data.eventType,
        title: data.title,
        description: data.description || '',
        confidence: 100,
        source: data.source || 'user_created',
        spaceId: data.spaceId || null,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
      },
    });
  }

  async update(
    id: string,
    body: Partial<{ isConfirmed: boolean; isDismissed: boolean; title: string; description: string; eventDate: string }>,
    userId: string,
  ) {
    const existing = await this.prisma.lifeEvent.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Life event not found');

    return this.prisma.lifeEvent.update({
      where: { id },
      data: {
        ...(body.isConfirmed !== undefined && { isConfirmed: body.isConfirmed }),
        ...(body.isDismissed !== undefined && { isDismissed: body.isDismissed }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.eventDate !== undefined && { eventDate: new Date(body.eventDate) }),
      },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await this.prisma.lifeEvent.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Life event not found');

    await this.prisma.lifeEvent.delete({ where: { id } });
  }

  async timeline(userId: string) {
    const events = await this.prisma.lifeEvent.findMany({
      where: { userId },
      orderBy: { eventDate: 'asc' },
    });

    const grouped: Record<string, typeof events> = {};
    for (const event of events) {
      const month = event.eventDate
        ? `${event.eventDate.getFullYear()}-${String(event.eventDate.getMonth() + 1).padStart(2, '0')}`
        : 'unknown';
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(event);
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : a.localeCompare(b)))
      .map(([month, items]) => ({ month, items }));
  }

  async detectEvents(userId: string) {
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const existingEvents = await this.prisma.lifeEvent.findMany({
      where: { userId, source: 'ai_detected' },
    });
    const existingTypes = new Set(existingEvents.map((e) => e.eventType));

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: cutoff } },
      orderBy: { date: 'desc' },
    });

    if (transactions.length < 5) {
      return { detected: 0, message: 'Not enough transaction data for detection (need at least 5)' };
    }

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const avgMonthlyExpense = totalExpense / 3;
    const avgMonthlyIncome = totalIncome / 3;

    const descs = transactions.map((t) => (t.description || '').toLowerCase());
    const tags = transactions.flatMap((t) => {
      try {
        const parsed = typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags;
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch { return []; }
    });

    const detections: { type: string; confidence: number; title: string; description: string }[] = [];

    // Car detection: recurring fuel + service expenses
    if (!existingTypes.has('CAR')) {
      const fuelTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('fuel') || (t.description || '').toLowerCase().includes('petrol') || (t.description || '').toLowerCase().includes('diesel'),
      );
      const serviceTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('service') && (t.description || '').toLowerCase().includes('car'),
      );
      if (fuelTxns.length >= 3 || serviceTxns.length >= 1) {
        const confidence = Math.min(40 + fuelTxns.length * 10 + serviceTxns.length * 15, 90);
        detections.push({
          type: 'CAR',
          confidence,
          title: 'Car Ownership Detected',
          description: `Found ${fuelTxns.length} fuel purchases and ${serviceTxns.length} car service records. Consider planning for car upgrades or maintenance.`,
        });
      }
    }

    // Wedding detection: jewelry, venue, wedding planner
    if (!existingTypes.has('WEDDING')) {
      const weddingTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('wedding') || (t.description || '').toLowerCase().includes('jewelry') || (t.description || '').toLowerCase().includes('bridal'),
      );
      if (weddingTxns.length >= 1 || tags.some((t) => ['wedding', 'engagement'].includes(t))) {
        detections.push({
          type: 'WEDDING',
          confidence: Math.min(40 + weddingTxns.length * 20, 85),
          title: 'Wedding Planning',
          description: 'We detected wedding-related spending. Start planning your wedding budget and savings.',
        });
      }
    }

    // Baby detection: baby products, medical
    if (!existingTypes.has('BABY')) {
      const babyTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('baby') || (t.description || '').toLowerCase().includes('diaper') || (t.description || '').toLowerCase().includes('maternity'),
      );
      if (babyTxns.length >= 2) {
        detections.push({
          type: 'BABY',
          confidence: Math.min(50 + babyTxns.length * 15, 90),
          title: 'Baby on the Way?',
          description: 'Baby-related purchases detected. Start planning your baby fund.',
        });
      }
    }

    // Vacation detection: flights, hotels, travel
    if (!existingTypes.has('VACATION')) {
      const travelTxns = transactions.filter(
        (t) => descs.some((d) => d.includes('flight') || d.includes('hotel') || d.includes('trip') || d.includes('travel')),
      );
      if (travelTxns.length >= 2) {
        detections.push({
          type: 'VACATION',
          confidence: Math.min(40 + travelTxns.length * 15, 85),
          title: 'Vacation Mode',
          description: `We found ${travelTxns.length} travel-related transactions. Plan your next getaway!`,
        });
      }
    }

    // Education detection
    if (!existingTypes.has('EDUCATION')) {
      const eduTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('course') || (t.description || '').toLowerCase().includes('tuition') || (t.description || '').toLowerCase().includes('fee') || (t.description || '').toLowerCase().includes('education'),
      );
      if (eduTxns.length >= 2) {
        detections.push({
          type: 'EDUCATION',
          confidence: Math.min(50 + eduTxns.length * 10, 85),
          title: 'Education Investment',
          description: 'Education-related spending detected. Create a learning fund plan.',
        });
      }
    }

    // House detection: rent, mortgage, home maintenance
    if (!existingTypes.has('HOUSE')) {
      const housingTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('rent') || (t.description || '').toLowerCase().includes('mortgage') || (t.description || '').toLowerCase().includes('maintenance'),
      );
      const monthlyHousing = housingTxns.reduce((s, t) => s + Number(t.amount), 0) / 3;
      if (housingTxns.length >= 2 && monthlyHousing > avgMonthlyExpense * 0.3) {
        detections.push({
          type: 'HOUSE',
          confidence: Math.min(50 + housingTxns.length * 10, 85),
          title: 'Home Planning',
          description: `Your housing costs average ₹${Math.round(monthlyHousing)}/mo. Plan your home purchase journey.`,
        });
      }
    }

    // Retirement: recurring investment SIPs, PPF, etc.
    if (!existingTypes.has('RETIREMENT')) {
      const investmentTxns = transactions.filter(
        (t) => t.type === 'expense' && ((t.description || '').toLowerCase().includes('sip') || (t.description || '').toLowerCase().includes('ppf') || (t.description || '').toLowerCase().includes('nps') || (t.description || '').toLowerCase().includes('retirement') || (t.description || '').toLowerCase().includes('pension')),
      );
      if (investmentTxns.length >= 3 && avgMonthlyIncome > 50000) {
        detections.push({
          type: 'RETIREMENT',
          confidence: Math.min(50 + investmentTxns.length * 10, 85),
          title: 'Retirement Planning',
          description: 'You are investing for retirement. Optimize your long-term strategy.',
        });
      }
    }

    // Business detection
    if (!existingTypes.has('BUSINESS')) {
      const businessTxns = transactions.filter(
        (t) => (t.description || '').toLowerCase().includes('business') || t.type === 'income' && tags.some((tag) => ['freelance', 'business', 'client'].includes(tag)),
      );
      if (businessTxns.length >= 3) {
        detections.push({
          type: 'BUSINESS',
          confidence: Math.min(50 + businessTxns.length * 10, 85),
          title: 'Business Activity',
          description: 'Business-related transactions detected. Plan your business finances.',
        });
      }
    }

    // Salary increase: compare recent income with older income
    if (!existingTypes.has('SALARY_INCREASE')) {
      const olderCutoff = new Date(Date.now() - 180 * 86400000);
      const recentIncome = transactions
        .filter((t) => t.type === 'income' && t.date >= cutoff)
        .reduce((s, t) => s + Number(t.amount), 0) / 3;
      const olderIncome = await this.prisma.transaction
        .aggregate({
          where: { userId, type: 'income', date: { gte: olderCutoff, lt: cutoff } },
          _avg: { amount: true },
        })
        .then((r) => Number(r._avg.amount || 0));
      if (olderIncome > 0 && recentIncome > olderIncome * 1.15) {
        const pctIncrease = Math.round(((recentIncome - olderIncome) / olderIncome) * 100);
        detections.push({
          type: 'SALARY_INCREASE',
          confidence: Math.min(60 + pctIncrease, 95),
          title: `Salary Increased by ${pctIncrease}%`,
          description: `Your monthly income grew from ₹${Math.round(olderIncome)} to ₹${Math.round(recentIncome)}.`,
        });
      }
    }

    // Job change: irregular income pattern
    if (!existingTypes.has('JOB_CHANGE')) {
      const incomeTxns = transactions.filter((t) => t.type === 'income');
      if (incomeTxns.length >= 2) {
        const amounts = incomeTxns.map((t) => Number(t.amount));
        const max = Math.max(...amounts);
        const min = Math.min(...amounts);
        const previousIncome = await this.prisma.transaction
          .aggregate({
            where: { userId, type: 'income', date: { lt: cutoff } },
            _avg: { amount: true },
          })
          .then((r) => Number(r._avg.amount || 0));
        if (previousIncome > 0 && max > 0 && (Math.abs(max - previousIncome) / previousIncome) > 0.3) {
          detections.push({
            type: 'JOB_CHANGE',
            confidence: Math.min(50, 70),
            title: 'Income Change Detected',
            description: 'Your income pattern has shifted significantly.',
          });
        }
      }
    }

    const created: { type: string; title: string; confidence: number }[] = [];
    for (const detection of detections) {
      if (detection.confidence >= 50) {
        const exists = await this.prisma.lifeEvent.findFirst({
          where: { userId, eventType: detection.type, isDismissed: false },
        });
        if (!exists) {
          await this.prisma.lifeEvent.create({
            data: {
              userId,
              eventType: detection.type,
              title: detection.title,
              description: detection.description,
              confidence: detection.confidence,
              source: 'ai_detected',
            },
          });
          created.push({ type: detection.type, title: detection.title, confidence: detection.confidence });
          this.logger.log(`Detected life event ${detection.type} for user ${userId} (confidence: ${detection.confidence})`);
        }
      }
    }

    return { detected: created.length, events: created, message: created.length > 0 ? `${created.length} new event(s) detected` : 'No new events detected' };
  }

  async createPlanFromEvent(id: string, userId: string) {
    const event = await this.prisma.lifeEvent.findFirst({
      where: { id, userId },
    });
    if (!event) throw new NotFoundException('Life event not found');

    const existingPlan = await this.prisma.lifePlan.findFirst({
      where: { lifeEventId: id, userId },
    });
    if (existingPlan) {
      return existingPlan;
    }

    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: new Date(Date.now() - 90 * 86400000) } },
      orderBy: { date: 'desc' },
      take: 50,
    });

    const planBuilder = EVENT_PLANS[event.eventType];
    const plan = planBuilder ? planBuilder(recentTransactions) : null;

    if (!plan) {
      return {
        message: `No predefined plan for event type: ${event.eventType}`,
        eventId: id,
        eventType: event.eventType,
        title: event.title,
      };
    }

    const created = await this.prisma.lifePlan.create({
      data: {
        userId,
        lifeEventId: id,
        title: plan.title,
        description: event.description || `A financial plan for ${event.title}`,
        eventType: event.eventType,
        monthlyTarget: plan.monthlyTarget,
        totalEstimate: plan.totalEstimate,
        targetDate: plan.targetDate,
        progress: 0,
        status: 'active',
        milestones: plan.milestones,
      },
    });

    this.logger.log(`Created life plan "${plan.title}" for event ${id} (user ${userId})`);
    return created;
  }
}
