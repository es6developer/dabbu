import { Injectable } from '@nestjs/common';

@Injectable()
export class LifeHubService {
  getHousePlanner(data: { salary: number; location: string; downPayment: number }) {
    const maxPrice = data.salary * 4 + data.downPayment;
    const monthly = (maxPrice * 0.08) / 12;
    const years = Math.ceil(maxPrice / (data.salary * 0.3));

    return { maxPrice, monthlyPayment: Math.round(monthly), years };
  }

  getBabyPlanner(data: { monthlyIncome: number; currentSavings: number }) {
    const monthlyCost = Math.min(25000, Math.max(15000, Math.round(data.monthlyIncome * 0.15)));
    const recommendedSavings = monthlyCost * 6;
    const timeline = data.currentSavings >= recommendedSavings
      ? 0
      : Math.ceil((recommendedSavings - data.currentSavings) / (data.monthlyIncome * 0.1));

    return {
      estimatedMonthlyCost: monthlyCost,
      recommendedSavingsTarget: recommendedSavings,
      timelineMonths: timeline,
      breakdown: { diapers: '₹3,000-5,000', food: '₹5,000-8,000', healthcare: '₹7,000-12,000' },
    };
  }

  getRetirementPlanner(data: { age: number; monthlyExpense: number; currentSavings: number }) {
    const retirementTarget = data.monthlyExpense * 12 * 25;
    const yearsToRetirement = 60 - data.age;
    const remaining = Math.max(0, retirementTarget - data.currentSavings);
    const monthlyInvestment = yearsToRetirement > 0
      ? Math.round(remaining / (yearsToRetirement * 12))
      : remaining;

    return {
      retirementTarget,
      currentSavings: data.currentSavings,
      monthlyInvestmentNeeded: monthlyInvestment,
      yearsToRetirement: Math.max(0, yearsToRetirement),
      projection: {
        age: data.age,
        targetAge: 60,
        monthlyExpense: data.monthlyExpense,
        rule: '4% rule (25x annual expenses)',
      },
    };
  }
}
