import { TransactionData, SmartGroupSuggestion } from '../types';

export interface Recommendation {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: { label: string; route: string };
}

export class RecommendationEngine {
  generateBudgetRecommendations(
    monthlyIncome: number,
    monthlyExpenses: number,
    categoryBreakdown: { category: string; amount: number }[]
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    const savings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? savings / monthlyIncome : 0;

    if (savingsRate < 0.1) {
      recs.push({
        type: 'savings',
        title: 'Low savings rate',
        description: `You're saving only ${Math.round(savingsRate * 100)}% of income. Try to save at least 20%.`,
        priority: 'high',
        action: { label: 'Set Savings Goal', route: '/goals/create' },
      });
    }

    const foodSpending = categoryBreakdown.find(c => c.category?.toLowerCase().includes('food'));
    if (foodSpending && foodSpending.amount > monthlyIncome * 0.3) {
      recs.push({
        type: 'spending',
        title: 'High food expenses',
        description: `Food is ${Math.round(foodSpending.amount / monthlyIncome * 100)}% of income. Consider a food budget.`,
        priority: 'medium',
        action: { label: 'Create Food Budget', route: '/budgets/create' },
      });
    }

    const subSpending = categoryBreakdown.find(c => c.category?.toLowerCase().includes('subscription'));
    if (subSpending && subSpending.amount > 2000) {
      recs.push({
        type: 'subscription',
        title: 'Review subscriptions',
        description: `₹${subSpending.amount.toLocaleString()} on subscriptions. Check if all are needed.`,
        priority: 'medium',
        action: { label: 'View Subscriptions', route: '/subscriptions' },
      });
    }

    if (monthlyExpenses > monthlyIncome) {
      recs.push({
        type: 'overspend',
        title: 'Spending exceeds income',
        description: `Expenses (₹${monthlyExpenses.toLocaleString()}) exceed income (₹${monthlyIncome.toLocaleString()}).`,
        priority: 'high',
        action: { label: 'Review Expenses', route: '/transactions' },
      });
    }

    if (savingsRate > 0.3) {
      recs.push({
        type: 'investing',
        title: 'Great savings rate!',
        description: `Saving ${Math.round(savingsRate * 100)}% is excellent. Consider investing the surplus.`,
        priority: 'low',
        action: { label: 'Explore Investments', route: '/investments' },
      });
    }

    return recs;
  }

  matchGroupForTransaction(
    description: string,
    amount: number,
    groups: { id: string; name: string; type: string; recentAmounts: number[] }[]
  ): SmartGroupSuggestion[] {
    const suggestions: SmartGroupSuggestion[] = [];
    const desc = description.toLowerCase();

    const merchantPatterns: { pattern: RegExp; merchant: string }[] = [
      { pattern: /\b(petrol|fuel|shell|hp|indian oil|bharat petroleum|ibp)\b/i, merchant: 'fuel' },
      { pattern: /\b(zomato|swiggy|uber eats)\b/i, merchant: 'food_delivery' },
      { pattern: /\b(blinkit|zepto|instamart|big basket)\b/i, merchant: 'grocery' },
      { pattern: /\b(ola|uber|rapido|meru)\b/i, merchant: 'travel' },
      { pattern: /\b(airbnb|booking\.com|makemytrip|goibibo|ixigo)\b/i, merchant: 'travel' },
      { pattern: /\b(amazon|flipkart|myntra)\b/i, merchant: 'shopping' },
      { pattern: /\b(netflix|amazon prime|hotstar|spotify|jio cinema|sony liv|zee5)\b/i, merchant: 'entertainment' },
    ];

    let matchedMerchant = '';
    for (const mp of merchantPatterns) {
      if (mp.pattern.test(desc)) {
        matchedMerchant = mp.merchant;
        break;
      }
    }

    for (const group of groups) {
      let confidence = 0;
      let reason = '';

      if (group.type === 'trip' && matchedMerchant === 'travel') {
        confidence = 0.8;
        reason = `This ${matchedMerchant} expense matches your ${group.name} trip`;
      } else if (group.type === 'shared' && matchedMerchant === 'entertainment') {
        confidence = 0.7;
        reason = `Shared subscriptions group "${group.name}" might need this`;
      } else if (matchedMerchant === 'grocery') {
        confidence = 0.6;
        reason = `Grocery expense could belong to ${group.name}`;
      }

      const amountMatch = group.recentAmounts.some(a => Math.abs(a - amount) / amount < 0.2);
      if (amountMatch && confidence > 0) {
        confidence = Math.min(confidence + 0.15, 1);
      }

      if (confidence > 0.5) {
        suggestions.push({
          groupId: group.id,
          groupName: group.name,
          confidence: Math.round(confidence * 100),
          reason,
          matchedMerchant,
          matchedAmount: amount,
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}
