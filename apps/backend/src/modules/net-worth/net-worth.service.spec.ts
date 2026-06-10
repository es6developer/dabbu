import { Test, TestingModule } from '@nestjs/testing';
import { NetWorthService } from './net-worth.service';
import { NetWorthRepository } from './net-worth.repository';

describe('NetWorthService', () => {
  let service: NetWorthService;
  let repo: any;

  const mockNetWorth = {
    id: 'nw-1',
    userId: 'user-1',
    totalAssets: 10000000,
    totalLiabilities: 3000000,
    bank: 500000,
    cash: 50000,
    gold: 200000,
    property: 8000000,
    investments: 1000000,
    fixedDeposits: 250000,
    homeLoan: 2500000,
    personalLoan: 0,
    creditCardDebt: 50000,
    otherLiabilities: 450000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSnapshot = {
    id: 'snap-1',
    userId: 'user-1',
    snapshotDate: new Date('2026-06-01'),
    netWorth: 7000000,
    totalAssets: 10000000,
    totalLiabilities: 3000000,
    bank: 500000,
    cash: 50000,
    gold: 200000,
    property: 8000000,
    investments: 1000000,
    fixedDeposits: 250000,
    homeLoan: 2500000,
    personalLoan: 0,
    creditCardDebt: 50000,
    otherLiabilities: 450000,
    createdAt: new Date(),
  };

  const mockRepo = {
    findUnique: jest.fn().mockResolvedValue(mockNetWorth),
    create: jest.fn().mockResolvedValue(mockNetWorth),
    upsert: jest.fn().mockResolvedValue(mockNetWorth),
    findSnapshots: jest.fn().mockResolvedValue([mockSnapshot]),
    upsertSnapshot: jest.fn().mockResolvedValue(mockSnapshot),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NetWorthService, { provide: NetWorthRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<NetWorthService>(NetWorthService);
    repo = module.get(NetWorthRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return net worth with snapshots', async () => {
      const result = await service.get('user-1');
      expect(result).toBeDefined();
      expect(result.totalAssets).toBe(10000000);
      expect(result.totalLiabilities).toBe(3000000);
      expect(result.netWorth).toBe(7000000);
      expect(result.snapshots).toHaveLength(1);
    });

    it('should create a new record if none exists', async () => {
      mockRepo.findUnique.mockResolvedValue(null);
      const result = await service.get('user-1');
      expect(repo.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update net worth and create snapshot', async () => {
      const dto = { bank: 600000, cash: 75000 };
      const result = await service.update('user-1', dto);
      expect(repo.upsert).toHaveBeenCalled();
      expect(repo.upsertSnapshot).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
