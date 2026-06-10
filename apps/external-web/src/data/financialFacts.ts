export const FINANCIAL_FACTS: Record<string, { text: string; tier: 'free' | 'premium' }[]> = {
  savings: [
    { text: 'Dabbu users save an average of ₹5,000+ per month using AI insights.', tier: 'free' },
    {
      text: '67% of couples reach their financial goals faster with shared tracking.',
      tier: 'free',
    },
    { text: "Users who track expenses daily save 23% more than those who don't.", tier: 'free' },
    { text: 'Setting a monthly budget increases savings by 34% on average.', tier: 'free' },
    { text: 'The 50/30/20 rule can help you save 20% of your income effortlessly.', tier: 'free' },
    { text: 'Premium users save 2.5x more with AI-powered spending insights.', tier: 'premium' },
    {
      text: 'Round-up savings feature helps Dabbu users save ₹2,000 monthly effortlessly.',
      tier: 'free',
    },
    {
      text: '72% of Dabbu users reduced unnecessary spending within the first month.',
      tier: 'free',
    },
  ],
  splits: [
    { text: 'Splitting ₹45,000 among 6 people? We do the math in 0.3 seconds.', tier: 'free' },
    { text: 'Dabbu handled ₹2.3 crore in shared expenses last month.', tier: 'free' },
    { text: 'Equal splits are the most popular — used in 68% of all transactions.', tier: 'free' },
    { text: 'The average group on Dabbu has 4.5 members.', tier: 'free' },
    {
      text: 'Percentage splits are most common for dinner bills with varying appetites.',
      tier: 'free',
    },
    {
      text: 'Exact splits are preferred by 22% of power users tracking every rupee.',
      tier: 'premium',
    },
    { text: 'Trip groups have the highest average expense of ₹12,000 per person.', tier: 'free' },
    { text: 'Friends split 3x more often than family members on the platform.', tier: 'free' },
  ],
  investments: [
    { text: 'Starting investments early can triple your returns by retirement.', tier: 'free' },
    { text: 'Dabbu users who invest regularly see 12% average annual returns.', tier: 'free' },
    { text: 'Diversifying across 3+ asset classes reduces risk by 40%.', tier: 'free' },
    {
      text: 'SIP investments as low as ₹500/month can build substantial wealth over time.',
      tier: 'free',
    },
    {
      text: 'Premium members get AI-recommended portfolios tailored to their goals.',
      tier: 'premium',
    },
  ],
  security: [
    { text: 'Your data is encrypted with bank-grade AES-256 security.', tier: 'free' },
    { text: 'Dabbu uses multi-factor authentication to protect your account.', tier: 'free' },
    { text: 'All payment transactions are PCI-DSS compliant.', tier: 'free' },
    { text: 'Biometric authentication keeps your financial data safe and secure.', tier: 'free' },
    {
      text: 'Premium members get real-time fraud alerts on suspicious transactions.',
      tier: 'premium',
    },
    {
      text: "Zero-knowledge encryption means even we can't read your transaction data.",
      tier: 'premium',
    },
  ],
  insights: [
    {
      text: "Dabbu's AI has analyzed over 10 million transactions to find savings patterns.",
      tier: 'free',
    },
    {
      text: 'AI detects subscription bills you forgot about — saving you ₹500/month on average.',
      tier: 'free',
    },
    {
      text: 'Your spending patterns are 85% predictable after just 2 weeks of tracking.',
      tier: 'free',
    },
    {
      text: 'Machine learning models improve accuracy by 2% every week with your data.',
      tier: 'free',
    },
    {
      text: 'AI-powered insights help premium users identify tax-saving opportunities.',
      tier: 'premium',
    },
  ],
};

export function getRandomFacts(category: string, count: number = 3): string[] {
  const facts = FINANCIAL_FACTS[category] || FINANCIAL_FACTS.savings;
  const shuffled = [...facts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((f) => f.text);
}

export function getRandomFact(category?: string): string {
  const categories = Object.keys(FINANCIAL_FACTS);
  const cat = category || categories[Math.floor(Math.random() * categories.length)];
  const facts = FINANCIAL_FACTS[cat] || FINANCIAL_FACTS.savings;
  return facts[Math.floor(Math.random() * facts.length)].text;
}
