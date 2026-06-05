import { Injectable, Logger } from '@nestjs/common';

export interface BalanceEntry {
  userId: string;
  name: string;
  paid: number;
  owes: number;
  balance: number;
  owesTo: { userId: string; name: string; amount: number }[];
}

export interface OptimizedSettlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface SimplifiedDebt {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

@Injectable()
export class SettlementEngine {
  private readonly logger = new Logger(SettlementEngine.name);

  calculateOptimizedSettlements(balances: BalanceEntry[]): OptimizedSettlement[] {
    if (balances.length < 2) {
      return [];
    }

    const netMap = new Map<string, { id: string; name: string; net: number }>();
    for (const entry of balances) {
      const net = entry.paid - entry.owes;
      if (Math.abs(net) > 0.01) {
        netMap.set(entry.userId, { id: entry.userId, name: entry.name, net });
      }
    }

    const creditors = Array.from(netMap.values())
      .filter((e) => e.net > 0)
      .sort((a, b) => b.net - a.net);

    const debtors = Array.from(netMap.values())
      .filter((e) => e.net < 0)
      .sort((a, b) => a.net - b.net);

    const settlements: OptimizedSettlement[] = [];
    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];
      const settleAmount = Math.min(creditor.net, Math.abs(debtor.net));

      if (settleAmount > 0.01) {
        settlements.push({
          from: debtor.id,
          fromName: debtor.name,
          to: creditor.id,
          toName: creditor.name,
          amount: Math.round(settleAmount * 100) / 100,
        });
      }

      creditors[ci] = { ...creditor, net: creditor.net - settleAmount };
      debtors[di] = { ...debtor, net: debtor.net + settleAmount };

      if (creditors[ci].net < 0.01) {
        ci++;
      }
      if (Math.abs(debtors[di].net) < 0.01) {
        di++;
      }
    }

    return settlements;
  }

  calculateBalances(expenses: any[], members: any[]): BalanceEntry[] {
    const memberMap = new Map<string, { id: string; firstName: string; lastName: string }>();
    for (const m of members) {
      memberMap.set(m.userId || m.id, {
        id: m.userId || m.id,
        firstName: m.user?.firstName || m.firstName || '',
        lastName: m.user?.lastName || m.lastName || '',
      });
    }

    const balanceMap = new Map<
      string,
      { paid: number; owes: number; debts: Map<string, number> }
    >();

    const allUserIds = new Set<string>();
    for (const m of members) {
      const uid = m.userId || m.id;
      allUserIds.add(uid);
      const member = memberMap.get(uid);
      balanceMap.set(uid, { paid: 0, owes: 0, debts: new Map() });
    }

    for (const expense of expenses) {
      const payerId = expense.paidBy;
      allUserIds.add(payerId);

      if (!balanceMap.has(payerId)) {
        balanceMap.set(payerId, { paid: 0, owes: 0, debts: new Map() });
      }

      const payerEntry = balanceMap.get(payerId)!;

      if (expense.splits && Array.isArray(expense.splits)) {
        for (const split of expense.splits) {
          const splitUserId = split.userId;
          allUserIds.add(splitUserId);

          if (!balanceMap.has(splitUserId)) {
            balanceMap.set(splitUserId, { paid: 0, owes: 0, debts: new Map() });
          }

          const splitAmount = Number(split.amount) || 0;
          const splitEntry = balanceMap.get(splitUserId)!;

          if (splitUserId === payerId) {
            payerEntry.paid += splitAmount;
          } else {
            payerEntry.paid += splitAmount;
            splitEntry.owes += splitAmount;

            if (split.isPaid) {
              const currentDebt = payerEntry.debts.get(splitUserId) || 0;
              payerEntry.debts.set(splitUserId, currentDebt + splitAmount);
            }
          }
        }
      } else {
        const amount = Number(expense.amount) || 0;
        payerEntry.paid += amount;
      }
    }

    const results: BalanceEntry[] = [];
    for (const uid of allUserIds) {
      const entry = balanceMap.get(uid);
      if (!entry) {
        continue;
      }

      const member = memberMap.get(uid);
      const name = member ? `${member.firstName} ${member.lastName}`.trim() : 'Unknown';

      const owesTo: { userId: string; name: string; amount: number }[] = [];
      for (const [debtorId, amount] of entry.debts) {
        const debtorMember = memberMap.get(debtorId);
        owesTo.push({
          userId: debtorId,
          name: debtorMember
            ? `${debtorMember.firstName} ${debtorMember.lastName}`.trim()
            : 'Unknown',
          amount: Math.round(amount * 100) / 100,
        });
      }

      results.push({
        userId: uid,
        name,
        paid: Math.round(entry.paid * 100) / 100,
        owes: Math.round(entry.owes * 100) / 100,
        balance: Math.round((entry.paid - entry.owes) * 100) / 100,
        owesTo,
      });
    }

    return results;
  }

  simplifyDebts(balances: BalanceEntry[]): SimplifiedDebt[] {
    if (balances.length < 2) {
      return [];
    }

    const debts: SimplifiedDebt[] = [];

    for (const creditor of balances) {
      if (creditor.balance <= 0) {
        continue;
      }

      for (const debtor of balances) {
        if (debtor.userId === creditor.userId) {
          continue;
        }
        if (debtor.balance >= 0) {
          continue;
        }

        const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
        if (amount > 0.01) {
          debts.push({
            from: debtor.userId,
            fromName: debtor.name,
            to: creditor.userId,
            toName: creditor.name,
            amount: Math.round(amount * 100) / 100,
          });
        }
      }
    }

    return debts;
  }
}
