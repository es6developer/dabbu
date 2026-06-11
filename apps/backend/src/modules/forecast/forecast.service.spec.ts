import { Test, TestingModule } from '@nestjs/testing';
import { ForecastService } from './forecast.service';
import { ForecastRepository } from './forecast.repository';

describe('ForecastService', () => {
  let service: ForecastService;
  let repo: any;

  const mockTransactions = [
    {
      id: 'tx-1',
      userId: 'user-1',
      type: 'income',
      amount: 100000,
      date: new Date('2026-05-15'),
      categoryId: 'cat-1',
      description: 'Salary',
      deletedAt: null,
    },
    {
      id: 'tx-2',
      userId: 'user-1',
      type: 'expense',
      amount: 25000,
      date: new Date('2026-05-10'),
      categoryId: 'cat-2',
      description: 'Rent',
      deletedAt: null,
    },
    {
      id: 'tx-3',
      userId: 'user-1',
      type: 'expense',
      amount: 5000,
      date: new Date('2026-05-08'),
      categoryId: 'cat-3',
      description: 'Groceries',
      deletedAt: null,
    },
  ];

  const mockAccounts = [{ balance: 200000, type: 'bank' }];

  const mockBills = [
    {
      amount: 2000,
      dueDate: new Date('2026-06-15'),
      frequency: 'monthly',
      isRecurring: true,
      name: 'Internet',
    },
  ];

  const mockLoans = [
    {
      id: 'loan-1',
      userId: 'user-1',
      name: 'Car Loan',
      totalAmount: 500000,
      paidAmount: 50000,
      monthlyEmi: 15000,
      emiDay: 5,
      interestPaid: 12000,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockGoals = [
    {
      name: 'Vacation',
      targetAmount: 200000,
      currentAmount: 50000,
      deadline: new Date('2026-12-31'),
    },
  ];

  const mockRepo = {
    findTransactions: jest.fn().mockResolvedValue(mockTransactions),
    findAccounts: jest.fn().mockResolvedValue(mockAccounts),
    findUnpaidBills: jest.fn().mockResolvedValue(mockBills),
    findLoans: jest
      .fn()
      .mockResolvedValue(
        mockLoans.map(({ monthlyEmi, emiDay, name }) => ({ monthlyEmi, emiDay, name })),
      ),
    findLoansForPayoff: jest.fn().mockResolvedValue(mockLoans),
    findLoanById: jest.fn().mockResolvedValue(mockLoans),
    findGoals: jest.fn().mockResolvedValue(mockGoals),
    findAccountBalances: jest.fn().mockResolvedValue(mockAccounts),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForecastService, { provide: ForecastRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<ForecastService>(ForecastService);
    repo = module.get(ForecastRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cashFlowForecast', () => {
    it('should return cash flow projections', async () => {
      const result = await service.cashFlowForecast('user-1', 3);
      expect(result).toBeDefined();
      expect(result.currentBalance).toBe(200000);
      expect(result.averageMonthlyIncome).toBeGreaterThanOrEqual(0);
      expect(result.projections).toHaveLength(3);
      expect(result.projections[0]).toHaveProperty('month');
      expect(result.projections[0]).toHaveProperty('projectedBalance');
      expect(result.projections[0]).toHaveProperty('isShortfall');
    });
  });

  describe('savingsForecast', () => {
    it('should return savings projections', async () => {
      const result = await service.savingsForecast('user-1', 10000, 6);
      expect(result).toBeDefined();
      expect(result.monthlySavingsRate).toBe(10000);
      expect(result.projections).toHaveLength(6);
      expect(result.projections[0]).toHaveProperty('month');
      expect(result.projections[0]).toHaveProperty('accumulated');
    });

    it('should use default savings rate if not provided', async () => {
      const result = await service.savingsForecast('user-1', undefined, 3);
      expect(result.monthlySavingsRate).toBeGreaterThan(0);
    });
  });

  describe('loanPayoffForecast', () => {
    it('should return loan payoff projections', async () => {
      const result: any = await service.loanPayoffForecast('user-1');
      expect(result).toBeDefined();
      expect(result.loans).toBeDefined();
      expect(result.loans).toHaveLength(1);
      expect(result.loans[0]).toHaveProperty('name', 'Car Loan');
      expect(result.loans[0]).toHaveProperty('monthsToPayoff');
      expect(result.loans[0]).toHaveProperty('payoffDate');
      expect(result.loans[0]).toHaveProperty('amortizationSchedule');
    });

    it('should return message when no loans exist', async () => {
      mockRepo.findLoansForPayoff.mockResolvedValue([]);
      const result: any = await service.loanPayoffForecast('user-1');
      expect(result.message).toBe('No active loans found');
      mockRepo.findLoansForPayoff.mockResolvedValue(mockLoans);
    });

    it('should handle extra payments', async () => {
      const resultWithout: any = await service.loanPayoffForecast('user-1', undefined, 0);
      const resultWith: any = await service.loanPayoffForecast('user-1', undefined, 5000);
      expect(resultWithout.loans).toBeDefined();
      expect(resultWith.loans).toBeDefined();
      expect(resultWith.loans[0].effectiveMonthlyPayment).toBeGreaterThan(
        resultWithout.loans[0].effectiveMonthlyPayment,
      );
    });
  });
});
