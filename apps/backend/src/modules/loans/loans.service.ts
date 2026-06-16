import { Injectable } from '@nestjs/common';
import { LoansRepository } from './loans.repository';
import { CreateLoanDto, UpdateLoanDto, CreateEmiPaymentDto } from './dto/loans.dto';

@Injectable()
export class LoansService {
  constructor(private readonly repo: LoansRepository) {}

  async create(userId: string, dto: CreateLoanDto) {
    const data: any = {
      userId,
      name: dto.name,
      type: dto.type || 'personal',
      totalAmount: dto.totalAmount ?? 0,
      paidAmount: dto.paidAmount ?? 0,
      interestPaid: dto.interestPaid ?? 0,
      interestRate: dto.interestRate ?? 0,
      monthlyEmi: dto.monthlyEmi ?? 0,
    };
    if (dto.tenureMonths !== undefined) data.tenureMonths = dto.tenureMonths;
    if (dto.emiDay !== undefined) data.emiDay = dto.emiDay;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    return this.repo.create(data);
  }

  async findAll(userId: string) {
    const loans: any[] = await this.repo.findAll(userId);
    const totalRemaining = loans.reduce(
      (sum, l) => sum + (Number(l.totalAmount) - Number(l.paidAmount)),
      0,
    );
    const totalEmi = loans.reduce((sum, l) => sum + Number(l.monthlyEmi), 0);
    const now = new Date();
    const enriched = loans.map((l: any) => {
      let nextEmiDate: string | null = null;
      if (l.emiDay) {
        const next = new Date(now.getFullYear(), now.getMonth(), l.emiDay);
        if (next < now) next.setMonth(next.getMonth() + 1);
        nextEmiDate = next.toISOString().split('T')[0];
      }
      return {
        ...l,
        totalAmount: Number(l.totalAmount),
        paidAmount: Number(l.paidAmount),
        interestPaid: Number(l.interestPaid),
        interestRate: Number(l.interestRate),
        monthlyEmi: Number(l.monthlyEmi),
        tenureMonths: l.tenureMonths,
        nextEmiDate,
        remaining: Number(l.totalAmount) - Number(l.paidAmount),
      };
    });
    return { loans: enriched, totalRemaining, totalEmi, count: loans.length };
  }

