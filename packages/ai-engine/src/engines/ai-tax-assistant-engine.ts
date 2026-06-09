interface TaxTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

interface TaxSection80C {
  lifeInsurance: number;
  ppf: number;
  epf: number;
  elss: number;
  nsc: number;
  tuitionFees: number;
  fixedDeposits: number;
  other: number;
}

interface TaxInput {
  annualIncome: number;
  otherIncome: number;
  sections: {
    section80C: TaxSection80C;
    section80D: number;
    section80G: number;
    hraExemption: number;
    homeLoanInterest: number;
    standardDeduction: number;
    npsContribution: number;
  };
  tdsDeducted: number;
  regime: 'old' | 'new';
  transactions: TaxTransactionData[];
}

interface TaxOutput {
  taxableIncome: number;
  taxLiability: number;
  effectiveTaxRate: number;
  tdsAlreadyDeducted: number;
  taxPayableOrRefund: number;
  regimeComparison: { old: number; new: number; better: 'old' | 'new' };
  savingsOpportunities: { section: string; description: string; potentialSavings: number }[];
  deductedExpenses: { category: string; amount: number; description: string }[];
}

export class AiTaxPreparationAssistant {
  calculateTax(input: TaxInput): TaxOutput {
    const grossIncome = input.annualIncome + input.otherIncome;

    const oldTax = this.calcOldRegimeTax(grossIncome, input);
    const newTax = this.calcNewRegimeTax(grossIncome, input);

    const better = oldTax <= newTax ? 'old' : 'new';
    const taxLiability = input.regime === 'old' ? oldTax : newTax;
    const taxableIncome = input.regime === 'old'
      ? this.calcOldTaxableIncome(grossIncome, input)
      : this.calcNewTaxableIncome(grossIncome, input);

    const effectiveTaxRate = taxableIncome > 0 ? Math.round((taxLiability / taxableIncome) * 10000) / 100 : 0;
    const taxPayableOrRefund = taxLiability - input.tdsDeducted;

    const deductedExpenses = this.analyzeDeductedExpenses(input);
    const savingsOpportunities = this.identifySavingsOpportunities(input);

    return {
      taxableIncome,
      taxLiability,
      effectiveTaxRate,
      tdsAlreadyDeducted: input.tdsDeducted,
      taxPayableOrRefund,
      regimeComparison: { old: oldTax, new: newTax, better },
      savingsOpportunities,
      deductedExpenses,
    };
  }

  private section80CTotal(s: TaxSection80C): number {
    return Math.min(
      s.lifeInsurance + s.ppf + s.epf + s.elss + s.nsc + s.tuitionFees + s.fixedDeposits + s.other,
      150000
    );
  }

  private calcOldTaxableIncome(grossIncome: number, input: TaxInput): number {
    const deductions =
      this.section80CTotal(input.sections.section80C) +
      Math.min(input.sections.section80D, 50000) +
      input.sections.section80G +
      input.sections.hraExemption +
      Math.min(input.sections.homeLoanInterest, 200000) +
      input.sections.standardDeduction +
      Math.min(input.sections.npsContribution, 50000);
    return Math.max(grossIncome - deductions, 0);
  }

  private calcNewTaxableIncome(grossIncome: number, input: TaxInput): number {
    return Math.max(grossIncome - input.sections.standardDeduction, 0);
  }

  private calcOldRegimeTax(grossIncome: number, input: TaxInput): number {
    const taxable = this.calcOldTaxableIncome(grossIncome, input);
    return this.applyOldSlabs(taxable);
  }

  private calcNewRegimeTax(grossIncome: number, input: TaxInput): number {
    const taxable = this.calcNewTaxableIncome(grossIncome, input);
    return this.applyNewSlabs(taxable);
  }

