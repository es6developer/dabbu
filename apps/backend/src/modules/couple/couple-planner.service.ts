import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface BabyPlannerInput {
  timeline: '6months' | '1year' | '2years' | '3years' | 'flexible';
  currentSavings: number;
  monthlyIncome: number;
  existingLoanEmi: number;
  hospitalType: 'govt' | 'private' | 'corporate';
}

interface BabyPlannerOutput {
  recommendedSavings: number;
  medicalCosts: number;
  emergencyFund: number;
  monthlyTarget: number;
  progressPercent: number;
  deliveryDate: string;
  monthsUntilDelivery: number;
  totalNeeded: number;
}

interface HousePlannerInput {
  propertyPrice: number;
  downPayment: number;
  interestRate: number;
  loanTenure: number;
  monthlyIncome: number;
  existingEmi: number;
}

interface HousePlannerOutput {
  loanAmount: number;
  downPaymentPercent: number;
  emiEstimate: number;
  totalInterest: number;
  totalPayment: number;
  affordabilityScore: number;
  bestTimeToBuy: string;
  emiToIncomeRatio: number;
  isAffordable: boolean;
  monthlyBreakdown: { emi: number; maintenance: number; insurance: number; total: number };
}

interface CarPlannerInput {
  carPrice: number;
  downPayment: number;
  interestRate: number;
  loanTenure: number;
  monthlyIncome: number;
  existingEmi: number;
}

interface CarPlannerOutput {
  loanAmount: number;
  emi: number;
  insuranceAnnual: number;
  fuelMonthly: number;
  maintenanceAnnual: number;
  totalMonthlyCost: number;
  affordabilityScore: number;
  isAffordable: boolean;
  runningCostPerKm: number;
}

interface RetirementPlannerInput {
  currentAge: number;
  retirementAge: number;
  monthlyExpense: number;
  currentCorpus: number;
  monthlySavings: number;
  inflationRate: number;
  expectedReturns: number;
}

interface RetirementPlannerOutput {
  targetCorpus: number;
  monthlyTarget: number;
  gap: number;
  currentProjection: number;
  isOnTrack: boolean;
  yearsToRetirement: number;
  inflationAdjustedExpense: number;
}

