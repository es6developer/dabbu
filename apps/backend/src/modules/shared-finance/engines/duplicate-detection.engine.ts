import { Injectable } from '@nestjs/common';

interface ExpenseCheck {
  description: string;
  amount: number;
  paidBy: string;
  category?: string;
  date?: string;
  notes?: string;
}

interface ExistingExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  category: string;
  date: Date;
  notes?: string;
  payer?: { id: string; firstName: string; lastName: string };
}

interface DuplicateResult {
  isDuplicate: boolean;
  confidence: 'high' | 'medium' | 'low';
  matches: {
    expenseId: string;
    reason: string;
    similarity: number;
  }[];
}

@Injectable()
export class DuplicateDetectionEngine {
  detect(check: ExpenseCheck, existing: ExistingExpense[]): DuplicateResult {
    const matches: { expenseId: string; reason: string; similarity: number }[] = [];

    for (const exp of existing) {
      const sim = this.calculateSimilarity(check, exp);
      if (sim >= 0.7) {
        matches.push({
          expenseId: exp.id,
          reason: this.getReason(sim, check, exp),
          similarity: Math.round(sim * 100) / 100,
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    return {
      isDuplicate: matches.length > 0,
      confidence: matches.some((m) => m.similarity >= 0.9)
        ? 'high'
        : matches.some((m) => m.similarity >= 0.8)
          ? 'medium'
          : 'low',
      matches: matches.slice(0, 3),
    };
  }

  private calculateSimilarity(check: ExpenseCheck, existing: ExistingExpense): number {
    let score = 0;
    let totalWeight = 0;

    totalWeight += 0.35;
    const amountDiff = Math.abs(check.amount - Number(existing.amount));
    const amountSim = check.amount > 0 ? Math.max(0, 1 - amountDiff / check.amount) : 0;
    score += amountSim * 0.35;

    totalWeight += 0.3;
    const descSim = this.textSimilarity(
      check.description.toLowerCase(),
      existing.description.toLowerCase(),
    );
    score += descSim * 0.3;

    totalWeight += 0.15;
    if (check.paidBy === existing.paidBy) {
      score += 0.15;
    }

    totalWeight += 0.1;
    if (
      check.category &&
      existing.category &&
      check.category.toLowerCase() === existing.category.toLowerCase()
    ) {
      score += 0.1;
    }

    totalWeight += 0.1;
    if (check.date && existing.date) {
      const checkDate = new Date(check.date);
      const existingDate = new Date(existing.date);
      const dayDiff = Math.abs(checkDate.getTime() - existingDate.getTime()) / 86400000;
      if (dayDiff <= 1) {
        score += 0.1;
      } else if (dayDiff <= 3) {
        score += 0.07;
      } else if (dayDiff <= 7) {
        score += 0.03;
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private textSimilarity(a: string, b: string): number {
    if (a === b) {
      return 1;
    }
    if (a.includes(b) || b.includes(a)) {
      return 0.8;
    }

    const aWords = a.split(/\s+/).filter(Boolean);
    const bWords = b.split(/\s+/).filter(Boolean);
    const common = aWords.filter((w) => bWords.includes(w)).length;
    const total = Math.max(aWords.length, bWords.length);
    return total > 0 ? common / total : 0;
  }

  private getReason(sim: number, check: ExpenseCheck, existing: ExistingExpense): string {
    const payerName = existing.payer
      ? `${existing.payer.firstName} ${existing.payer.lastName}`.trim()
      : 'Same person';
    if (sim >= 0.95) {
      return `Identical to "${existing.description}" (₹${Number(existing.amount)})`;
    }
    if (sim >= 0.85) {
      return `Very similar to "${existing.description}" paid by ${payerName}`;
    }
    if (sim >= 0.75) {
      return `Similar amount and description to "${existing.description}"`;
    }
    return `Possible match with "${existing.description}"`;
  }
}
