import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Housing', icon: 'home', color: '#FB923C', transactionType: 'expense' },
  { name: 'Groceries', icon: 'shopping-cart', color: '#34C759', transactionType: 'expense' },
  { name: 'Food & Dining', icon: 'coffee', color: '#FF6B6B', transactionType: 'expense' },
  { name: 'Utilities', icon: 'zap', color: '#FBBF24', transactionType: 'expense' },
  { name: 'Transportation', icon: 'car', color: '#38BDF8', transactionType: 'expense' },
  { name: 'Healthcare', icon: 'activity', color: '#FF4D4F', transactionType: 'expense' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#F472B6', transactionType: 'expense' },
  { name: 'Entertainment', icon: 'film', color: '#8B5CF6', transactionType: 'expense' },
  { name: 'Travel', icon: 'airplane', color: '#60A5FA', transactionType: 'expense' },
  { name: 'Children & Baby', icon: 'happy', color: '#FF9F0A', transactionType: 'expense' },
  { name: 'Financial', icon: 'shield', color: '#00CEC9', transactionType: 'expense' },
  { name: 'Other', icon: 'more-horizontal', color: '#636E72', transactionType: 'expense' },
  { name: 'Employment', icon: 'briefcase', color: '#00B894', transactionType: 'income' },
  { name: 'Business', icon: 'storefront', color: '#6366F1', transactionType: 'income' },
  { name: 'Freelancing', icon: 'laptop', color: '#3498DB', transactionType: 'income' },
  { name: 'Investments', icon: 'trending-up', color: '#9B59B6', transactionType: 'income' },
  { name: 'Rental', icon: 'home', color: '#FB923C', transactionType: 'income' },
  { name: 'Gifts & Rewards', icon: 'gift', color: '#F472B6', transactionType: 'income' },
  { name: 'Family Contributions', icon: 'people', color: '#FF6B00', transactionType: 'income' },
  { name: 'Other', icon: 'more-horizontal', color: '#636E72', transactionType: 'income' },
];

const PLANS = [
  {
    name: 'Free',
    code: 'FREE',
    description: 'Personal Dashboard, Manual Expense & Income Tracking, Basic Categories, Basic Reports, Basic Goals (3), Basic Budget (3), Basic AI Insights, UPI Settlements, Couple Invitation.',
    price: 0,
    currency: 'INR',
    interval: 'monthly',
    intervalCount: 1,
    popular: false,
    bestValue: false,
    features: [
      'personal_dashboard',
      'expense_income_tracking',
      'basic_reports',
      'basic_goals',
      'basic_budget',
      'basic_ai_insights',
      'upi_settlements',
      'couple_invitation',
    ],
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Premium Monthly',
    code: 'PREMIUM_MONTHLY',
    description: 'Everything in Free plus: Unlimited Transactions, Goals, Budgets, History, Advanced Reports, PDF/Excel Export, Net Worth, Financial Health Score, AI Coach, Custom Categories, Investment Tracking, Bill Predictions, Document Vault, Priority Support.',
    price: 99,
    currency: 'INR',
    interval: 'monthly',
    intervalCount: 1,
    popular: false,
    bestValue: false,
    features: [
      'unlimited_transactions',
      'unlimited_goals',
      'unlimited_budgets',
      'unlimited_history',
      'advanced_reports',
      'export_pdf',
      'export_excel',
      'net_worth',
      'health_score',
      'advanced_ai_insights',
      'ai_coach',
      'custom_categories',
      'investment_tracker',
      'bill_prediction',
      'emergency_fund',
      'document_vault',
      'priority_support',
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Premium Yearly',
    code: 'PREMIUM_YEARLY',
    description: 'Same as Premium Monthly — billed annually at ₹999/yr (saves 16%).',
    price: 999,
    currency: 'INR',
    interval: 'yearly',
    intervalCount: 1,
    popular: false,
    bestValue: true,
    features: [
      'unlimited_transactions',
      'unlimited_goals',
      'unlimited_budgets',
      'unlimited_history',
      'advanced_reports',
      'export_pdf',
      'export_excel',
      'net_worth',
      'health_score',
      'advanced_ai_insights',
      'ai_coach',
      'custom_categories',
      'investment_tracker',
      'bill_prediction',
      'emergency_fund',
      'document_vault',
      'priority_support',
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Family Monthly',
    code: 'FAMILY_MONTHLY',
    description: 'Everything in Premium plus: Family Dashboard, Family Space, Family Goals, Family Wealth, Family Calendar, Family AI Advisor, Up To 6 Members, Shared Vault.',
    price: 199,
    currency: 'INR',
    interval: 'monthly',
    intervalCount: 1,
    popular: true,
    bestValue: false,
    features: [
      'unlimited_transactions',
      'unlimited_goals',
      'unlimited_budgets',
      'unlimited_history',
      'advanced_reports',
      'export_pdf',
      'export_excel',
      'net_worth',
      'health_score',
      'advanced_ai_insights',
      'ai_coach',
      'custom_categories',
      'investment_tracker',
      'bill_prediction',
      'emergency_fund',
      'document_vault',
      'priority_support',
      'family_dashboard',
      'family_space',
      'family_goals',
      'family_wealth',
      'family_calendar',
      'family_ai_advisor',
      'shared_vault',
      'max_6_members',
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Family Yearly',
    code: 'FAMILY_YEARLY',
    description: 'Same as Family Monthly — billed annually at ₹1999/yr (saves 16%).',
    price: 1999,
    currency: 'INR',
    interval: 'yearly',
    intervalCount: 1,
    popular: false,
    bestValue: true,
    features: [
      'unlimited_transactions',
      'unlimited_goals',
      'unlimited_budgets',
      'unlimited_history',
      'advanced_reports',
      'export_pdf',
      'export_excel',
      'net_worth',
      'health_score',
      'advanced_ai_insights',
      'ai_coach',
      'custom_categories',
      'investment_tracker',
      'bill_prediction',
      'emergency_fund',
      'document_vault',
      'priority_support',
      'family_dashboard',
      'family_space',
      'family_goals',
      'family_wealth',
      'family_calendar',
      'family_ai_advisor',
      'shared_vault',
      'max_6_members',
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