@Injectable()
export class CouplePlannerService {
  private readonly logger = new Logger(CouplePlannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlanners(groupId: string) {
    return this.prisma.couplePlanner.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlanner(groupId: string, plannerType: string) {
    const planner = await this.prisma.couplePlanner.findUnique({
      where: { groupId_plannerType: { groupId, plannerType } },
    });
    if (!planner) {
      throw new NotFoundException('Planner not found');
    }
    return planner;
  }

  async deletePlanner(groupId: string, plannerType: string) {
    const planner = await this.getPlanner(groupId, plannerType);
    await this.prisma.couplePlanner.delete({ where: { id: planner.id } });
    return { message: 'Planner deleted' };
  }

  async babyPlanner(groupId: string, partner1Id: string, input: BabyPlannerInput) {
    const medicalCosts = this.calculateMedicalCosts(input.hospitalType);
    const emergencyFund = input.monthlyIncome * 6;
    const monthsUntilDelivery = this.monthsUntilDelivery(input.timeline);
    const totalNeeded = medicalCosts.total + emergencyFund + (input.currentSavings > 0 ? 0 : 50000);
    const monthlyTarget = Math.max(0, (totalNeeded - input.currentSavings) / monthsUntilDelivery);
    const recommendedSavings = Math.max(monthlyTarget, input.monthlyIncome * 0.15);
    const progressPercent = Math.min(100, Math.round((input.currentSavings / totalNeeded) * 100));

    const output: BabyPlannerOutput = {
      recommendedSavings: Math.round(recommendedSavings),
      medicalCosts: medicalCosts.total,
      emergencyFund: Math.round(emergencyFund),
      monthlyTarget: Math.round(monthlyTarget),
      progressPercent,
      deliveryDate: this.deliveryDate(input.timeline),
      monthsUntilDelivery,
      totalNeeded: Math.round(totalNeeded),
    };

    await this.prisma.couplePlanner.upsert({
      where: { groupId_plannerType: { groupId, plannerType: 'BABY' } },
      update: {
        targetAmount: totalNeeded,
        currentSavings: input.currentSavings,
        monthlyTarget,
        babyTimeline: input.timeline,
        medicalBudget: medicalCosts.total,
        emergencyFund,
        hospitalType: input.hospitalType,
        metadata: output as any,
      },
      create: {
        groupId,
        plannerType: 'BABY',
        targetAmount: totalNeeded,
        currentSavings: input.currentSavings,
        monthlyTarget,
        babyTimeline: input.timeline,
        medicalBudget: medicalCosts.total,
        emergencyFund,
        hospitalType: input.hospitalType,
        metadata: output as any,
      },
    });

    return output;
  }

  async housePlanner(groupId: string, input: HousePlannerInput) {
    const loanAmount = input.propertyPrice - input.downPayment;
    const downPaymentPercent = (input.downPayment / input.propertyPrice) * 100;
    const monthlyRate = input.interestRate / 12 / 100;
    const totalMonths = input.loanTenure * 12;
    const emi =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const totalPayment = emi * totalMonths;
    const totalInterest = totalPayment - loanAmount;
    const monthlyMaintenance = input.propertyPrice * 0.001;
    const monthlyInsurance = (input.propertyPrice * 0.003) / 12;
    const totalMonthlyEmi = emi + monthlyMaintenance + monthlyInsurance + input.existingEmi;
    const emiToIncomeRatio = (totalMonthlyEmi / input.monthlyIncome) * 100;
    const isAffordable = emiToIncomeRatio <= 50;

    const bestTimeToBuy = this.bestTimeToBuy(downPaymentPercent, emiToIncomeRatio);

    const affordabilityScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (downPaymentPercent >= 20 ? 25 : (downPaymentPercent / 20) * 25) +
            (emiToIncomeRatio <= 30 ? 35 : Math.max(0, 35 - (emiToIncomeRatio - 30))) +
            (input.propertyPrice / (input.monthlyIncome * 12) <= 5
              ? 25
              : Math.max(0, 25 - (input.propertyPrice / (input.monthlyIncome * 12) - 5) * 5)) +
            (input.existingEmi === 0
              ? 15
              : Math.max(0, 15 - (input.existingEmi / input.monthlyIncome) * 30)),
        ),
      ),
    );

    const output: HousePlannerOutput = {
      loanAmount: Math.round(loanAmount),
      downPaymentPercent: Math.round(downPaymentPercent * 100) / 100,
      emiEstimate: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
      affordabilityScore,
      bestTimeToBuy,
      emiToIncomeRatio: Math.round(emiToIncomeRatio * 100) / 100,
      isAffordable,
      monthlyBreakdown: {
        emi: Math.round(emi),
        maintenance: Math.round(monthlyMaintenance),
        insurance: Math.round(monthlyInsurance),
        total: Math.round(totalMonthlyEmi),
      },
    };

    await this.prisma.couplePlanner.upsert({
      where: { groupId_plannerType: { groupId, plannerType: 'HOUSE' } },
      update: {
        targetAmount: input.propertyPrice,
        currentSavings: input.downPayment,
        monthlyTarget: Math.round(emi),
        propertyPrice: input.propertyPrice,
        downPayment: input.downPayment,
        loanAmount,
        interestRate: input.interestRate,
        loanTenure: input.loanTenure,
        emiEstimate: Math.round(emi),
        affordabilityScore,
        metadata: output as any,
      },
      create: {
        groupId,
        plannerType: 'HOUSE',
        targetAmount: input.propertyPrice,
        currentSavings: input.downPayment,
        monthlyTarget: Math.round(emi),
        propertyPrice: input.propertyPrice,
        downPayment: input.downPayment,
        loanAmount,
        interestRate: input.interestRate,
        loanTenure: input.loanTenure,
        emiEstimate: Math.round(emi),
        affordabilityScore,
        metadata: output as any,
      },
    });

