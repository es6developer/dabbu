import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Aarav',
  'Vihaan',
  'Vivaan',
  'Diya',
  'Ananya',
  'Advik',
  'Kabir',
  'Arjun',
  'Reyansh',
  'Ishaan',
  'Rohan',
  'Neel',
  'Karan',
  'Amit',
  'Rajesh',
  'Suresh',
  'Deepak',
  'Vikram',
  'Sanjay',
  'Manish',
  'Rahul',
  'Nitin',
  'Pradeep',
  'Sunil',
  'Vijay',
  'Akash',
  'Gaurav',
  'Harsh',
  'Kunal',
  'Mohit',
  'Naveen',
  'Pankaj',
  'Ravi',
  'Sachin',
  'Tarun',
  'Varun',
  'Yash',
  'Aanya',
  'Aaradhya',
  'Ishita',
  'Kavya',
  'Myra',
  'Navya',
  'Pari',
  'Sara',
  'Divya',
  'Esha',
  'Neha',
  'Pooja',
  'Ritu',
  'Sneha',
  'Anita',
  'Deepika',
  'Garima',
  'James',
  'Emma',
  'Oliver',
  'Sophia',
  'William',
  'Olivia',
  'Henry',
  'Ava',
  'Alexander',
  'Isabella',
  'Michael',
  'Mia',
  'Daniel',
  'Charlotte',
  'Matthew',
  'Amelia',
  'David',
  'Harper',
  'Joseph',
  'Evelyn',
  'John',
  'Abigail',
  'Robert',
  'Emily',
  'Richard',
  'Elizabeth',
  'Charles',
  'Grace',
  'Christopher',
  'Victoria',
];
const LAST_NAMES = [
  'Sharma',
  'Verma',
  'Patel',
  'Kumar',
  'Singh',
  'Reddy',
  'Gupta',
  'Joshi',
  'Nair',
  'Menon',
  'Iyer',
  'Rao',
  'Deshmukh',
  'Kulkarni',
  'Pillai',
  'Malhotra',
  'Kapoor',
  'Khanna',
  'Mehta',
  'Shah',
  'Agarwal',
  'Jain',
  'Bose',
  'Sen',
  'Das',
  'Chakraborty',
  'Banerjee',
  'Mukherjee',
  'Chatterjee',
  'Saxena',
  'Srivastava',
  'Mishra',
  'Pandey',
  'Tiwari',
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Martinez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Clark',
  'Lewis',
];
const CITIES = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Jaipur',
  'Ahmedabad',
  'Lucknow',
  'Chandigarh',
  'Indore',
  'New York',
  'San Francisco',
  'London',
  'Dubai',
  'Singapore',
  'Toronto',
  'Sydney',
  'Berlin',
  'Paris',
  'Tokyo',
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function randomPastDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, days));
  return d;
}
function generateEmail(first: string, last: string) {
  return `${first.toLowerCase()}.${last.toLowerCase()}${randomInt(1, 999)}@gmail.com`;
}

