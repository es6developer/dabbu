interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturnRate: number;
  monthlyExpensesInRetirement: number;
  inflationRate: number;
  existingPensionMonthly?: number;
}

interface RetirementProjectionOutput {
  retirementReadiness: number;
  projectedCorpusAtRetirement: number;
  monthlyIncomeFromCorpus: number;
  monthlyExpensesAtRetirement: number;
  incomeGap: number;
  yearsUntilRetirement: number;
  requiredMonthlyContribution: number;
  status: 'ontrack' | 'ahead' | 'behind' | 'critical';
  recommendations: string[];
}

export class RetirementProjectionEngine {
  projectRetirement(input: RetirementInput): RetirementProjectionOutput {
    const yearsUntilRetirement = Math.max(input.retirementAge - input.currentAge, 0);
    const r = input.annualReturnRate;
    const n = yearsUntilRetirement;
    const P = input.monthlyContribution * 12;
    const PV = input.currentSavings;

    const fvAnnuity = r !== 0 ? P * ((Math.pow(1 + r, n) - 1) / r) : P * n;
    const fvLumpSum = PV * Math.pow(1 + r, n);
    const projectedCorpusAtRetirement = Math.round(fvAnnuity + fvLumpSum);

    const monthlyExpensesAtRetirement = Math.round(
      input.monthlyExpensesInRetirement * Math.pow(1 + input.inflationRate, yearsUntilRetirement)
    );

    const monthlyIncomeFromCorpus = Math.round((projectedCorpusAtRetirement * 0.04) / 12);
    const pensionIncome = input.existingPensionMonthly || 0;
    const totalMonthlyIncome = monthlyIncomeFromCorpus + pensionIncome;

    const incomeGap = totalMonthlyIncome - monthlyExpensesAtRetirement;

    const requiredMonthlyContribution = this.calcRequiredContribution(input);

    const coverageRatio = monthlyExpensesAtRetirement > 0
      ? totalMonthlyIncome / monthlyExpensesAtRetirement
      : 0;

    let status: 'ontrack' | 'ahead' | 'behind' | 'critical';
    if (coverageRatio >= 1.2) status = 'ahead';
    else if (coverageRatio >= 0.8) status = 'ontrack';
    else if (coverageRatio >= 0.5) status = 'behind';
    else status = 'critical';

    const retirementReadiness = Math.min(Math.round(coverageRatio * 100), 100);

    const recommendations: string[] = [];
    if (status === 'critical' || status === 'behind') {
      recommendations.push('Increase monthly contributions to close the income gap');
      recommendations.push(`Target contributing ₹${(requiredMonthlyContribution / 12).toLocaleString()} per month`);
      recommendations.push('Consider delaying retirement or reducing expenses');
      recommendations.push('Explore higher-return investment options');
    } else if (status === 'ontrack') {
      recommendations.push('Stay on track with current contributions');
      recommendations.push('Review portfolio allocation to ensure growth aligns with goals');
    } else {
      recommendations.push('You are ahead of schedule — consider early retirement options');
      recommendations.push('Review if you can optimize for tax efficiency');
    }
    if (input.annualReturnRate < 0.06) {
      recommendations.push('Current return rate is low — consider rebalancing portfolio');
    }
    if (yearsUntilRetirement < 5 && coverageRatio < 1) {
      recommendations.push('Close to retirement with a shortfall — consult a financial advisor');
    }
    if (!input.existingPensionMonthly) {
      recommendations.push('Consider a pension plan for guaranteed retirement income');
    }

    return {
      retirementReadiness,
      projectedCorpusAtRetirement,
      monthlyIncomeFromCorpus,
      monthlyExpensesAtRetirement,
      incomeGap,
      yearsUntilRetirement,
      requiredMonthlyContribution,
      status,
      recommendations,
    };
  }

  private calcRequiredContribution(input: RetirementInput): number {
    const years = Math.max(input.retirementAge - input.currentAge, 1);
    const targetCorpus =
      (input.monthlyExpensesInRetirement * Math.pow(1 + input.inflationRate, years)) /
      0.04 * 12;
    const r = input.annualReturnRate;
    const PV = input.currentSavings;
    const fvLumpSum = PV * Math.pow(1 + r, years);
    const neededFromAnnuity = Math.max(targetCorpus - fvLumpSum, 0);

    if (neededFromAnnuity === 0) return 0;
    if (r === 0) return Math.round(neededFromAnnuity / years / 12);

    const annuityFactor = (Math.pow(1 + r, years) - 1) / r;
    const annualContribution = neededFromAnnuity / annuityFactor;
    return Math.round(annualContribution / 12);
  }
}
