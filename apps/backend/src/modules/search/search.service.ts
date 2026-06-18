import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(userId: string, query: string, options?: {
    types?: string[];
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
    categoryId?: string;
  }) {
    if (!query || query.length < 2) {
      return { results: [], suggestions: [] };
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const types = options?.types;
    const results: any[] = [];
    let totalResults = 0;

    const sanitized = query.replace(/[%_\\]/g, '\\$&');
    const searchFilter = sanitized;

    if (!types || types.includes('transactions')) {
      const txnWhere: any = {
        userId,
        deletedAt: null,
        OR: [
          { description: { contains: searchFilter, mode: 'insensitive' } },
          { notes: { contains: searchFilter, mode: 'insensitive' } },
        ],
      };
      if (options?.dateFrom) txnWhere.date = { ...(txnWhere.date || {}), gte: new Date(options.dateFrom) };
      if (options?.dateTo) txnWhere.date = { ...(txnWhere.date || {}), lte: new Date(options.dateTo) };
      if (options?.categoryId) txnWhere.categoryId = options.categoryId;
      if (options?.amountMin !== undefined || options?.amountMax !== undefined) {
        txnWhere.amount = {};
        if (options.amountMin !== undefined) txnWhere.amount.gte = options.amountMin;
        if (options.amountMax !== undefined) txnWhere.amount.lte = options.amountMax;
      }

      const [txns, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where: txnWhere,
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset,
          include: { category: { select: { id: true, name: true, icon: true } } },
        }),
        this.prisma.transaction.count({ where: txnWhere }),
      ]);
      results.push(...txns.map(t => ({ ...t, _type: 'transaction' })));
      totalResults += total;
    }

    if (!types || types.includes('goals')) {
      const goalsWhere: any = {
        userId,
        deletedAt: null,
        OR: [
          { name: { contains: searchFilter, mode: 'insensitive' } },
          { notes: { contains: searchFilter, mode: 'insensitive' } },
        ],
      };
      const [goals, total] = await Promise.all([
        this.prisma.goal.findMany({ where: goalsWhere, take: limit, skip: offset }),
        this.prisma.goal.count({ where: goalsWhere }),
      ]);
      results.push(...goals.map(g => ({ ...g, _type: 'goal' })));
      totalResults += total;
    }

    if (!types || types.includes('bills')) {
      const billsWhere: any = {
        userId,
        deletedAt: null,
        OR: [
          { name: { contains: searchFilter, mode: 'insensitive' } },
          { notes: { contains: searchFilter, mode: 'insensitive' } },
          { payee: { contains: searchFilter, mode: 'insensitive' } },
        ],
      };
      const [bills, total] = await Promise.all([
        this.prisma.bill.findMany({ where: billsWhere, take: limit, skip: offset }),
        this.prisma.bill.count({ where: billsWhere }),
      ]);
      results.push(...bills.map(b => ({ ...b, _type: 'bill' })));
      totalResults += total;
    }

    if (!types || types.includes('documents')) {
      const docsWhere: any = {
        userId,
        deletedAt: null,
        name: { contains: searchFilter, mode: 'insensitive' },
      };
      const [docs, total] = await Promise.all([
        this.prisma.userDocument.findMany({ where: docsWhere, take: limit, skip: offset }),
        this.prisma.userDocument.count({ where: docsWhere }),
      ]);
      results.push(...docs.map(d => ({ ...d, _type: 'document' })));
      totalResults += total;
    }

    if (!types || types.includes('family')) {
      const familiesWhere: any = {
        userId,
        family: { name: { contains: searchFilter, mode: 'insensitive' } },
      };
      const [families, total] = await Promise.all([
        this.prisma.familyMember.findMany({
          where: familiesWhere,
          include: { family: { select: { id: true, name: true } } },
          take: limit,
        }),
        this.prisma.familyMember.count({ where: familiesWhere }),
      ]);
      results.push(...families.map(f => ({ ...f, _type: 'family' })));
      totalResults += total;
    }

    if (!types || types.includes('budgets')) {
      const budgetsWhere: any = {
        userId,
        deletedAt: null,
        name: { contains: searchFilter, mode: 'insensitive' },
      };
      const [budgets, total] = await Promise.all([
        this.prisma.budget.findMany({ where: budgetsWhere, take: limit }),
        this.prisma.budget.count({ where: budgetsWhere }),
      ]);
      results.push(...budgets.map(b => ({ ...b, _type: 'budget' })));
      totalResults += total;
    }

    const suggestions = await this.getSuggestions(userId, query);

    return { results, total: totalResults, suggestions, limit, offset };
  }

  async getSuggestions(userId: string, query: string) {
    if (!query || query.length < 2) return [];

    const [txnDescriptions, goalNames, billNames] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          description: { contains: query },
          deletedAt: null,
        },
        select: { description: true },
        take: 5,
        orderBy: { date: 'desc' },
      }),
      this.prisma.goal.findMany({
        where: {
          userId,
          name: { contains: query },
          deletedAt: null,
        },
        select: { name: true },
        take: 5,
      }),
      this.prisma.bill.findMany({
        where: {
          userId,
          name: { contains: query },
          deletedAt: null,
        },
        select: { name: true },
        take: 5,
      }),
    ]);

    const suggestions = [
      ...new Set([
        ...txnDescriptions.filter(t => t.description).map(t => t.description!),
        ...goalNames.map(g => g.name),
        ...billNames.map(b => b.name),
      ]),
    ].slice(0, 10);

    return suggestions;
  }

  async trackRecentSearch(userId: string, query: string) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO recent_searches (id, userId, query, createdAt)
        VALUES (UUID(), ${userId}, ${query}, NOW())
      `;
    } catch (err: any) {
      this.logger.warn(`Failed to track recent search: ${err.message}`);
    }
  }

  async getRecentSearches(userId: string) {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ query: string }>>`
        SELECT DISTINCT query FROM recent_searches
        WHERE userId = ${userId}
        ORDER BY createdAt DESC
        LIMIT 10
      `;
      return rows.map(r => r.query);
    } catch (err: any) {
      this.logger.warn(`Failed to get recent searches: ${err.message}`);
      return [];
    }
  }

  async clearRecentSearches(userId: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM recent_searches WHERE userId = ${userId}
      `;
    } catch (err: any) {
      this.logger.warn(`Failed to clear recent searches: ${err.message}`);
    }
  }

  async removeRecentSearch(userId: string, query: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM recent_searches WHERE userId = ${userId} AND query = ${query}
      `;
    } catch (err: any) {
      this.logger.warn(`Failed to remove recent search: ${err.message}`);
    }
  }
}
