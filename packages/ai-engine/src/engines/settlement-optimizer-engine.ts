interface SettlementBalance {
  memberId: string;
  memberName: string;
  balance: number;
}

interface OptimizedSettlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

interface SettlementOptimizationOutput {
  originalTxCount: number;
  optimizedTxCount: number;
  totalAmount: number;
  savingsTxCount: number;
  transactions: OptimizedSettlement[];
}

interface ExpenseInput {
  paidBy: string;
  amount: number;
  splits: { memberId: string; amount: number }[];
}

interface SettlementInput {
  from: string;
  to: string;
  amount: number;
  status: string;
}

export class SettlementOptimizerEngine {
  optimizeSettlements(balances: SettlementBalance[]): SettlementOptimizationOutput {
    const creditors = balances
      .filter(b => b.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const debtors = balances
      .filter(b => b.balance < 0)
      .sort((a, b) => a.balance - b.balance);

    const totalAmount = balances.reduce((sum, b) => sum + Math.abs(b.balance), 0) / 2;
    const originalTxCount = creditors.length * debtors.length;

    const remainingCreditors = creditors.map(c => ({ ...c }));
    const remainingDebtors = debtors.map(d => ({ ...d, balance: Math.abs(d.balance) }));
    const transactions: OptimizedSettlement[] = [];

    let ci = 0;
    let di = 0;

    while (ci < remainingCreditors.length && di < remainingDebtors.length) {
      const creditor = remainingCreditors[ci];
      const debtor = remainingDebtors[di];
      const amount = Math.min(creditor.balance, debtor.balance);

      if (amount > 0.01) {
        transactions.push({
          from: debtor.memberId,
          fromName: debtor.memberName,
          to: creditor.memberId,
          toName: creditor.memberName,
          amount: Math.round(amount * 100) / 100,
        });
      }

      creditor.balance -= amount;
      debtor.balance -= amount;

      if (creditor.balance < 0.01) ci++;
      if (debtor.balance < 0.01) di++;
    }

    return {
      originalTxCount,
      optimizedTxCount: transactions.length,
      totalAmount,
      savingsTxCount: originalTxCount - transactions.length,
      transactions,
    };
  }

  calculateBalances(
    expenses: ExpenseInput[],
    settlements: SettlementInput[]
  ): SettlementBalance[] {
    const balances = new Map<string, { memberName: string; balance: number }>();

    for (const expense of expenses) {
      for (const split of expense.splits) {
        if (split.memberId === expense.paidBy) continue;

        const debtor = balances.get(split.memberId) || { memberName: '', balance: 0 };
        debtor.balance -= split.amount;
        balances.set(split.memberId, debtor);

        const creditor = balances.get(expense.paidBy) || { memberName: '', balance: 0 };
        creditor.balance += split.amount;
        balances.set(expense.paidBy, creditor);
      }
    }

    for (const settlement of settlements) {
      if (settlement.status === 'completed') {
        const from = balances.get(settlement.from) || { memberName: '', balance: 0 };
        from.balance += settlement.amount;
        balances.set(settlement.from, from);

        const to = balances.get(settlement.to) || { memberName: '', balance: 0 };
        to.balance -= settlement.amount;
        balances.set(settlement.to, to);
      }
    }

    return [...balances.entries()]
      .filter(([_, data]) => Math.abs(data.balance) > 0.01)
      .map(([memberId, data]) => ({
        memberId,
        memberName: data.memberName || memberId,
        balance: Math.round(data.balance * 100) / 100,
      }));
  }
}
