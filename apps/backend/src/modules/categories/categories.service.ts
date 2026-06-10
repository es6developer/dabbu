import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

const EXPENSE_DEFAULTS = [
  { name: 'Housing', type: 'expense', icon: 'home', color: '#FB923C' },
  { name: 'Groceries', type: 'expense', icon: 'cart', color: '#34C759' },
  { name: 'Food & Dining', type: 'expense', icon: 'fast-food', color: '#FF6B6B' },
  { name: 'Utilities', type: 'expense', icon: 'flash', color: '#FBBF24' },
  { name: 'Transportation', type: 'expense', icon: 'car', color: '#38BDF8' },
  { name: 'Healthcare', type: 'expense', icon: 'medkit', color: '#FF4D4F' },
  { name: 'Shopping', type: 'expense', icon: 'bag', color: '#F472B6' },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#8B5CF6' },
  { name: 'Subscription', type: 'expense', icon: 'repeat', color: '#8B5CF6' },
  { name: 'Sports', type: 'expense', icon: 'football', color: '#22C55E' },
  { name: 'Travel', type: 'expense', icon: 'airplane', color: '#60A5FA' },
  { name: 'Children & Baby', type: 'expense', icon: 'happy', color: '#FF9F0A' },
  { name: 'Financial', type: 'expense', icon: 'shield', color: '#00CEC9' },
  { name: 'Other', type: 'expense', icon: 'ellipsis-horizontal', color: '#636E72' },
];

const INCOME_DEFAULTS = [
  { name: 'Employment', type: 'income', icon: 'briefcase', color: '#00B894' },
  { name: 'Business', type: 'income', icon: 'storefront', color: '#6366F1' },
  { name: 'Freelancing', type: 'income', icon: 'laptop', color: '#3498DB' },
  { name: 'Investments', type: 'income', icon: 'trending-up', color: '#9B59B6' },
  { name: 'Rental', type: 'income', icon: 'home', color: '#FB923C' },
  { name: 'Gifts & Rewards', type: 'income', icon: 'gift', color: '#F472B6' },
  { name: 'Family Contributions', type: 'income', icon: 'people', color: '#FF6B00' },
  { name: 'Other', type: 'income', icon: 'ellipsis-horizontal', color: '#636E72' },
];

const DEFAULT_CATEGORIES = [...EXPENSE_DEFAULTS, ...INCOME_DEFAULTS];

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

  async findAll(userId: string, type?: string) {
    const typeFilter = type ? { transactionType: type } : {};

    const userCats = await this.prisma.transactionCategory.findMany({
      where: { userId, isActive: true, ...typeFilter },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });

    const defaultCats = await this.prisma.transactionCategory.findMany({
      where: { isDefault: true, isActive: true, ...typeFilter },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });

    // Deduplicate default categories by name (seed creates one set per user)
    const nameSeen = new Map<string, boolean>();
    const uniqueDefaults = defaultCats.filter((c) => {
      const key = c.name;
      if (nameSeen.has(key)) {
        return false;
      }
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
    if (!cat) {
      throw new NotFoundException('Category not found');
    }
    return { data: cat };
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.transactionCategory.findFirst({
      where: { id, userId },
    });
    if (!cat) {
      throw new NotFoundException('Category not found');
    }

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
    if (!cat) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.transactionCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getDefaults() {
    return { data: DEFAULT_CATEGORIES };
  }
}