async function main() {
  console.log('\n🌱 Seeding Dabbu...\nClearing existing data...');

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.quotaTracking.deleteMany(),
    prisma.featureFlag.deleteMany(),
    prisma.webhookEvent.deleteMany(),
    prisma.notificationLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.smsDetection.deleteMany(),
    prisma.sharedTask.deleteMany(),
    prisma.sharedReminder.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatParticipant.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.familyMember.deleteMany(),
    prisma.family.deleteMany(),
    prisma.recurringReminder.deleteMany(),
    prisma.reminder.deleteMany(),
    prisma.investment.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.device.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.currency.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.transactionCategory.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('  ✓ Cleared\n');

  // ── Plans ──
  const plans = [
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

  const planRecords: Array<{
    id: string;
    name: string;
    price: number;
    interval: string;
    maxAccounts: number;
    maxCategories: number;
    maxBudgets: number;
    maxBills: number;
    maxGoals: number;
    maxFamilyMembers: number;
  }> = [];
  for (const p of plans) {
    const rec: any = await prisma.subscriptionPlan.create({ data: p as any });
    planRecords.push(rec);
  }
  console.log(`  ✓ ${planRecords.length} plans`);

  const hashedPw = await bcrypt.hash('TestPass123!', 10);

  // ── Default Categories ──
  const systemUser = await prisma.user.create({
    data: {
      email: 'system@dabbu.internal',
      password: hashedPw,
      firstName: 'System',
      lastName: 'User',
      isActive: false,
      isEmailVerified: true,
    },
  });
  console.log('  ✓ system user for default categories');

  const defaultCats = [
    { name: 'Salary', icon: 'briefcase', color: '#2ecc71', transactionType: 'income' },
    { name: 'Freelance', icon: 'laptop', color: '#3498db', transactionType: 'income' },
    { name: 'Investments', icon: 'trending-up', color: '#9b59b6', transactionType: 'income' },
    { name: 'Food & Dining', icon: 'coffee', color: '#e74c3c', transactionType: 'expense' },
    { name: 'Groceries', icon: 'shopping-cart', color: '#f39c12', transactionType: 'expense' },
    { name: 'Shopping', icon: 'shopping-bag', color: '#e91e63', transactionType: 'expense' },
    { name: 'Entertainment', icon: 'film', color: '#9c27b0', transactionType: 'expense' },
    { name: 'Transportation', icon: 'car', color: '#ff5722', transactionType: 'expense' },
    { name: 'Utilities', icon: 'zap', color: '#ffc107', transactionType: 'expense' },
    { name: 'Rent', icon: 'home', color: '#795548', transactionType: 'expense' },
    { name: 'Health', icon: 'activity', color: '#4caf50', transactionType: 'expense' },
    { name: 'Subscriptions', icon: 'repeat', color: '#607d8b', transactionType: 'expense' },
    { name: 'EMI / Loans', icon: 'credit-card', color: '#f44336', transactionType: 'expense' },
    { name: 'Insurance', icon: 'shield', color: '#00bcd4', transactionType: 'expense' },
    {
      name: 'Miscellaneous',
      icon: 'more-horizontal',
      color: '#9e9e9e',
      transactionType: 'expense',
    },
    { name: 'Other Income', icon: 'plus-circle', color: '#27ae60', transactionType: 'income' },
    { name: 'Other Expenses', icon: 'minus-circle', color: '#e74c3c', transactionType: 'expense' },
  ];

  const categoryRecords: Array<{ id: string; name: string; transactionType: string }> = [];
  for (const cat of defaultCats) {
    const rec = await prisma.transactionCategory.create({
      data: {
        ...(cat as any),
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        userId: systemUser.id,
      },
    });
    categoryRecords.push(rec);
  }

  // Create user-owned copies
  const userCategoryMap = new Map<string, string[]>();

  // ── Demo Mobile User ──
  const userRecords: Array<{ id: string; email: string; firstName: string; lastName: string }> = [];
  const accountRecords: Array<{ id: string; userId: string; type: string; balance: any }> = [];

  const freePlanId = planRecords[0].id;
  const basicPlanId = planRecords[1].id;
  const premiumPlanId = planRecords[2].id;

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@dabbu.app',
      password: hashedPw,
      firstName: 'Demo',
      lastName: 'User',
      phone: '+919999999999',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isActive: true,
      isEmailVerified: true,
      role: 'user',
      settings: {
        create: {
          theme: 'dark',
          weeklyReport: true,
          monthlyReport: true,
          pushNotifications: true,
          emailNotifications: true,
          autoDetectTransactions: true,
          defaultCurrency: 'INR',
          dateFormat: 'DD/MM/yyyy',
          firstDayOfWeek: 1,
          language: 'en',
        },
      },
      subscription: {
        create: {
          planId: premiumPlanId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        },
      },
    },
    include: { settings: true },
  });
  userRecords.push(demoUser);

  // Create demo user categories & accounts
  const demoCategories = [
    'Food & Dining',
    'Groceries',
    'Shopping',
    'Entertainment',
    'Transportation',
    'Utilities',
    'Rent',
    'Health',
    'Subscriptions',
    'Salary',
    'Freelance',
  ];
  const demoCatIds: string[] = [];
  for (const catName of demoCategories) {
    const src = defaultCats.find((c) => c.name === catName) || defaultCats[0];
    const cat = await prisma.transactionCategory.create({
      data: {
        ...(src as any),
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        userId: demoUser.id,
      },
    });
    demoCatIds.push(cat.id);
  }
  userCategoryMap.set(demoUser.id, demoCatIds);

  // Demo accounts
  const demoAccounts = [
    {
      name: 'HDFC Salary Account',
      type: 'bank',
      balance: randomFloat(25000, 150000),
      currency: 'INR',
      institution: 'HDFC Bank',
      lastFourDigits: '4521',
    },
    {
      name: 'ICICI Savings',
      type: 'bank',
      balance: randomFloat(10000, 75000),
      currency: 'INR',
      institution: 'ICICI Bank',
      lastFourDigits: '7834',
    },
    {
      name: 'Cash Wallet',
      type: 'cash',
      balance: randomFloat(2000, 30000),
      currency: 'INR',
      institution: 'Cash',
    },
    {
      name: 'AMEX Platinum',
      type: 'credit',
      balance: randomFloat(-50000, 0),
      currency: 'INR',
      institution: 'American Express',
      lastFourDigits: '9901',
    },
  ];
  for (const acct of demoAccounts) {
    const a = await prisma.account.create({
      data: { ...(acct as any), userId: demoUser.id, isActive: true },
    });
    accountRecords.push(a);
  }
  console.log('  ✓ 1 demo user with accounts and categories');

  // ── Free Test User ──
  const freeUser = await prisma.user.create({
    data: {
      email: 'freeuser@dabbu.app',
      password: hashedPw,
      firstName: 'Free',
      lastName: 'User',
      phone: '+919999999998',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isActive: true,
      isEmailVerified: true,
      role: 'user',
      settings: {
        create: {
          theme: 'light',
          weeklyReport: false,
          monthlyReport: false,
          pushNotifications: true,
          emailNotifications: true,
          autoDetectTransactions: false,
          defaultCurrency: 'INR',
          dateFormat: 'DD/MM/yyyy',
          firstDayOfWeek: 1,
          language: 'en',
        },
      },
      subscription: {
        create: {
          planId: freePlanId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        },
      },
    },
    include: { settings: true },
  });
  userRecords.push(freeUser);

  const freeCategories = [
    'Food & Dining',
    'Groceries',
    'Shopping',
    'Transportation',
    'Utilities',
    'Rent',
    'Health',
    'Miscellaneous',
  ];
  const freeCatIds: string[] = [];
  for (const catName of freeCategories) {
    const src = defaultCats.find((c) => c.name === catName) || defaultCats[0];
    const cat = await prisma.transactionCategory.create({
      data: {
        ...(src as any),
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        userId: freeUser.id,
      },
    });
    freeCatIds.push(cat.id);
  }
  userCategoryMap.set(freeUser.id, freeCatIds);

  const freeAccounts = [
    {
      name: 'SBI Savings',
      type: 'bank',
      balance: randomFloat(5000, 25000),
      currency: 'INR',
      institution: 'State Bank of India',
      lastFourDigits: '1234',
    },
    {
      name: 'Cash',
      type: 'cash',
      balance: randomFloat(1000, 10000),
      currency: 'INR',
      institution: 'Cash',
    },
  ];
  for (const acct of freeAccounts) {
    const a = await prisma.account.create({
      data: { ...(acct as any), userId: freeUser.id, isActive: true },
    });
    accountRecords.push(a);
  }
  console.log('  ✓ 1 free user with accounts and categories');

  // ── Admin Users ──
  const adminHashedPw = await bcrypt.hash('Admin@123', 10);
  const adminUsers = [
    {
      email: 'admin@dabbu.app',
      password: adminHashedPw,
      name: 'Admin User',
      role: 'super_admin',
      permissions: { all: true },
      isActive: true,
    },
  ];
  await prisma.adminUser.createMany({ data: adminUsers });
  console.log(`  ✓ ${adminUsers.length} admin user`);

  // ── Feature Flags (names must match mobile FeatureKey) ──
  const flags = [
    { name: 'add_expense', description: 'Add Expense', isEnabled: true },
    { name: 'edit_expense', description: 'Edit Expense', isEnabled: true },
    { name: 'delete_expense', description: 'Delete Expense', isEnabled: true },
    { name: 'add_category', description: 'Add Custom Category', isEnabled: true },
    { name: 'sms_sync', description: 'SMS Auto-sync', isEnabled: true },

    { name: 'analytics', description: 'Advanced Analytics', isEnabled: true },
    { name: 'recurring_detection', description: 'Recurring Detection', isEnabled: true },
    { name: 'ai_insights', description: 'AI Insights', isEnabled: true },
    { name: 'export_data', description: 'Export PDF/Excel', isEnabled: true },
    { name: 'unlimited_accounts', description: 'Unlimited Accounts', isEnabled: true },
    { name: 'family_sharing', description: 'Family Sharing', isEnabled: true },
    { name: 'chat', description: 'Family Chat', isEnabled: true },
    { name: 'budgets', description: 'Budgets', isEnabled: true },
    { name: 'bills', description: 'Bills', isEnabled: true },
    { name: 'goals', description: 'Goals', isEnabled: true },
    { name: 'investments', description: 'Investments', isEnabled: true },
  ];

  for (const f of flags) {
    await prisma.featureFlag.create({ data: f as any });
  }
  console.log(`  ✓ ${flags.length} feature flags`);

  // ── Webhook events ──
  for (let w = 0; w < 20; w++) {
    await prisma.webhookEvent.create({
      data: {
        gateway: randomElement(['stripe', 'razorpay']),
        eventId: `evt_${crypto.randomBytes(12).toString('hex')}`,
        eventType: randomElement([
          'payment_intent.succeeded',
          'invoice.paid',
          'subscription.created',
          'charge.refunded',
        ]),
        status: randomElement(['processed', 'processed', 'pending']),
        requestBody: { id: `evt_${w}`, type: 'payment' },
      },
    });
  }
  console.log('  ✓ 20 webhook events');

  // ── Notifications ──
  for (const user of userRecords.slice(0, 30)) {
    const notifTypes = ['bill_reminder', 'budget_alert', 'goal_milestone', 'weekly_report'];
    for (const type of notifTypes) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type,
          title: `${type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
          message: 'Tap to view details',
          isRead: Math.random() < 0.5,
        },
      });
    }
  }
  console.log('  ✓ notifications created');

  // ── Currencies ──
  const currencies = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
    { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
    { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
    { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', locale: 'de-CH' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', locale: 'es-MX' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', locale: 'pl-PL' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', locale: 'ar-EG' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'en-PK' },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', locale: 'si-LK' },
    { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', locale: 'ne-NP' },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }
  console.log(`  ✓ ${currencies.length} currencies`);

  console.log('\n✅ Seed complete!');
  console.log(`   Users: ${userRecords.length}`);
  console.log(`   Admins: 1`);
  console.log(`\n📧 Test credentials:`);
  console.log(`   User: demo@dabbu.app / TestPass123! (Basic plan - premium)`);
  console.log(`   User: freeuser@dabbu.app / TestPass123! (Free plan)`);
  console.log(`   Admin: admin@dabbu.app / Admin@123\n`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
