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
    const timeline =
      data.currentSavings >= recommendedSavings
        ? 0
        : Math.ceil((recommendedSavings - data.currentSavings) / (data.monthlyIncome * 0.1));

    return {
      estimatedMonthlyCost: monthlyCost,
      recommendedSavingsTarget: recommendedSavings,
      timelineMonths: timeline,
      breakdown: { diapers: '₹3,000-5,000', food: '₹5,000-8,000', healthcare: '₹7,000-12,000' },
    };
  }

  getCarPlanner(data: { budget: number; loanTerm: number; downPayment: number; rate: number }) {
    const loanAmount = data.budget - data.downPayment;
    const monthlyRate = data.rate / 100 / 12;
    const payments = data.loanTerm * 12;
    const emi =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, payments))) /
      (Math.pow(1 + monthlyRate, payments) - 1);
    const totalInterest = emi * payments - loanAmount;
    return {
      affordablePrice: data.budget,
      downPayment: data.downPayment,
      loanAmount,
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(emi * payments),
      tenureYears: data.loanTerm,
    };
  }

  getEducationPlanner(data: {
    courseFee: number;
    yearsUntilCollege: number;
    monthlySaving: number;
  }) {
    const months = data.yearsUntilCollege * 12;
    const targetFee = data.courseFee * Math.pow(1.08, data.yearsUntilCollege);
    const monthlyNeeded = months > 0 ? Math.round(targetFee / months) : targetFee;
    const onTrack = data.monthlySaving >= monthlyNeeded;
    return {
      estimatedFee: Math.round(targetFee),
      monthlySavingNeeded: monthlyNeeded,
      currentSaving: data.monthlySaving,
      onTrack,
      gap: Math.max(0, monthlyNeeded - data.monthlySaving),
      monthsUntilStart: months,
    };
  }

  getVacationPlanner(data: {
    destination: string;
    budget: number;
    monthsUntilTrip: number;
    savedSoFar: number;
  }) {
    const months = Math.max(1, data.monthsUntilTrip);
    const remaining = Math.max(0, data.budget - data.savedSoFar);
    const monthlyNeeded = Math.round(remaining / months);
    return {
      destination: data.destination,
      totalBudget: data.budget,
      savedSoFar: data.savedSoFar,
      monthlySavingNeeded: monthlyNeeded,
      monthsUntilTrip: months,
      recommendedStart: 'Now',
      tips: ['Book flights early', 'Set up auto-transfer', 'Track in a separate space'],
    };
  }

  getWeddingPlanner(data: { guestCount: number; budget: number; monthsUntilWedding: number }) {
    const avgCostPerGuest = Math.round(data.budget / Math.max(1, data.guestCount));
    const monthly = Math.round(data.budget / Math.max(1, data.monthsUntilWedding));
    return {
      guestCount: data.guestCount,
      totalBudget: data.budget,
      avgCostPerGuest,
      monthlySavingNeeded: monthly,
      monthsUntilWedding: data.monthsUntilWedding,
      categoryBreakdown: {
        venue: Math.round(data.budget * 0.35),
        catering: Math.round(data.budget * 0.25),
        attire: Math.round(data.budget * 0.1),
        photography: Math.round(data.budget * 0.08),
        decoration: Math.round(data.budget * 0.07),
        others: Math.round(data.budget * 0.15),
      },
    };
  }

  getInvestmentPlanner(data: {
    age: number;
    monthlyIncome: number;
    currentSavings: number;
    riskProfile: string;
  }) {
    const recommendedRate =
      data.riskProfile === 'high' ? 0.12 : data.riskProfile === 'medium' ? 0.1 : 0.08;
    const monthlyRecommendation = Math.round(data.monthlyIncome * 0.2);
    const projection: { year: number; value: number }[] = [];
    let amount = data.currentSavings;
    for (let y = 1; y <= 30; y++) {
      amount = amount * (1 + recommendedRate) + monthlyRecommendation * 12;
      if (y % 5 === 0) {
        projection.push({ year: y, value: Math.round(amount) });
      }
    }
    return {
      riskProfile: data.riskProfile,
      monthlyRecommendation,
      currentSavings: data.currentSavings,
      annualReturn: `${(recommendedRate * 100).toFixed(0)}%`,
      cagr: `${(recommendedRate * 100).toFixed(1)}%`,
      projection5yr: projection.find((p) => p.year === 5)?.value || Math.round(amount),
      projection10yr:
        projection.find((p) => p.year === 10)?.value ||
        Math.round(amount * Math.pow(1 + recommendedRate, 5)),
      projection30yr: projection.find((p) => p.year === 30)?.value || Math.round(amount),
      breakdown: {
        equity: data.riskProfile === 'high' ? '70%' : data.riskProfile === 'medium' ? '50%' : '30%',
        debt: data.riskProfile === 'high' ? '20%' : data.riskProfile === 'medium' ? '35%' : '50%',
        gold: '5%',
        cash: '5%',
      },
    };
  }

  getRetirementPlanner(data: { age: number; monthlyExpense: number; currentSavings: number }) {
    const retirementTarget = data.monthlyExpense * 12 * 25;
    const yearsToRetirement = 60 - data.age;
    const remaining = Math.max(0, retirementTarget - data.currentSavings);
    const monthlyInvestment =
      yearsToRetirement > 0 ? Math.round(remaining / (yearsToRetirement * 12)) : remaining;

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
