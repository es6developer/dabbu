import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetsRepository } from './budgets.repository';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let repo: any;

  const mockBudget = {
    id: 'budget-1',
    userId: 'user-1',
    name: 'Monthly Groceries',
    amount: 15000,
    spent: 8000,
    period: 'monthly',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
    isActive: true,
    notifyAt: 80,
    notes: 'Weekly grocery budget',
    categoryId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
  };

  const mockRepo = {
    createBudget: jest.fn().mockImplementation(async (userId, dto) => ({
      ...mockBudget,
      userId,
      name: dto.name,
      amount: dto.amount,
      period: dto.period || 'monthly',
    })),
    findAllWithCategory: jest.fn().mockResolvedValue([mockBudget]),
    findWithCategory: jest.fn().mockResolvedValue(mockBudget),
    findFirst: jest.fn().mockResolvedValue(mockBudget),
    updateWithCategory: jest.fn().mockImplementation(async (id, data) => ({
      ...mockBudget,
      ...data,
    })),
    softDelete: jest.fn().mockResolvedValue({ ...mockBudget, deletedAt: new Date() }),
    findActiveBudgets: jest.fn().mockResolvedValue([mockBudget]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetsService, { provide: BudgetsRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    repo = module.get(BudgetsRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a budget with default dates', async () => {
      const dto = { name: 'Monthly Groceries', amount: 15000 };
      const result = await service.create('user-1', dto);
      expect(repo.createBudget).toHaveBeenCalled();
      expect(result.name).toBe('Monthly Groceries');
      expect(result.amount).toBe(15000);
    });

    it('should create a budget with custom start date', async () => {
      const dto = {
        name: 'Yearly Savings',
        amount: 120000,
        period: 'yearly',
        startDate: '2026-01-01',
      };
      await service.create('user-1', dto);
      expect(repo.createBudget).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all budgets for a user', async () => {
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Monthly Groceries');
    });
  });

  describe('findOne', () => {
    it('should return a budget by ID', async () => {
      const result = await service.findOne('user-1', 'budget-1');
      expect(result.name).toBe('Monthly Groceries');
    });

    it('should throw NotFoundException when budget is missing', async () => {
      mockRepo.findWithCategory.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a budget', async () => {
      mockRepo.findFirst.mockResolvedValue(mockBudget);
      const dto = { name: 'Updated Groceries', amount: 20000 };
      const result = await service.update('user-1', 'budget-1', dto);
      expect(repo.updateWithCategory).toHaveBeenCalled();
      expect(result.name).toBe('Updated Groceries');
    });

    it('should throw NotFoundException for missing budget', async () => {
      mockRepo.findFirst.mockResolvedValue(null);
      await expect(service.update('user-1', 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete a budget', async () => {
      mockRepo.findFirst.mockResolvedValue(mockBudget);
      const result = await service.remove('user-1', 'budget-1');
      expect(result.success).toBe(true);
      expect(repo.softDelete).toHaveBeenCalledWith('budget-1');
    });

    it('should throw NotFoundException for missing budget', async () => {
      mockRepo.findFirst.mockResolvedValue(null);
      await expect(service.remove('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return budget statistics', async () => {
      const result = await service.getStats('user-1');
      expect(result).toHaveProperty('totalBudget');
      expect(result).toHaveProperty('totalSpent');
      expect(result).toHaveProperty('atRisk');
      expect(result.budgets).toHaveLength(1);
    });
  });
});
