import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', type: 'expense', icon: 'fast-food', color: '#f7892c' },
  { name: 'Transportation', type: 'expense', icon: 'car', color: '#6366F1' },
  { name: 'Shopping', type: 'expense', icon: 'bag', color: '#EC4899' },
  { name: 'Bills & Utilities', type: 'expense', icon: 'flash', color: '#F59E0B' },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#8B5CF6' },
  { name: 'Healthcare', type: 'expense', icon: 'medkit', color: '#EF4444' },
  { name: 'Education', type: 'expense', icon: 'book', color: '#14B8A6' },
  { name: 'Rent', type: 'expense', icon: 'home', color: '#3B82F6' },
  { name: 'Salary', type: 'income', icon: 'cash', color: '#10B981' },
  { name: 'Investment', type: 'income', icon: 'trending-up', color: '#f7892c' },
  { name: 'Transfer', type: 'transfer', icon: 'swap-horizontal', color: '#6B7280' },
  { name: 'EMI', type: 'expense', icon: 'card', color: '#E11D48' },
  { name: 'Insurance', type: 'expense', icon: 'shield', color: '#0EA5E9' },
  { name: 'Subscriptions', type: 'expense', icon: 'repeat', color: '#A855F7' },
  { name: 'Miscellaneous', type: 'expense', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.transactionCategory.create({
      data: {
        userId,
        name: dto.name,
        transactionType: dto.type,
        icon: dto.icon,
        color: dto.color,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async findAll(userId: string) {
    const userCats = await this.prisma.transactionCategory.findMany({
      where: { userId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });

    const defaultCats = await this.prisma.transactionCategory.findMany({
      where: { isDefault: true, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });

    // Deduplicate default categories by name (seed creates one set per user)
    const nameSeen = new Map<string, boolean>();
    const uniqueDefaults = defaultCats.filter((c) => {
      const key = c.name;
      if (nameSeen.has(key)) return false;
      nameSeen.set(key, true);
      return true;
    });

    // Merge user categories first so they take priority on name overlap
    const merged = [...userCats];
    const seenNames = new Set(userCats.map((c) => c.name));
    for (const dc of uniqueDefaults) {
      if (!seenNames.has(dc.name)) {
        merged.push(dc);
        seenNames.add(dc.name);
      }
    }
    return merged;
  }

  async findOne(userId: string, id: string) {
    const cat = await this.prisma.transactionCategory.findFirst({
      where: { id, isActive: true },
      include: { _count: { select: { transactions: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return { data: cat };
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.transactionCategory.findFirst({
      where: { id, userId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    return this.prisma.transactionCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { transactionType: dto.type }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.color && { color: dto.color }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const cat = await this.prisma.transactionCategory.findFirst({
      where: { id, userId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    await this.prisma.transactionCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getDefaults() {
    return { data: DEFAULT_CATEGORIES };
  }
}
