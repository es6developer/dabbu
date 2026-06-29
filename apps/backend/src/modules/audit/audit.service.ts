import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(options: {
    userId?: string;
    adminId?: string;
    action: string;
    entity: string;
    entityId?: string;
    description?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: options.userId || null,
          adminId: options.adminId || null,
          action: options.action,
          entity: options.entity,
          entityId: options.entityId || null,
          description: options.description || null,
          oldValues: options.oldValues || undefined,
          newValues: options.newValues || undefined,
          ipAddress: options.ipAddress || null,
          userAgent: options.userAgent || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to create audit log: ${err.message}`);
    }
  }

  async findAll(query: {
    userId?: string;
    adminId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.adminId) {
      where.adminId = query.adminId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.entity) {
      where.entity = query.entity;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          admin: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, limit: query.limit || 50, offset: query.offset || 0 };
  }

  async getUserAuditTrail(userId: string, limit = 50, offset = 0) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);
    return { data, total, limit, offset };
  }

  async getEntityAuditTrail(entity: string, entityId: string, limit = 50, offset = 0) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entity, entityId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: { entity, entityId } }),
    ]);
    return { data, total, limit, offset };
  }

  async exportLogs(userId: string, format: 'csv' | 'json') {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    if (format === 'csv') {
      const headers = 'ID,Action,Entity,Entity ID,Description,IP Address,Created At\n';
      const rows = logs
        .map(
          (l) =>
            `"${l.id}","${l.action}","${l.entity}","${l.entityId || ''}","${(l.description || '').replace(/"/g, '""')}","${l.ipAddress || ''}","${l.createdAt.toISOString()}"`,
        )
        .join('\n');
      return {
        data: headers + rows,
        contentType: 'text/csv',
        filename: `audit-log-${Date.now()}.csv`,
      };
    }

    return {
      data: JSON.stringify(logs, null, 2),
      contentType: 'application/json',
      filename: `audit-log-${Date.now()}.json`,
    };
  }
}