  async findOne(id: string, userId: string) {
    const loan: any = await this.repo.findOne(id, userId);
    if (!loan) return null;
    let nextEmiDate: string | null = null;
    if (loan.emiDay) {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), loan.emiDay);
      if (next < now) next.setMonth(next.getMonth() + 1);
      nextEmiDate = next.toISOString().split('T')[0];
    }
    return {
      ...loan,
      totalAmount: Number(loan.totalAmount),
      paidAmount: Number(loan.paidAmount),
      interestPaid: Number(loan.interestPaid),
      interestRate: Number(loan.interestRate),
      monthlyEmi: Number(loan.monthlyEmi),
      tenureMonths: loan.tenureMonths,
      nextEmiDate,
      remaining: Number(loan.totalAmount) - Number(loan.paidAmount),
    };
  }

  async update(id: string, userId: string, dto: UpdateLoanDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.totalAmount !== undefined) data.totalAmount = dto.totalAmount;
    if (dto.paidAmount !== undefined) data.paidAmount = dto.paidAmount;
    if (dto.interestPaid !== undefined) data.interestPaid = dto.interestPaid;
    if (dto.interestRate !== undefined) data.interestRate = dto.interestRate;
    if (dto.monthlyEmi !== undefined) data.monthlyEmi = dto.monthlyEmi;
    if (dto.tenureMonths !== undefined) data.tenureMonths = dto.tenureMonths;
    if (dto.emiDay !== undefined) data.emiDay = dto.emiDay;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    await this.repo.updateMany({ id, userId }, data);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    return this.repo.updateMany({ id, userId }, { deletedAt: new Date() });
  }

  // ─── AMORTIZATION SCHEDULE ─────────────────────────────────

  async getAmortizationSchedule(id: string, userId: string) {
    const loan = await this.findOne(id, userId);
    if (!loan) return null;
    const principal = loan.totalAmount;
    const rate = loan.interestRate / 100 / 12;
    const emi = loan.monthlyEmi;
    const months = loan.tenureMonths || 0;

    if (!emi || !principal || !months) {
      return { schedule: [], summary: null };
    }

    let balance = principal - loan.paidAmount;
    const schedule: any[] = [];
    let totalInterest = 0;

    for (let m = 1; m <= months && balance > 0; m++) {
      const interest = balance * rate;
      const principalPaid = Math.min(emi - interest, balance);
      balance = Math.max(0, balance - principalPaid);
      totalInterest += interest;
      schedule.push({
        month: m,
        emi: Math.round(emi * 100) / 100,
        principal: Math.round(principalPaid * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }

    return {
      schedule,
      summary: {
        totalEmi: Math.round(emi * schedule.length * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalMonths: schedule.length,
        monthlyEmi: emi,
      },
    };
  }

  // ─── PAYOFF PROJECTION ─────────────────────────────────────

  async getPayoffProjection(id: string, userId: string) {
    const loan = await this.findOne(id, userId);
    if (!loan) return null;
    const principal = loan.totalAmount;
    const rate = loan.interestRate / 100 / 12;
    const emi = loan.monthlyEmi;
    const balance = principal - loan.paidAmount;
    const remainingMonths = loan.tenureMonths
      ? Math.max(0, loan.tenureMonths - Math.round(loan.paidAmount / (emi || 1)))
      : Math.ceil(balance / (emi || 1));

    if (!emi || !principal) {
      return { scenarios: [], currentStatus: null };
    }

    const scenarios = [
      { label: 'Current EMI', extraPerMonth: 0 },
      { label: '+10% Extra', extraPerMonth: Math.round(emi * 0.1) },
      { label: '+25% Extra', extraPerMonth: Math.round(emi * 0.25) },
      { label: '+50% Extra', extraPerMonth: Math.round(emi * 0.5) },
    ].map((scenario) => {
      let bal = balance;
      const totalEmi = emi + scenario.extraPerMonth;
      let months = 0;
      let totalInterest = 0;
      while (bal > 0 && months < 600) {
        const interest = bal * rate;
        const principalPaid = Math.min(totalEmi - interest, bal);
        bal = Math.max(0, bal - principalPaid);
        totalInterest += interest;
        months++;
      }
      const currentInterest = (() => {
        let cb = balance;
        let ci = 0;
        let cm = 0;
        while (cb > 0 && cm < 600) {
          const intr = cb * rate;
          ci += intr;
          cb -= emi - intr;
          cm++;
        }
        return ci;
      })();
      const monthsSaved = remainingMonths - months;
      const interestSaved = Math.max(0, currentInterest - totalInterest);
      return {
        ...scenario,
        totalEmi: Math.round(totalEmi * 100) / 100,
        monthsToPayoff: months,
        totalInterest: Math.round(totalInterest * 100) / 100,
        interestSaved: Math.round(interestSaved * 100) / 100,
        monthsSaved: Math.max(0, monthsSaved),
      };
    });

    return {
      currentBalance: Math.round(balance * 100) / 100,
      monthlyEmi: emi,
      remainingMonths,
      scenarios,
    };
  }

  // ─── EMI PAYMENTS ──────────────────────────────────────────

  async recordEmiPayment(loanId: string, userId: string, dto: CreateEmiPaymentDto) {
    const loan = await this.repo.findOne(loanId, userId);
    if (!loan) throw new Error('Loan not found');

    const paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
    const principal = dto.principal ?? dto.amount;
    const interest = dto.interest ?? 0;

    const payment = await this.repo.createEmiPayment({
      loanId,
      userId,
      amount: dto.amount,
      paidDate,
      principal,
      interest,
      notes: dto.notes || null,
    });

    const newPaid = Number(loan.paidAmount) + principal;
    const newInterestPaid = Number(loan.interestPaid) + interest;
    await this.repo.updateMany(
      { id: loanId, userId },
      { paidAmount: newPaid, interestPaid: newInterestPaid },
    );

    return payment;
  }

  async getEmiHistory(loanId: string, userId: string) {
    const loan = await this.repo.findOne(loanId, userId);
    if (!loan) return null;
    return this.repo.findEmiPayments(loanId);
  }

  async getAllEmiHistory(userId: string) {
    return this.repo.findEmiPaymentsByUser(userId);
  }

  async getLoanLiabilities(userId: string) {
    return this.repo.getTotalLiability(userId);
  }
}