  private applyOldSlabs(taxable: number): number {
    let tax = 0;
    if (taxable > 1000000) {
      tax += (taxable - 1000000) * 0.30;
      tax += 500000 * 0.20;
      tax += 250000 * 0.05;
    } else if (taxable > 500000) {
      tax += (taxable - 500000) * 0.20;
      tax += 250000 * 0.05;
    } else if (taxable > 250000) {
      tax += (taxable - 250000) * 0.05;
    }
    return Math.round(tax * 1.04);
  }

  private applyNewSlabs(taxable: number): number {
    let tax = 0;
    if (taxable > 1500000) {
      tax += (taxable - 1500000) * 0.30;
      tax += 300000 * 0.20;
      tax += 200000 * 0.15;
      tax += 200000 * 0.10;
      tax += 300000 * 0.05;
    } else if (taxable > 1200000) {
      tax += (taxable - 1200000) * 0.20;
      tax += 200000 * 0.15;
      tax += 200000 * 0.10;
      tax += 300000 * 0.05;
    } else if (taxable > 1000000) {
      tax += (taxable - 1000000) * 0.15;
      tax += 200000 * 0.10;
      tax += 300000 * 0.05;
    } else if (taxable > 700000) {
      tax += (taxable - 700000) * 0.10;
      tax += 300000 * 0.05;
    } else if (taxable > 300000) {
      tax += (taxable - 300000) * 0.05;
    }
    return Math.round(tax * 1.04);
  }

  private analyzeDeductedExpenses(input: TaxInput): { category: string; amount: number; description: string }[] {
    const expenses: { category: string; amount: number; description: string }[] = [];

    const txnMap = new Map<string, number>();
    for (const t of input.transactions) {
      if (t.type === 'expense' && t.category) {
        txnMap.set(t.category, (txnMap.get(t.category) || 0) + t.amount);
      }
    }

    for (const [category, amount] of txnMap) {
      const lower = category.toLowerCase();
      if (lower.includes('insurance') || lower.includes('medical')) {
        expenses.push({ category, amount, description: 'Possible section 80D deduction' });
      } else if (lower.includes('donation') || lower.includes('charity')) {
        expenses.push({ category, amount, description: 'Possible section 80G deduction' });
      } else if (lower.includes('rent')) {
        expenses.push({ category, amount, description: 'Possible HRA exemption' });
      } else if (lower.includes('education') || lower.includes('tuition')) {
        expenses.push({ category, amount, description: 'Possible section 80C deduction (tuition fees)' });
      }
    }

    return expenses;
  }

  private identifySavingsOpportunities(input: TaxInput): { section: string; description: string; potentialSavings: number }[] {
    const opportunities: { section: string; description: string; potentialSavings: number }[] = [];
    const total80C = this.section80CTotal(input.sections.section80C);

    if (total80C < 150000) {
      const remaining = 150000 - total80C;
      opportunities.push({
        section: '80C',
        description: `You have ₹${remaining.toLocaleString()} unused under section 80C — invest in ELSS, PPF, or life insurance`,
        potentialSavings: Math.round(remaining * 0.30),
      });
    }
    if (input.sections.section80D < 50000) {
      const remaining = 50000 - input.sections.section80D;
      opportunities.push({
        section: '80D',
        description: `You can claim up to ₹${remaining.toLocaleString()} more for health insurance premiums`,
        potentialSavings: Math.round(remaining * 0.30),
      });
    }
    if (input.sections.npsContribution < 50000) {
      const remaining = 50000 - input.sections.npsContribution;
      opportunities.push({
        section: '80CCD(1B)',
        description: `Claim up to ₹${remaining.toLocaleString()} more through NPS contributions`,
        potentialSavings: Math.round(remaining * 0.30),
      });
    }
    if (!input.sections.hraExemption && input.regime === 'old') {
      opportunities.push({
        section: 'HRA',
        description: 'If you live in rented accommodation, claim HRA exemption',
        potentialSavings: 0,
      });
    }

    return opportunities;
  }
}
