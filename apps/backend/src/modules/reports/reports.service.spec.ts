import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  const mockTransactions = [
    {
      id: 'txn-1',
      userId: 'user-1',
      amount: 50000,
      type: 'income',
      date: new Date('2026-01-15'),
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Salary', icon: 'cash', color: '#22C55E' },
      description: 'January salary',
      deletedAt: null,
    },
    {
      id: 'txn-2',
      userId: 'user-1',
      amount: 300,
      type: 'expense',
      date: new Date('2026-01-16'),
      categoryId: 'cat-2',
      category: { id: 'cat-2', name: 'Food', icon: 'restaurant', color: '#F59E0B' },
      description: 'Lunch',
      deletedAt: null,
    },
    {
      id: 'txn-3',
      userId: 'user-1',
      amount: 200,
      type: 'expense',
      date: new Date('2026-01-17'),
      categoryId: 'cat-2',
      category: { id: 'cat-2', name: 'Food', icon: 'restaurant', color: '#F59E0B' },
      description: 'Dinner',
      deletedAt: null,
    },
  ];

  const mockPrisma = {
    transaction: {
      findMany: jest.fn().mockResolvedValue(mockTransactions),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyReport', () => {
    it('should return monthly report with summary and breakdown', async () => {
      const result = await service.getMonthlyReport('user-1', 6);
      expect(result).toHaveProperty('summary');
      expect(result.summary.totalIncome).toBe(50000);
      expect(result.summary.totalExpense).toBe(500);
      expect(result.summary.savings).toBe(49500);
      expect(result.summary.savingsRate).toBe(99);
      expect(result.monthly).toHaveLength(6);
      expect(result.categoryBreakdown).toHaveLength(2);
    });
  });

  describe('getAnnualReport', () => {
    it('should return annual report for a given year', async () => {
      const result = await service.getAnnualReport('user-1', 2026);
      expect(result.year).toBe(2026);
      expect(result.summary.totalIncome).toBe(50000);
      expect(result.summary.totalExpense).toBe(500);
      expect(result.monthly).toHaveLength(12);
    });
  });

  describe('getCategoryReport', () => {
    it('should return category breakdown sorted by amount', async () => {
      const result = await service.getCategoryReport('user-1');
      expect(result).toHaveProperty('totalExpense');
      expect(result).toHaveProperty('categories');
      expect(result.categories[0].amount).toBeGreaterThanOrEqual(result.categories[1]?.amount ?? 0);
    });
  });
});
