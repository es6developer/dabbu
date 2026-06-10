import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { LoansRepository } from './loans.repository';

describe('LoansService', () => {
  let service: LoansService;
  let repo: any;

  const mockLoan = {
    id: 'loan-1',
    userId: 'user-1',
    name: 'Home Loan',
    totalAmount: 5000000,
    paidAmount: 500000,
    interestPaid: 150000,
    monthlyEmi: 45000,
    emiDay: 5,
    startDate: new Date('2025-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockRepo = {
    create: jest.fn().mockResolvedValue(mockLoan),
    findAll: jest.fn().mockResolvedValue([mockLoan]),
    findOne: jest.fn().mockResolvedValue(mockLoan),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoansService, { provide: LoansRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<LoansService>(LoansService);
    repo = module.get(LoansRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a loan', async () => {
      const dto = { name: 'Home Loan', totalAmount: 5000000, monthlyEmi: 45000, emiDay: 5 };
      const result = await service.create('user-1', dto);
      expect(repo.create).toHaveBeenCalled();
      expect(result.name).toBe('Home Loan');
    });
  });

  describe('findAll', () => {
    it('should return all loans for a user', async () => {
      const result = await service.findAll('user-1');
      expect(result.loans).toHaveLength(1);
      expect(result.loans[0].name).toBe('Home Loan');
      expect(result).toHaveProperty('totalRemaining');
      expect(result).toHaveProperty('totalEmi');
    });
  });

  describe('findOne', () => {
    it('should return a loan by ID', async () => {
      const result = await service.findOne('loan-1', 'user-1');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Home Loan');
    });

    it('should return null for missing loan', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.findOne('nonexistent', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a loan', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(mockLoan);
      const dto = { name: 'Updated Home Loan' };
      await service.update('loan-1', 'user-1', dto);
      expect(repo.updateMany).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a loan', async () => {
      await service.remove('loan-1', 'user-1');
      expect(repo.updateMany).toHaveBeenCalledWith(
        { id: 'loan-1', userId: 'user-1' },
        { deletedAt: expect.any(Date) },
      );
    });
  });
});
