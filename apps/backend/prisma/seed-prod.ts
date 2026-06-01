import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'coffee', color: '#e74c3c', transactionType: 'expense' },
  { name: 'Transportation', icon: 'car', color: '#ff5722', transactionType: 'expense' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#e91e63', transactionType: 'expense' },
  { name: 'Bills & Utilities', icon: 'zap', color: '#ffc107', transactionType: 'expense' },
  { name: 'Entertainment', icon: 'film', color: '#9c27b0', transactionType: 'expense' },
  { name: 'Healthcare', icon: 'activity', color: '#4caf50', transactionType: 'expense' },
  { name: 'Education', icon: 'book', color: '#14B8A6', transactionType: 'expense' },
  { name: 'Rent', icon: 'home', color: '#795548', transactionType: 'expense' },
  { name: 'Groceries', icon: 'shopping-cart', color: '#f39c12', transactionType: 'expense' },
  { name: 'Subscriptions', icon: 'repeat', color: '#607d8b', transactionType: 'expense' },
  { name: 'EMI / Loans', icon: 'credit-card', color: '#f44336', transactionType: 'expense' },
  { name: 'Insurance', icon: 'shield', color: '#00bcd4', transactionType: 'expense' },
  { name: 'Salary', icon: 'briefcase', color: '#2ecc71', transactionType: 'income' },
  { name: 'Freelance', icon: 'laptop', color: '#3498db', transactionType: 'income' },
  { name: 'Investments', icon: 'trending-up', color: '#9b59b6', transactionType: 'income' },
  { name: 'Miscellaneous', icon: 'more-horizontal', color: '#9e9e9e', transactionType: 'expense' },
  { name: 'Other Income', icon: 'plus-circle', color: '#27ae60', transactionType: 'income' },
  { name: 'Other Expenses', icon: 'minus-circle', color: '#e74c3c', transactionType: 'expense' },
];

const PLANS = [
  {
    name: 'Free',
    code: 'FREE',
    description: 'Start with expense tracking, basic reports, and groups.',
    price: 0,
    currency: 'INR',
    interval: 'monthly',
    intervalCount: 1,
    popular: false,
    bestValue: false,
    features: [
      'expense_income_tracking',
      'basic_reports',
      'groups',
      'group_limit_5',
      'reminders',
      'ocr_scans_per_month_5',
    ],
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Premium Monthly',
    code: 'MONTHLY_89',
    description: 'Full premium access with unlimited reports, groups, insights and support.',
    price: 89,
    currency: 'INR',
    interval: 'monthly',
    intervalCount: 1,
    popular: false,
    bestValue: false,
    features: [
      'unlimited_groups',
      'unlimited_ocr',
      'advanced_analytics',
      'family_sharing',
      'custom_categories',
      'priority_support',
      'export_data',
      'unlimited_accounts',
      'budget_forecasting',
      'ai_insights',
      'investments',
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Premium Quarterly',
    code: 'QUARTERLY_219',
    description: 'Most popular quarterly plan with full premium benefits at a great price.',
    price: 219,
    currency: 'INR',
    interval: 'quarterly',
    intervalCount: 1,
    popular: true,
    bestValue: false,
    features: [
      'unlimited_groups',
      'unlimited_ocr',
      'advanced_analytics',
      'family_sharing',
      'custom_categories',
      'priority_support',
      'export_data',
      'unlimited_accounts',
      'budget_forecasting',
      'ai_insights',
      'investments',
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Premium Half-Yearly',
    code: 'HALFYEARLY_389',
    description: 'Six months of premium access with maximum savings and full control.',
    price: 389,
    currency: 'INR',
    interval: 'halfyearly',
    intervalCount: 1,
    popular: false,
    bestValue: false,
    features: [
      'unlimited_groups',
      'unlimited_ocr',
      'advanced_analytics',
      'family_sharing',
      'custom_categories',
      'priority_support',
      'export_data',
      'unlimited_accounts',
      'budget_forecasting',
      'ai_insights',
      'investments',
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Premium Yearly',
    code: 'YEARLY_699',
    description:
      'Best annual value with unlimited premium tools, full support and long-term savings.',
    price: 699,
    currency: 'INR',
    interval: 'yearly',
    intervalCount: 1,
    popular: false,
    bestValue: true,
    features: [
      'unlimited_groups',
      'unlimited_ocr',
      'advanced_analytics',
      'family_sharing',
      'custom_categories',
      'priority_support',
      'export_data',
      'unlimited_accounts',
      'budget_forecasting',
      'ai_insights',
      'investments',
    ],
    isActive: true,
    sortOrder: 4,
  },
];

async function main() {
  console.log('Seeding plans...');
  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { code: plan.code } });
    if (existing) {
      await prisma.subscriptionPlan.update({ where: { id: existing.id }, data: plan as any });
      console.log(`  Updated plan "${plan.name}" (${plan.interval}) (id=${existing.id})`);
    } else {
      const created = await prisma.subscriptionPlan.create({ data: plan as any });
      console.log(`  Created plan "${created.name}" (${created.interval}) (id=${created.id})`);
    }
  }

  // Ensure system user exists for default categories
  let systemUser = await prisma.user.findFirst({ where: { email: 'system@dabbu.internal' } });
  if (!systemUser) {
    const bcrypt = await import('bcrypt');
    const hashedPw = await bcrypt.hash('SystemPass123!', 10);
    systemUser = await prisma.user.create({
      data: {
        email: 'system@dabbu.internal',
        password: hashedPw,
        firstName: 'System',
        lastName: 'User',
        isActive: false,
        isEmailVerified: true,
      },
    });
    console.log(`  Created system user (id=${systemUser.id})`);
  } else {
    console.log(`  System user exists (id=${systemUser.id})`);
  }

  console.log('Seeding default categories...');
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.transactionCategory.findFirst({
      where: { name: cat.name, isDefault: true, userId: systemUser.id },
    });
    if (existing) {
      console.log(`  Category "${cat.name}" already exists, skipping`);
    } else {
      const created = await prisma.transactionCategory.create({
        data: {
          ...(cat as any),
          userId: systemUser.id,
          isDefault: true,
          isActive: true,
          sortOrder: 0,
        },
      });
      console.log(`  Created category "${created.name}" (id=${created.id})`);
    }
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
