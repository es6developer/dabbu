import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PLANS = [
  { code: 'MONTHLY_89', period: 'monthly', interval: 1, amount: 8900 },
  { code: 'QUARTERLY_219', period: 'monthly', interval: 3, amount: 21900 },
  { code: 'HALFYEARLY_389', period: 'monthly', interval: 6, amount: 38900 },
  { code: 'YEARLY_699', period: 'yearly', interval: 1, amount: 69900 },
];

async function main() {
  for (const p of PLANS) {
    const plan = await rp.plans.create({
      period: p.period,
      interval: p.interval,
      item: { name: p.code, description: p.code, amount: p.amount, currency: 'INR' },
      notes: { plan_code: p.code },
    });

    await prisma.subscriptionPlan.update({
      where: { code: p.code },
      data: { razorpayPlanId: plan.id },
    });
    // eslint-disable-next-line no-console
    console.log(`Updated ${p.code} with Razorpay ID: ${plan.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
