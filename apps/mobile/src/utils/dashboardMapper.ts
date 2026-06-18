function addDaysRemaining(bill: any): any {
  if (bill.daysRemaining != null) return bill;
  if (!bill.dueDate) return { ...bill, daysRemaining: '-' };
  const due = new Date(bill.dueDate);
  if (isNaN(due.getTime())) return { ...bill, daysRemaining: '-' };
  const diff = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { ...bill, daysRemaining: diff < 0 ? 0 : diff };
}

export function mapPersonalDashboard(raw: any): any {
  if (!raw) return {};
  return {
    greeting: raw.greeting || { name: 'User', balance: 0, change: 0 },
    netWorth: raw.netWorth
      ? {
          assets: Number(raw.netWorth.totalAssets || raw.netWorth.assets || 0),
          liabilities: Number(raw.netWorth.totalLiabilities || raw.netWorth.liabilities || 0),
          total: Number(raw.netWorth.netWorth || raw.netWorth.total || 0),
          snapshots: Array.isArray(raw.netWorth.trend) ? raw.netWorth.trend.map((s: any) => ({
            date: s.date || s.snapshotDate,
            value: Number(s.netWorth || s.value || 0),
            assets: Number(s.totalAssets || 0),
            liabilities: Number(s.totalLiabilities || 0),
          })) : [],
        }
      : { assets: 0, liabilities: 0, total: 0, snapshots: [] },
    monthlySnapshot: raw.monthlySnapshot || { income: 0, expense: 0, saved: 0, savingsRate: 0 },
    healthScore: raw.healthScore || { score: 0, subScores: [0, 0, 0, 0, 0] },
    aiInsight: raw.aiInsight || { title: null, text: null },
    upcomingBills: Array.isArray(raw.upcomingBills) ? raw.upcomingBills.map(addDaysRemaining) : [],
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    recentTransactions: Array.isArray(raw.recentTransactions) ? raw.recentTransactions : [],
    budgetsOverview: Array.isArray(raw.budgetsOverview) ? raw.budgetsOverview : [],
    quickActions: Array.isArray(raw.quickActions) ? raw.quickActions : undefined,
  };
}

export function mapCoupleDashboard(raw: any): any {
  if (!raw) return {};
  return {
    coupleHero: raw.coupleHero || {
      partner1Name: 'Partner 1', partner2Name: 'Partner 2', togetherSince: '',
    },
    combinedWealth: raw.combinedWealth || { totalAssets: 0, savings: 0, investments: 0, netWorth: 0 },
    coupleSnapshot: raw.coupleSnapshot || {
      yourContribution: { amount: 0 }, partnerContribution: { amount: 0 },
      combinedIncome: 0, combinedExpense: 0, combinedSavings: 0,
    },
    sharedSavings: raw.sharedSavings || { current: 0, target: 0, remaining: 0, expectedCompletion: null },
    coupleHealth: raw.coupleHealth || { score: 0, subScores: [0, 0, 0, 0, 0] },
    sharedExpenses: Array.isArray(raw.sharedExpenses) ? raw.sharedExpenses : [],
    upcomingBills: Array.isArray(raw.upcomingBills) ? raw.upcomingBills.map(addDaysRemaining) : [],
    coupleAI: raw.coupleAI || { title: null, text: null },
    coupleGoals: Array.isArray(raw.coupleGoals) ? raw.coupleGoals : [],
    coupleTimeline: raw.coupleTimeline?.events
      ? raw.coupleTimeline
      : Array.isArray(raw.coupleTimeline)
        ? { events: raw.coupleTimeline, level: 1, xp: 0 }
        : { events: [], level: 1, xp: 0 },
    quickActions: Array.isArray(raw.quickActions) ? raw.quickActions : undefined,
  };
}

export function mapFamilyDashboard(raw: any): any {
  if (!raw) return {};
  return {
    familyHero: {
      familyName: raw.familyHero?.familyName || raw.name || 'Family',
      memberCount: raw.familyHero?.memberCount ?? raw.memberCount ?? 0,
      familySince: raw.familyHero?.familySince || raw.createdAt || '',
      members: Array.isArray(raw.familyHero?.members) ? raw.familyHero.members.map((m: any) => ({
        name: m.user?.firstName || m.firstName || m.name || 'M',
      })) : [],
    },
    familyWealth: raw.familyWealth || { totalAssets: 0, savings: 0, investments: 0, properties: 0, loans: 0, netWorth: 0 },
    familySnapshot: raw.familySnapshot || { income: 0, expense: 0, savings: 0, budgetUtilization: 0 },
    familyContributions: Array.isArray(raw.familyContributions) ? raw.familyContributions : [],
    familyExpenses: Array.isArray(raw.familyExpenses) ? raw.familyExpenses : [],
    familyBills: Array.isArray(raw.familyBills) ? raw.familyBills.map(addDaysRemaining) : [],
    familyGoals: Array.isArray(raw.familyGoals) ? raw.familyGoals : [],
    familyInsights: raw.familyInsights || { title: null, text: null },
    familyTimeline: Array.isArray(raw.familyTimeline) ? raw.familyTimeline : [],
    familyHealth: raw.familyHealth || { score: 0, subScores: [0, 0, 0, 0, 0, 0] },
    quickActions: Array.isArray(raw.quickActions) ? raw.quickActions : undefined,
  };
}