    return output;
  }

  async carPlanner(groupId: string, input: CarPlannerInput) {
    const loanAmount = input.carPrice - input.downPayment;
    const monthlyRate = input.interestRate / 12 / 100;
    const totalMonths = input.loanTenure * 12;
    const emi =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const insuranceAnnual = input.carPrice * 0.05;
    const fuelMonthly = input.carPrice * 0.008;
    const maintenanceAnnual = input.carPrice * 0.03;
    const totalMonthlyCost = emi + insuranceAnnual / 12 + fuelMonthly + maintenanceAnnual / 12;
    const totalMonthlyEmi = totalMonthlyCost + input.existingEmi;
    const emiToIncomeRatio = (totalMonthlyEmi / input.monthlyIncome) * 100;
    const isAffordable = emiToIncomeRatio <= 40;
    const runningCostPerKm = (fuelMonthly * 12 + maintenanceAnnual) / 12000;

    const affordabilityScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (input.downPayment / input.carPrice >= 0.2
            ? 30
            : (input.downPayment / input.carPrice / 0.2) * 30) +
            (emiToIncomeRatio <= 20 ? 40 : Math.max(0, 40 - (emiToIncomeRatio - 20) * 2)) +
            (input.existingEmi === 0
              ? 30
              : Math.max(0, 30 - (input.existingEmi / input.monthlyIncome) * 50)),
        ),
      ),
    );

    const output: CarPlannerOutput = {
      loanAmount: Math.round(loanAmount),
      emi: Math.round(emi),
      insuranceAnnual: Math.round(insuranceAnnual),
      fuelMonthly: Math.round(fuelMonthly),
      maintenanceAnnual: Math.round(maintenanceAnnual),
      totalMonthlyCost: Math.round(totalMonthlyCost),
      affordabilityScore,
      isAffordable,
      runningCostPerKm: Math.round(runningCostPerKm * 100) / 100,
    };

    await this.prisma.couplePlanner.upsert({
      where: { groupId_plannerType: { groupId, plannerType: 'CAR' } },
      update: {
        targetAmount: input.carPrice,
        currentSavings: input.downPayment,
        monthlyTarget: Math.round(emi),
        carPrice: input.carPrice,
        carDownPayment: input.downPayment,
        carLoanAmount: loanAmount,
        carInterestRate: input.interestRate,
        carLoanTenure: input.loanTenure,
        carEmi: Math.round(emi),
        carInsuranceAnnual: Math.round(insuranceAnnual),
        carFuelMonthly: Math.round(fuelMonthly),
        carMaintenanceAnnual: Math.round(maintenanceAnnual),
        metadata: output as any,
      },
      create: {
        groupId,
        plannerType: 'CAR',
        targetAmount: input.carPrice,
        currentSavings: input.downPayment,
        monthlyTarget: Math.round(emi),
        carPrice: input.carPrice,
        carDownPayment: input.downPayment,
        carLoanAmount: loanAmount,
        carInterestRate: input.interestRate,
        carLoanTenure: input.loanTenure,
        carEmi: Math.round(emi),
        carInsuranceAnnual: Math.round(insuranceAnnual),
        carFuelMonthly: Math.round(fuelMonthly),
        carMaintenanceAnnual: Math.round(maintenanceAnnual),
        metadata: output as any,
      },
    });

    return output;
  }

  async retirementPlanner(groupId: string, input: RetirementPlannerInput) {
    const yearsToRetirement = input.retirementAge - input.currentAge;
    const inflationAdjustedExpense =
      input.monthlyExpense * Math.pow(1 + input.inflationRate / 100, yearsToRetirement);
    const targetCorpus = inflationAdjustedExpense * 12 * 25;
    const monthlyReturn = input.expectedReturns / 12 / 100;
    const totalMonths = yearsToRetirement * 12;
    const currentProjection =
      input.currentCorpus * Math.pow(1 + input.expectedReturns / 100, yearsToRetirement);

    let futureValue = 0;
    for (let i = 0; i < totalMonths; i++) {
      futureValue = (futureValue + input.monthlySavings) * (1 + monthlyReturn);
    }
    const totalProjection = currentProjection + futureValue;
    const gap = Math.max(0, targetCorpus - totalProjection);

    const neededMonthly = this.pmt(monthlyReturn, totalMonths, 0, -gap, 0);
    const monthlyTarget = Math.max(input.monthlySavings, neededMonthly);
    const isOnTrack = gap <= 0;

    const output: RetirementPlannerOutput = {
      targetCorpus: Math.round(targetCorpus),
      monthlyTarget: Math.round(monthlyTarget),
      gap: Math.round(gap),
      currentProjection: Math.round(totalProjection),
      isOnTrack,
      yearsToRetirement,
      inflationAdjustedExpense: Math.round(inflationAdjustedExpense),
    };

    await this.prisma.couplePlanner.upsert({
      where: { groupId_plannerType: { groupId, plannerType: 'RETIREMENT' } },
      update: {
        targetAmount: Math.round(targetCorpus),
        currentSavings: input.currentCorpus,
        monthlyTarget: Math.round(monthlyTarget),
        currentAge: input.currentAge,
        retirementAge: input.retirementAge,
        monthlyExpense: input.monthlyExpense,
        expectedCorpus: Math.round(targetCorpus),
        inflationRate: input.inflationRate,
        expectedReturns: input.expectedReturns,
        metadata: output as any,
      },
      create: {
        groupId,
        plannerType: 'RETIREMENT',
        targetAmount: Math.round(targetCorpus),
        currentSavings: input.currentCorpus,
        monthlyTarget: Math.round(monthlyTarget),
        currentAge: input.currentAge,
        retirementAge: input.retirementAge,
        monthlyExpense: input.monthlyExpense,
        expectedCorpus: Math.round(targetCorpus),
        inflationRate: input.inflationRate,
        expectedReturns: input.expectedReturns,
        metadata: output as any,
      },
    });

    return output;
  }

  private calculateMedicalCosts(hospitalType: string) {
    const costs = {
      govt: { delivery: 15000, prenatal: 5000, postnatal: 3000, emergency: 10000 },
      private: { delivery: 60000, prenatal: 15000, postnatal: 10000, emergency: 25000 },
      corporate: { delivery: 150000, prenatal: 30000, postnatal: 20000, emergency: 50000 },
    };
    const c = costs[hospitalType] || costs.private;
    return { ...c, total: c.delivery + c.prenatal + c.postnatal + c.emergency };
  }

  private monthsUntilDelivery(timeline: string): number {
    const map = { '6months': 6, '1year': 12, '2years': 24, '3years': 36, flexible: 18 };
    return map[timeline] || 12;
  }

  private deliveryDate(timeline: string): string {
    const months = this.monthsUntilDelivery(timeline);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  private bestTimeToBuy(downPaymentPercent: number, emiRatio: number): string {
    if (downPaymentPercent >= 20 && emiRatio <= 30) {
      return 'Now is the best time';
    }
    if (downPaymentPercent >= 20) {
      return `Save more to reduce EMI burden (currently ${Math.round(emiRatio)}% of income)`;
    }
    return `Save until down payment is 20% (currently ${Math.round(downPaymentPercent)}%)`;
  }

  private pmt(rate: number, nper: number, pv: number, fv: number, type: number): number {
    if (rate === 0) {
      return -(pv + fv) / nper;
    }
    const pvif = Math.pow(1 + rate, nper);
    let pmt = (rate / (pvif - 1)) * -(pv * pvif + fv);
    if (type === 1) {
      pmt /= 1 + rate;
    }
    return pmt;
  }
}
