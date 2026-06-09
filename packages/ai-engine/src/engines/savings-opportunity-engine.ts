interface SavTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: string;
}

interface SavingsOpportunity {
  type: 'duplicate_subscription' | 'unused_subscription' | 'food_delivery' | 'atm_fees' | 'shopping_frequency' | 'impulse_purchase';
  title: string;
  description: string;
  monthlySavings: number;
  category?: string;
  actionLabel?: string;
  actionRoute?: string;
}

export class SavingsOpportunityEngine {
  findDuplicateSubscriptions(transactions: SavTransactionData[]): SavingsOpportunity[] {
    const knownServices = ['netflix', 'spotify', 'amazon prime', 'prime video', 'hotstar', 'disney+', 'zomato pro', 'swiggy one', 'youtube premium', 'apple music', 'apple tv', 'zee5', 'sonyliv', 'jiotv', 'voot', 'linkedin', 'medium', 'notion', 'google drive', 'icloud'];
    const results: SavingsOpportunity[] = [];

    for (const service of knownServices) {
      const matching = transactions.filter(t =>
        t.description?.toLowerCase().includes(service)
      );

      if (matching.length >= 2) {
        const totalMonthly = matching.reduce((s, t) => s + t.amount, 0);
        const avgAmount = totalMonthly / matching.length;
        results.push({
          type: 'duplicate_subscription',
          title: `Duplicate ${service.charAt(0).toUpperCase() + service.slice(1)} Subscription`,
          description: `You paid for ${service} ${matching.length} times — totalling ₹${totalMonthly.toLocaleString()}. Consider keeping just one.`,
          monthlySavings: Math.round(avgAmount),
          category: service,
          actionLabel: 'Review Subscriptions',
          actionRoute: '/subscriptions',
        });
      }
    }

    return results;
  }

  findUnusedSubscriptions(transactions: SavTransactionData[]): SavingsOpportunity[] {
    const subscriptionPatterns = [
      { name: 'Netflix', keywords: ['netflix'] },
      { name: 'Spotify', keywords: ['spotify'] },
      { name: 'Amazon Prime', keywords: ['amazon prime', 'prime video'] },
      { name: 'Disney+ Hotstar', keywords: ['hotstar', 'disney+'] },
      { name: 'Zomato Pro', keywords: ['zomato pro'] },
      { name: 'Swiggy One', keywords: ['swiggy one'] },
      { name: 'YouTube Premium', keywords: ['youtube premium'] },
      { name: 'Apple Music', keywords: ['apple music'] },
      { name: 'Apple TV', keywords: ['apple tv'] },
      { name: 'LinkedIn Premium', keywords: ['linkedin'] },
      { name: 'Medium', keywords: ['medium'] },
      { name: 'Notion', keywords: ['notion'] },
      { name: 'Google Drive', keywords: ['google drive'] },
      { name: 'iCloud', keywords: ['icloud'] },
    ];

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const results: SavingsOpportunity[] = [];

    for (const pattern of subscriptionPatterns) {
      const subTxns = transactions.filter(t =>
        pattern.keywords.some(k => t.description?.toLowerCase().includes(k))
      );
      if (subTxns.length === 0) continue;

      const recentTxn = subTxns[subTxns.length - 1];
      if (recentTxn.date < sixMonthsAgo) {
        const monthlyAmount = subTxns[0].amount;
        results.push({
          type: 'unused_subscription',
          title: `${pattern.name} May Be Unused`,
          description: `Last ${pattern.name} payment was ${this.formatDate(recentTxn.date)}. You may not be using it.`,
          monthlySavings: Math.round(monthlyAmount),
          category: pattern.name,
          actionLabel: 'Cancel Subscription',
          actionRoute: '/subscriptions',
        });
      }

      if (pattern.name === 'Netflix' || pattern.name === 'Disney+ Hotstar') {
        const usageTxns = transactions.filter(t =>
          t.category?.toLowerCase().includes('entertainment') || pattern.keywords.some(k => t.description?.toLowerCase().includes(k))
        );
        if (usageTxns.length <= subTxns.length) {
          const monthlyAmount = subTxns[0].amount;
          const existing = results.find(r => r.category === pattern.name);
          if (!existing) {
            results.push({
              type: 'unused_subscription',
              title: `${pattern.name} Not Streaming`,
              description: `You're paying for ${pattern.name} but we see no related activity. Consider pausing.`,
              monthlySavings: Math.round(monthlyAmount),
              category: pattern.name,
              actionLabel: 'Cancel Subscription',
              actionRoute: '/subscriptions',
            });
          }
        }
      }
    }

    return results;
  }

