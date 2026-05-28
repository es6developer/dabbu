import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: any) {
    return this.prisma.scannedBill.create({
      data: {
        userId,
        merchantName: data.merchant || data.merchantName,
        category: data.category,
        totalAmount: data.amount ?? data.totalAmount,
        billDate: (data.date || data.billDate) ? new Date(data.date || data.billDate) : undefined,
        items: data.items || [],
        rawText: data.rawText,
        confidence: data.confidence,
      },
    });
  }

  async findAll(userId: string, month?: string, year?: string, category?: string) {
    const where: any = { userId };

    if (year) {
      const y = parseInt(year);
      if (month) {
        const m = parseInt(month);
        where.billDate = {
          gte: new Date(y, m - 1, 1),
          lt: new Date(y, m, 1),
        };
      } else {
        where.billDate = {
          gte: new Date(y, 0, 1),
          lt: new Date(y + 1, 0, 1),
        };
      }
    }

    if (category) {
      where.category = category;
    }

    const [bills, totalAmount, count] = await this.prisma.$transaction([
      this.prisma.scannedBill.findMany({
        where,
        orderBy: { billDate: 'desc' },
      }),
      this.prisma.scannedBill.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      this.prisma.scannedBill.count({ where }),
    ]);

    return {
      bills,
      totalAmount: totalAmount._sum.totalAmount || 0,
      count,
    };
  }

  async findMonthly(userId: string) {
    const bills = await this.prisma.scannedBill.findMany({
      where: { userId },
      orderBy: { billDate: 'desc' },
    });

    const grouped: Record<string, { year: number; month: number; totalAmount: number; count: number; bills: any[] }> = {};

    for (const bill of bills) {
      if (!bill.billDate) continue;
      const year = bill.billDate.getFullYear();
      const month = bill.billDate.getMonth() + 1;
      const key = `${year}-${month}`;

      if (!grouped[key]) {
        grouped[key] = { year, month, totalAmount: 0, count: 0, bills: [] };
      }

      grouped[key].totalAmount += Number(bill.totalAmount || 0);
      grouped[key].count += 1;
      grouped[key].bills.push(bill);
    }

    return Object.values(grouped).sort((a, b) => b.year - a.year || b.month - a.month);
  }

  async compare(userId: string, month1: string, year1: string, month2: string, year2: string) {
    const m1 = parseInt(month1);
    const y1 = parseInt(year1);
    const m2 = parseInt(month2);
    const y2 = parseInt(year2);

    const [billsMonth1, billsMonth2] = await Promise.all([
      this.prisma.scannedBill.findMany({
        where: {
          userId,
          billDate: {
            gte: new Date(y1, m1 - 1, 1),
            lt: new Date(y1, m1, 1),
          },
        },
      }),
      this.prisma.scannedBill.findMany({
        where: {
          userId,
          billDate: {
            gte: new Date(y2, m2 - 1, 1),
            lt: new Date(y2, m2, 1),
          },
        },
      }),
    ]);

    const month1Total = billsMonth1.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const month2Total = billsMonth2.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    const extractItems = (bills: typeof billsMonth1) => {
      const items: { name: string; price: number }[] = [];
      for (const bill of bills) {
        if (bill.items && Array.isArray(bill.items)) {
          for (const item of bill.items as any[]) {
            if (item.name && item.price != null) {
              items.push({ name: item.name, price: Number(item.price) });
            }
          }
        }
      }
      return items;
    };

    const month1Items = extractItems(billsMonth1);
    const month2Items = extractItems(billsMonth2);

    const getItemMap = (items: { name: string; price: number }[]) => {
      const map: Record<string, number[]> = {};
      for (const item of items) {
        if (!map[item.name]) map[item.name] = [];
        map[item.name].push(item.price);
      }
      return map;
    };

    const map1 = getItemMap(month1Items);
    const map2 = getItemMap(month2Items);

    const names1 = new Set(Object.keys(map1));
    const names2 = new Set(Object.keys(map2));

    const onlyInMonth1: { name: string; price: number }[] = [];
    const onlyInMonth2: { name: string; price: number }[] = [];
    const priceChanges: { name: string; month1Price: number; month2Price: number; diff: number; diffPercent: number }[] = [];

    for (const name of names1) {
      if (!names2.has(name)) {
        const avgPrice = map1[name].reduce((s, p) => s + p, 0) / map1[name].length;
        onlyInMonth1.push({ name, price: Math.round(avgPrice * 100) / 100 });
      }
    }

    for (const name of names2) {
      if (!names1.has(name)) {
        const avgPrice = map2[name].reduce((s, p) => s + p, 0) / map2[name].length;
        onlyInMonth2.push({ name, price: Math.round(avgPrice * 100) / 100 });
      }
    }

    for (const name of names1) {
      if (names2.has(name)) {
        const avg1 = map1[name].reduce((s, p) => s + p, 0) / map1[name].length;
        const avg2 = map2[name].reduce((s, p) => s + p, 0) / map2[name].length;
        const diff = Math.round((avg2 - avg1) * 100) / 100;
        const diffPercent = avg1 !== 0 ? Math.round((diff / avg1) * 10000) / 100 : 0;
        priceChanges.push({
          name,
          month1Price: Math.round(avg1 * 100) / 100,
          month2Price: Math.round(avg2 * 100) / 100,
          diff,
          diffPercent,
        });
      }
    }

    const monthLabel1 = new Date(y1, m1 - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthLabel2 = new Date(y2, m2 - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return {
      month1: { label: monthLabel1, totalAmount: month1Total, billCount: billsMonth1.length, items: month1Items },
      month2: { label: monthLabel2, totalAmount: month2Total, billCount: billsMonth2.length, items: month2Items },
      differences: { onlyInMonth1, onlyInMonth2, priceChanges },
    };
  }

  async findOne(userId: string, id: string) {
    const bill = await this.prisma.scannedBill.findFirst({
      where: { id, userId },
    });
    if (!bill) throw new NotFoundException('Scanned bill not found');
    return bill;
  }

  async update(
    userId: string,
    id: string,
    data: { merchantName?: string; category?: string; billDate?: string; items?: any; notes?: string },
  ) {
    await this.findOne(userId, id);
    return this.prisma.scannedBill.update({
      where: { id },
      data: {
        ...(data.merchantName !== undefined && { merchantName: data.merchantName }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.billDate !== undefined && { billDate: new Date(data.billDate) }),
        ...(data.items !== undefined && { items: data.items }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.scannedBill.delete({ where: { id } });
  }
}
