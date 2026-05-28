import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEATURE_FLAGS = [
  { name: 'add_expense', description: 'Add Expense' },
  { name: 'edit_expense', description: 'Edit Expense' },
  { name: 'delete_expense', description: 'Delete Expense' },
  { name: 'add_category', description: 'Add Custom Category' },
  { name: 'sms_sync', description: 'SMS Auto-sync' },
  { name: 'analytics', description: 'Advanced Analytics' },
  { name: 'recurring_detection', description: 'Recurring Detection' },
  { name: 'ai_insights', description: 'AI Insights' },
  { name: 'export_data', description: 'Export PDF/Excel' },
  { name: 'unlimited_accounts', description: 'Unlimited Accounts' },
  { name: 'family_sharing', description: 'Family Sharing' },
  { name: 'chat', description: 'Family Chat' },
  { name: 'budgets', description: 'Budgets' },
  { name: 'bills', description: 'Bills' },
  { name: 'goals', description: 'Goals' },
  { name: 'investments', description: 'Investments' },
];

const OLD_NAMES = ['sms_detection', 'family_chat', 'export_pdf', 'investment_tracker', 'budget_alerts', 'multi_currency', 'dark_mode', 'weekly_report', 'biometric_auth'];

async function main() {
  console.log('Syncing feature flags...');

  const existing = await prisma.featureFlag.findMany();
  const existingNames = new Set(existing.map((f) => f.name));

  // Check for old-named flags and migrate them
  for (const oldName of OLD_NAMES) {
    const oldFlag = existing.find((f) => f.name === oldName);
    if (oldFlag) {
      console.log(`  Deleting old flag: ${oldName}`);
      await prisma.featureFlag.delete({ where: { id: oldFlag.id } });
    }
  }

  // Create missing flags
  for (const flag of FEATURE_FLAGS) {
    const exists = existingNames.has(flag.name) && !OLD_NAMES.includes(flag.name);
    if (exists) {
      console.log(`  Skipping (exists): ${flag.name}`);
      continue;
    }
    // Check if it was already created from old migration
    const already = await prisma.featureFlag.findUnique({ where: { name: flag.name } });
    if (already) {
      console.log(`  Skipping (exists): ${flag.name}`);
      continue;
    }
    await prisma.featureFlag.create({
      data: {
        name: flag.name,
        description: flag.description,
        isEnabled: true,
      },
    });
    console.log(`  Created: ${flag.name}`);
  }

  // Update descriptions for existing ones
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.updateMany({
      where: { name: flag.name },
      data: { description: flag.description },
    });
  }

  console.log('Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
