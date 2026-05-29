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
    name: 'Free', price: 0, interval: 'monthly',
    maxAccounts: 2, maxFamilyMembers: 0, maxCategories: 10,
    maxBudgets: 0, maxBills: 0, maxGoals: 0, maxInvestments: 0,
    isActive: true, isDefault: true, sortOrder: 0,
    features: { add_expense: true, edit_expense: true, delete_expense: true },
  },
  {
    name: 'Basic', price: 199, interval: 'monthly',
    maxAccounts: 10, maxFamilyMembers: 0, maxCategories: 30,
    maxBudgets: 10, maxBills: 10, maxGoals: 5, maxInvestments: 0,
    isActive: true, isDefault: false, sortOrder: 1,
    features: { add_expense: true, edit_expense: true, delete_expense: true, budgets: true, bills: true, goals: true, export_data: true },
  },
  {
    name: 'Premium', price: 499, interval: 'monthly',
    maxAccounts: 50, maxFamilyMembers: 5, maxCategories: 100,
    maxBudgets: 50, maxBills: 100, maxGoals: 50, maxInvestments: 20,
    isActive: true, isDefault: false, sortOrder: 2,
    features: { add_expense: true, edit_expense: true, delete_expense: true, budgets: true, bills: true, goals: true, export_data: true, analytics: true, recurring_detection: true, ai_insights: true, unlimited_accounts: true, family_sharing: true, chat: true, investments: true, sms_sync: true, add_category: true },
  },
];

async function main() {
  console.log('Seeding plans...');
  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } });
    if (existing) {
      console.log(`  Plan "${plan.name}" already exists (id=${existing.id}), skipping`);
    } else {
      const created = await prisma.subscriptionPlan.create({ data: plan as any });
      console.log(`  Created plan "${created.name}" (id=${created.id})`);
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
