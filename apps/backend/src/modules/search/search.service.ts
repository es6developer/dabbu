import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private recentSearches = new Map<string, { query: string; timestamp: Date }[]>();

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

    const searchFilter = query;

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

      const txns = await this.prisma.transaction.findMany({
        where: txnWhere,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
        include: { category: { select: { id: true, name: true, icon: true } } },
      });
      results.push(...txns.map(t => ({ ...t, _type: 'transaction' })));
      totalResults += txns.length;
    }

    if (!types || types.includes('goals')) {
      const goals = await this.prisma.goal.findMany({
        where: {
          userId,
          deletedAt: null,
          OR: [
            { name: { contains: searchFilter, mode: 'insensitive' } },
            { notes: { contains: searchFilter, mode: 'insensitive' } },
          ],
        },
        take: limit,
        skip: offset,
      });
      results.push(...goals.map(g => ({ ...g, _type: 'goal' })));
      totalResults += goals.length;
    }

    if (!types || types.includes('bills')) {
      const bills = await this.prisma.bill.findMany({
        where: {
          userId,
          deletedAt: null,
          OR: [
            { name: { contains: searchFilter, mode: 'insensitive' } },
            { notes: { contains: searchFilter, mode: 'insensitive' } },
            { payee: { contains: searchFilter, mode: 'insensitive' } },
          ],
        },
        take: limit,
        skip: offset,
      });
      results.push(...bills.map(b => ({ ...b, _type: 'bill' })));
      totalResults += bills.length;
    }

    if (!types || types.includes('documents')) {
      const docs = await this.prisma.userDocument.findMany({
        where: {
          userId,
          deletedAt: null,
          name: { contains: searchFilter, mode: 'insensitive' },
        },
        take: limit,
        skip: offset,
      });
      results.push(...docs.map(d => ({ ...d, _type: 'document' })));
      totalResults += docs.length;
    }

    if (!types || types.includes('family')) {
      const families = await this.prisma.familyMember.findMany({
        where: {
          userId,
          family: {
            OR: [
              { name: { contains: searchFilter, mode: 'insensitive' } },
            ],
          },
        },
        include: { family: { select: { id: true, name: true } } },
        take: limit,
      });
      results.push(...families.map(f => ({ ...f, _type: 'family' })));
      totalResults += families.length;
    }

    if (!types || types.includes('budgets')) {
      const budgets = await this.prisma.budget.findMany({
        where: {
          userId,
          deletedAt: null,
          name: { contains: searchFilter, mode: 'insensitive' },
        },
        take: limit,
      });
      results.push(...budgets.map(b => ({ ...b, _type: 'budget' })));
      totalResults += budgets.length;
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
          description: { contains: query, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { description: true },
        take: 5,
        orderBy: { date: 'desc' },
      }),
      this.prisma.goal.findMany({
        where: {
          userId,
          name: { contains: query, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { name: true },
        take: 5,
      }),
      this.prisma.bill.findMany({
        where: {
          userId,
          name: { contains: query, mode: 'insensitive' },
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
    const userSearches = this.recentSearches.get(userId) || [];
    userSearches.unshift({ query, timestamp: new Date() });
    if (userSearches.length > 20) userSearches.pop();
    this.recentSearches.set(userId, userSearches);
  }

  async getRecentSearches(userId: string) {
    const searches = this.recentSearches.get(userId) || [];
    return searches.slice(0, 10).map(s => s.query);
  }

  async clearRecentSearches(userId: string) {
    this.recentSearches.delete(userId);
  }

  async removeRecentSearch(userId: string, query: string) {
    const searches = this.recentSearches.get(userId) || [];
    this.recentSearches.set(userId, searches.filter(s => s.query !== query));
  }
}
