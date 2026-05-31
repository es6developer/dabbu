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
    description: 'Start with expense tracking, basic reports, groups and 5 OCR scans every month.',
    price: 0,
    currency: 'INR',
    interval: 'monthly',
    maxAccounts: 2,
    maxFamilyMembers: 0,
    maxCategories: 10,
    maxBudgets: 2,
    maxBills: 5,
    maxGoals: 2,
    maxInvestments: 0,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
    features: {
      expense_income_tracking: true,
      basic_reports: true,
      groups: true,
      group_limit: 5,
      group_join_limit: 10,
      ocr_scans_per_month: 5,
      reminders: true,
      custom_categories: false,
      family_sharing: false,
      advanced_analytics: false,
      priority_support: false,
      unlimited_accounts: false,
      export_data: false,
    },
  },
  {
    name: 'Premium',
    description: 'Unlock full premium access with unlimited reports, groups, insights and support.',
    price: 89,
    currency: 'INR',
    interval: 'monthly',
    maxAccounts: 50,
    maxFamilyMembers: 20,
    maxCategories: 200,
    maxBudgets: 100,
    maxBills: 200,
    maxGoals: 100,
    maxInvestments: 50,
    isActive: true,
    isDefault: false,
    sortOrder: 1,
    features: {
      expense_income_tracking: true,
      advanced_reports: true,
      smart_alerts: true,
      unlimited_groups: true,
      unlimited_members: true,
      ocr_scans_per_month: 50,
      family_sharing: true,
      custom_categories: true,
      analytics_dashboard: true,
      priority_support: true,
      export_data: true,
      unlimited_accounts: true,
      budget_forecasting: true,
    },
  },
  {
    name: 'Premium',
    description: 'Most popular quarterly plan with full premium benefits at a great price.',
    price: 219,
    currency: 'INR',
    interval: 'quarterly',
    maxAccounts: 50,
    maxFamilyMembers: 20,
    maxCategories: 200,
    maxBudgets: 100,
    maxBills: 200,
    maxGoals: 100,
    maxInvestments: 50,
    isActive: true,
    isDefault: false,
    sortOrder: 2,
    features: {
      expense_income_tracking: true,
      advanced_reports: true,
      smart_alerts: true,
      unlimited_groups: true,
      unlimited_members: true,
      ocr_scans_per_month: 50,
      family_sharing: true,
      custom_categories: true,
      analytics_dashboard: true,
      priority_support: true,
      export_data: true,
      unlimited_accounts: true,
      budget_forecasting: true,
    },
  },
  {
    name: 'Premium',
    description: 'Six-month premium access with the same unlimited savings and more control.',
    price: 389,
    currency: 'INR',
    interval: 'semiannual',
    maxAccounts: 50,
    maxFamilyMembers: 20,
    maxCategories: 200,
    maxBudgets: 100,
    maxBills: 200,
    maxGoals: 100,
    maxInvestments: 50,
    isActive: true,
    isDefault: false,
    sortOrder: 3,
    features: {
      expense_income_tracking: true,
      advanced_reports: true,
      smart_alerts: true,
      unlimited_groups: true,
      unlimited_members: true,
      ocr_scans_per_month: 50,
      family_sharing: true,
      custom_categories: true,
      analytics_dashboard: true,
      priority_support: true,
      export_data: true,
      unlimited_accounts: true,
      budget_forecasting: true,
    },
  },
  {
    name: 'Premium',
    description: 'Best annual value with unlimited premium tools, full support and long-term savings.',
    price: 699,
    currency: 'INR',
    interval: 'yearly',
    maxAccounts: 50,
    maxFamilyMembers: 20,
    maxCategories: 200,
    maxBudgets: 100,
    maxBills: 200,
    maxGoals: 100,
    maxInvestments: 50,
    isActive: true,
    isDefault: false,
    sortOrder: 4,
    features: {
      expense_income_tracking: true,
      advanced_reports: true,
      smart_alerts: true,
      unlimited_groups: true,
      unlimited_members: true,
      ocr_scans_per_month: 50,
      family_sharing: true,
      custom_categories: true,
      analytics_dashboard: true,
      priority_support: true,
      export_data: true,
      unlimited_accounts: true,
      budget_forecasting: true,
    },
  },
];

async function main() {
  console.log('Seeding plans...');
  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name, interval: plan.interval } });
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
        email: 'system@dabbu.internal', password: hashedPw,
        firstName: 'System', lastName: 'User',
        isActive: false, isEmailVerified: true,
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
        data: { ...cat as any, userId: systemUser.id, isDefault: true, isActive: true, sortOrder: 0 },
      });
      console.log(`  Created category "${created.name}" (id=${created.id})`);
    }
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
