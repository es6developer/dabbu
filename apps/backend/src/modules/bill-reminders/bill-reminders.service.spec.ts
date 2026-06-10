import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillRemindersService } from './bill-reminders.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('BillRemindersService', () => {
  let service: BillRemindersService;
  let prisma: any;

  const mockBill = {
    id: 'bill-1',
    userId: 'user-1',
    name: 'Electricity Bill',
    amount: 2500,
    paidAmount: 0,
    dueDate: new Date('2026-06-15'),
    isPaid: false,
    paidDate: null,
    isRecurring: true,
    frequency: 'monthly',
    reminderDays: 5,
    notes: 'Pay by 15th',
    payee: 'Tata Power',
    autopayUrl: null,
    accountId: null,
    categoryId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    account: null,
  };

  const mockPrisma = {
    bill: {
      create: jest.fn().mockResolvedValue(mockBill),
      findMany: jest.fn().mockResolvedValue([mockBill]),
      findFirst: jest.fn().mockResolvedValue(mockBill),
      update: jest.fn().mockResolvedValue(mockBill),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BillRemindersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BillRemindersService>(BillRemindersService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a bill reminder', async () => {
      const dto = {
        name: 'Electricity Bill',
        amount: 2500,
        dueDate: '2026-06-15',
        isRecurring: true,
        frequency: 'monthly',
      };
      const result = await service.create('user-1', dto);
      expect(prisma.bill.create).toHaveBeenCalled();
      expect(result.name).toBe('Electricity Bill');
      expect(result.amount).toBe(2500);
    });
  });

  describe('findAll', () => {
    it('should return all bill reminders', async () => {
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electricity Bill');
    });
  });

  describe('findOne', () => {
    it('should return a bill reminder by ID', async () => {
      const result = await service.findOne('user-1', 'bill-1');
      expect(result.name).toBe('Electricity Bill');
    });

    it('should throw NotFoundException when bill is missing', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a bill reminder', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue(mockBill);
      const dto = { name: 'Updated Bill', amount: 3000 };
      const result = await service.update('user-1', 'bill-1', dto);
      expect(prisma.bill.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should soft-delete a bill reminder', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue(mockBill);
      const result = await service.remove('user-1', 'bill-1');
      expect(result.success).toBe(true);
      expect(prisma.bill.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
      );
    });
  });

  describe('getUpcoming', () => {
    it('should return upcoming bills within N days', async () => {
      const result = await service.getUpcoming('user-1', 7);
      expect(result).toHaveLength(1);
    });
  });

  describe('getOverdue', () => {
    it('should return overdue bills', async () => {
      const result = await service.getOverdue('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('markPaid', () => {
    it('should mark bill as paid with full amount', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue(mockBill);
      mockPrisma.bill.update.mockResolvedValue({
        ...mockBill,
        isPaid: true,
        paidAmount: 2500,
        paidDate: new Date(),
      });
      const result = await service.markPaid('user-1', 'bill-1');
      expect(prisma.bill.update).toHaveBeenCalled();
      expect(result.isPaid).toBe(true);
    });
  });
});
