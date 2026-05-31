export type Segments = 'expenses' | 'balances' | 'settlements';

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  balance: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: { id: string; name: string };
  date: string;
  splitType: 'equal' | 'custom' | 'percentage' | 'shares';
  category?: string;
}

export interface Settlement {
  id: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  type: 'friends' | 'trip' | 'family' | 'couple' | 'roommates' | 'office';
  description?: string;
  memberCount: number;
  totalSpent: number;
  balance: number;
  currency: string;
  inviteCode?: string;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  isPremium?: boolean;
  planLimit?: number;
}
