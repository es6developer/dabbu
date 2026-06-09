interface FamilyWealthInput {
  members: { name: string; age: number; annualIncome: number }[];
  totalAssets: number;
  totalLiabilities: number;
  monthlySavings: number;
  annualReturnRate: number;
  children: { age: number; educationCost: number; educationYear: number }[];
  majorExpenses: { year: number; amount: number; description: string }[];
}

interface FamilyWealthForecastOutput {
  currentNetWorth: number;
  projectedNetWorth: { year: number; netWorth: number; assets: number; liabilities: number }[];
  wealthTrajectory: 'growing' | 'stagnant' | 'declining';
  yearsToDouble: number;
  risks: string[];
  opportunities: string[];
  recommendations: string[];
}

export class FamilyWealthForecastEngine {
  forecastWealth(input: FamilyWealthInput): FamilyWealthForecastOutput {
    const currentNetWorth = input.totalAssets - input.totalLiabilities;
    const projectionYears = 20;
    const projectedNetWorth: { year: number; netWorth: number; assets: number; liabilities: number }[] = [];

    let assets = input.totalAssets;
    let liabilities = input.totalLiabilities;

    const educationCosts = input.children.map(c => ({
      year: c.educationYear,
      amount: c.educationCost,
    }));
    const expenseMap = new Map<number, number>();
    for (const e of educationCosts) {
      expenseMap.set(e.year, (expenseMap.get(e.year) || 0) + e.amount);
    }
    for (const e of input.majorExpenses) {
      expenseMap.set(e.year, (expenseMap.get(e.year) || 0) + e.amount);
    }

    const annualSavings = input.monthlySavings * 12;

    for (let y = 1; y <= projectionYears; y++) {
      assets = assets * (1 + input.annualReturnRate) + annualSavings;
      const debtPaydown = Math.min(liabilities, annualSavings * 0.2);
      liabilities = Math.max(liabilities - debtPaydown, 0);

      const yearExpenses = expenseMap.get(y) || 0;
      assets = Math.max(assets - yearExpenses, 0);

      projectedNetWorth.push({
        year: y,
        netWorth: Math.round(assets - liabilities),
        assets: Math.round(assets),
        liabilities: Math.round(liabilities),
      });
    }

    const year5NetWorth = projectedNetWorth[4]?.netWorth || currentNetWorth;
    let wealthTrajectory: 'growing' | 'stagnant' | 'declining';
    if (year5NetWorth > currentNetWorth * 1.15) wealthTrajectory = 'growing';
    else if (year5NetWorth >= currentNetWorth * 0.95) wealthTrajectory = 'stagnant';
    else wealthTrajectory = 'declining';

    const ratePct = input.annualReturnRate * 100;
    const yearsToDouble = ratePct > 0 ? Math.round(72 / ratePct) : Infinity;

    const risks: string[] = [];
    const opportunities: string[] = [];
    const recommendations: string[] = [];

    for (const c of input.children) {
      if (c.educationYear <= 10) {
        risks.push(`Education cost of ₹${c.educationCost.toLocaleString()} for child due in ${c.educationYear} years`);
      }
    }
    const totalMajorExpenses = input.majorExpenses.reduce((s, e) => s + e.amount, 0);
    if (totalMajorExpenses > currentNetWorth * 0.5) {
      risks.push('Major expenses exceed 50% of current net worth');
    }
    if (input.totalLiabilities > input.totalAssets * 0.4) {
      risks.push('Debt-to-asset ratio is high — above 40%');
    }
    if (wealthTrajectory === 'declining') {
      risks.push('Net worth is declining — review spending and investments');
    }

    if (currentNetWorth > 0 && input.annualReturnRate >= 0.08) {
      opportunities.push('Good return rate — wealth can compound significantly over time');
    }
    if (input.monthlySavings > 0) {
      opportunities.push('Consistent monthly savings will accelerate wealth growth');
    }
    if (input.children.length > 0) {
      opportunities.push('Early education planning can reduce financial burden');
    }

    if (wealthTrajectory === 'declining' || wealthTrajectory === 'stagnant') {
      recommendations.push('Increase monthly savings rate to boost wealth growth');
      recommendations.push('Review and reduce unnecessary expenses');
    }
    if (input.totalLiabilities > 0) {
      recommendations.push('Prioritize paying down high-interest debt');
    }
    if (input.annualReturnRate < 0.06) {
      recommendations.push('Consider higher-return investment options for better growth');
    }
    if (input.members.length > 1 && input.monthlySavings < 10000) {
      recommendations.push('Create a family budget to identify additional savings opportunities');
    }
    recommendations.push('Review and update financial plan annually');

    return {
      currentNetWorth,
      projectedNetWorth,
      wealthTrajectory,
      yearsToDouble,
      risks,
      opportunities,
      recommendations,
    };
  }
}