  analyzeFoodDelivery(transactions: SavTransactionData[]): SavingsOpportunity[] {
    const foodApps = ['swiggy', 'zomato', 'uber eats', 'zepto', 'blinkit', 'instamart', 'dunzo'];
    const foodTxns = transactions.filter(t =>
      foodApps.some(app => t.description?.toLowerCase().includes(app)) ||
      t.category?.toLowerCase() === 'food delivery'
    );

    if (foodTxns.length === 0) return [];

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentFoodTxns = foodTxns.filter(t => t.date >= oneMonthAgo);
    const monthlySpend = recentFoodTxns.reduce((s, t) => s + t.amount, 0);

    if (monthlySpend < 500) return [];

    const savingsTarget = Math.round(monthlySpend * 0.5);
    return [{
      type: 'food_delivery',
      title: 'Reduce Food Delivery Spending',
      description: `You spent ₹${monthlySpend.toLocaleString()} on food delivery this month. Cutting by half could save ₹${savingsTarget.toLocaleString()}.`,
      monthlySavings: savingsTarget,
      category: 'Food Delivery',
      actionLabel: 'Set Budget',
      actionRoute: '/budgets',
    }];
  }

  analyzeAtmWithdrawals(transactions: SavTransactionData[]): SavingsOpportunity[] {
    const atmTxns = transactions.filter(t =>
      t.description?.toLowerCase().includes('atm') ||
      t.description?.toLowerCase().includes('withdrawal') ||
      t.type?.toLowerCase() === 'atm' ||
      t.category?.toLowerCase() === 'atm'
    );

    if (atmTxns.length === 0) return [];

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentAtm = atmTxns.filter(t => t.date >= oneMonthAgo);
    const monthlyCount = Math.max(recentAtm.length, 1);
    const avgFee = 25;
    const totalFees = monthlyCount * avgFee;

    if (monthlyCount < 2) return [];

    return [{
      type: 'atm_fees',
      title: 'Reduce ATM Withdrawals',
      description: `You withdrew cash ${monthlyCount} times this month. Each ATM visit may cost ~₹${avgFee} in fees — that's ₹${totalFees} lost.`,
      monthlySavings: totalFees,
      category: 'ATM Fees',
      actionLabel: 'Track Withdrawals',
      actionRoute: '/spending',
    }];
  }

  analyzeShoppingFrequency(transactions: SavTransactionData[]): SavingsOpportunity[] {
    const shoppingCategories = ['shopping', 'clothing', 'electronics', 'home', 'lifestyle'];
    const shoppingTxns = transactions.filter(t =>
      shoppingCategories.some(c => t.category?.toLowerCase().includes(c))
    );

    if (shoppingTxns.length === 0) return [];

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentShopping = shoppingTxns.filter(t => t.date >= oneMonthAgo);
    const monthlyCount = recentShopping.length;
    const monthlySpend = recentShopping.reduce((s, t) => s + t.amount, 0);

    if (monthlyCount <= 8) return [];

    const savingsTarget = Math.round(monthlySpend * 0.3);
    return [{
      type: 'shopping_frequency',
      title: 'Frequent Shopping Habit',
      description: `You shopped ${monthlyCount} times this month (₹${monthlySpend.toLocaleString()}). Cutting 30% could save ₹${savingsTarget.toLocaleString()}.`,
      monthlySavings: savingsTarget,
      category: 'Shopping',
      actionLabel: 'Set Shopping Budget',
      actionRoute: '/budgets',
    }];
  }

  detectAll(transactions: SavTransactionData[]): SavingsOpportunity[] {
    const results: SavingsOpportunity[] = [
      ...this.findDuplicateSubscriptions(transactions),
      ...this.findUnusedSubscriptions(transactions),
      ...this.analyzeFoodDelivery(transactions),
      ...this.analyzeAtmWithdrawals(transactions),
      ...this.analyzeShoppingFrequency(transactions),
    ];

    results.sort((a, b) => b.monthlySavings - a.monthlySavings);
    return results;
  }

  private formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}
