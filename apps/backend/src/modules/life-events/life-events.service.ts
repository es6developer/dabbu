import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LifeEventsService {
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
    const createData: any = {
      userId,
      eventType: data.eventType,
      title: data.title,
      description: data.description || '',
      confidence: 100,
      spaceId: data.spaceId || null,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
    };
    return this.prisma.lifeEvent.create({ data: createData });
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
    // TODO: integrate real AI detection logic
    return { detected: 0, message: 'AI detection placeholder' };
  }

  async createPlanFromEvent(id: string, userId: string) {
    const event = await this.prisma.lifeEvent.findFirst({
      where: { id, userId },
    });
    if (!event) throw new NotFoundException('Life event not found');

    // No LifePlan model exists yet; return a placeholder indicating what a future plan would contain
    return {
      message: 'Life plan creation placeholder',
      eventId: id,
      eventType: event.eventType,
      title: event.title,
      note: 'Create a LifePlan model in Prisma schema and integrate here',
    };
  }
}
