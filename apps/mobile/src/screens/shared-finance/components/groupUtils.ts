import { palette } from '../../../theme';

export const TYPE_THEMES: Record<string, { gradient: [string, string]; chipColor: string; icon: string }> = {
  friends: { gradient: [palette.brand.primary, palette.brand.hover], chipColor: palette.brand.primary, icon: 'team' },
  trip: { gradient: ['#00B894', '#00D9A6'], chipColor: '#00B894', icon: 'earth' },
  family: { gradient: [palette.brand.primary, palette.brand.hover], chipColor: palette.brand.primary, icon: 'home' },
  couple: { gradient: ['#FF6B9D', '#FF8FB3'], chipColor: '#FF6B9D', icon: 'heart' },
  sports: { gradient: ['#FF6B35', '#FF8F5E'], chipColor: '#FF6B35', icon: 'codesquareo' },
  roommates: { gradient: ['#14B8A6', '#14B8A6'], chipColor: '#14B8A6', icon: 'idcard' },
  office: { gradient: ['#247BA0', '#4A9FC7'], chipColor: '#247BA0', icon: 'solution1' },
  event: { gradient: ['#D64550', '#FF6B6B'], chipColor: '#D64550', icon: 'calendar' },
  apartment: { gradient: ['#14B8A6', '#14B8A6'], chipColor: '#14B8A6', icon: 'appstore1' },
  default: { gradient: [palette.brand.primary, palette.brand.hover], chipColor: palette.brand.primary, icon: 'team' },
};

export function fmt(v: number | string) {
  return '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function normalize<T>(res: any): T {
  if (!res) return [] as unknown as T;
  if (Array.isArray(res)) return res as T;
  return (res as any)?.data || (res as T);
}

interface BalanceRow {
  userId: string;
  name: string;
  balance: number;
  upiId?: string;
}

export function computeAllSettlements(balanceRows: BalanceRow[]) {
  const creditors = balanceRows.filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = balanceRows.filter(r => r.balance < 0).sort((a, b) => a.balance - b.balance);
  const settlements: Array<{ from: string; fromName: string; to: string; toName: string; amount: number; upiId?: string; type: 'pay' | 'collect' }> = [];
  let ci = 0;
  for (const debtor of debtors) {
    let remaining = Math.abs(debtor.balance);
    while (remaining > 0.01 && ci < creditors.length) {
      const creditor = creditors[ci];
      const payAmount = Math.min(remaining, creditor.balance);
      const rounded = Math.round(payAmount);
      settlements.push({ from: debtor.userId, fromName: debtor.name, to: creditor.userId, toName: creditor.name, amount: rounded, upiId: creditor.upiId, type: 'pay' });
      remaining -= rounded;
      creditor.balance -= rounded;
      if (creditor.balance < 0.01) ci++;
    }
  }
  return settlements;
}

export function computeSmartSettlements(balanceRows: BalanceRow[], currentUserId?: string) {
  if (!currentUserId) return [];
  const myBalance = balanceRows.find(r => r.userId === currentUserId);
  if (!myBalance || myBalance.balance === 0) return [];
  const settlements: Array<{ from: string; fromName: string; to: string; toName: string; amount: number; upiId?: string; type: 'pay' | 'collect' | 'remind' }> = [];
  if (myBalance.balance < 0) {
    const owed = Math.abs(myBalance.balance);
    const creditors = balanceRows.filter(r => r.userId !== currentUserId && r.balance > 0).sort((a, b) => b.balance - a.balance);
    let remaining = owed;
    for (const creditor of creditors) {
      if (remaining <= 0) break;
      const payAmount = Math.min(remaining, Math.round(creditor.balance));
      settlements.push({ from: currentUserId, fromName: 'You', to: creditor.userId, toName: creditor.name, amount: payAmount, upiId: creditor.upiId, type: 'pay' });
      remaining -= payAmount;
    }
  } else {
    const debtors = balanceRows.filter(r => r.userId !== currentUserId && r.balance < 0).sort((a, b) => a.balance - b.balance);
    for (const debtor of debtors) {
      settlements.push({ from: debtor.userId, fromName: debtor.name, to: currentUserId, toName: 'You', amount: Math.abs(Math.round(debtor.balance)), type: 'remind' });
    }
  }
  return settlements;
}
