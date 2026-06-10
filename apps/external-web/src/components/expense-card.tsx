'use client';

import { cn, formatCurrency, formatDate, getCategoryLabel } from '@/lib/utils';
import { MemberAvatar } from './member-avatar';
import type { Expense } from '@/lib/api';

interface ExpenseCardProps {
  expense: Expense;
  currentUserId?: string;
  onClick?: () => void;
}

const categoryIcons: Record<string, string> = {
  food: '🍽️',
  transport: '🚗',
  accommodation: '🏠',
  shopping: '🛍️',
  entertainment: '🎮',
  utilities: '⚡',
  health: '❤️',
  travel: '✈️',
  other: '📌',
};

const splitTypeStyles: Record<string, { label: string; className: string }> = {
  equal: { label: 'Equal', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  percentage: {
    label: '% Split',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  exact: { label: 'Exact', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

const categoryColors: Record<string, string> = {
  food: 'bg-orange-500/10 text-orange-400',
  transport: 'bg-cyan-500/10 text-cyan-400',
  shopping: 'bg-pink-500/10 text-pink-400',
  entertainment: 'bg-violet-500/10 text-violet-400',
  utilities: 'bg-slate-500/10 text-slate-400',
  health: 'bg-red-500/10 text-red-400',
  travel: 'bg-emerald-500/10 text-emerald-400',
  accommodation: 'bg-indigo-500/10 text-indigo-400',
  other: 'bg-gray-500/10 text-gray-400',
};

export function ExpenseCard({ expense, currentUserId, onClick }: ExpenseCardProps) {
  const currentUserShare = expense.shares.find((s) => s.memberId === currentUserId);
  const isSettled = expense.settled;
  const isCurrentUserPaid = expense.paidBy.id === currentUserId;
  const splitInfo = splitTypeStyles[expense.splitType] || splitTypeStyles.exact;
  const categoryClass = categoryColors[expense.category] || categoryColors.other;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent hover:border-dabbu-accent/30 hover:shadow-lg hover:shadow-dabbu-accent/5 transition-all duration-300 cursor-pointer',
        isSettled && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-dabbu-surface2 flex items-center justify-center text-lg shrink-0">
          {categoryIcons[expense.category] || '📌'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-dabbu-text truncate">{expense.description}</h4>
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0',
                    categoryClass,
                  )}
                >
                  {getCategoryLabel(expense.category)}
                </span>
              </div>
              <p className="text-xs text-dabbu-text-muted mt-0.5">
                Paid by{' '}
                <span className="text-dabbu-text-secondary font-medium">
                  {isCurrentUserPaid ? 'you' : expense.paidBy.name}
                </span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-dabbu-text">
                {formatCurrency(expense.amount)}
              </p>
              {currentUserShare && (
                <p
                  className={cn(
                    'text-xs font-medium mt-0.5',
                    currentUserShare.settled ? 'text-dabbu-green' : 'text-dabbu-red',
                  )}
                >
                  {currentUserShare.settled ? '✓ Settled' : formatCurrency(currentUserShare.amount)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                splitInfo.className,
              )}
            >
              {splitInfo.label}
            </span>
            <span className="text-[10px] text-dabbu-text-muted">{formatDate(expense.date)}</span>
            {isSettled && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-dabbu-green font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Settled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Per-person share breakdown */}
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dabbu-border/50">
        {expense.shares.map((share) => {
          const isShareCurrentUser = share.memberId === currentUserId;
          return (
            <div
              key={share.memberId}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-colors',
                share.settled
                  ? 'bg-dabbu-green/5 text-dabbu-green'
                  : isShareCurrentUser
                    ? 'bg-dabbu-accent/10 text-dabbu-accent'
                    : 'bg-dabbu-surface2 text-dabbu-text-muted',
              )}
            >
              <span className="font-medium truncate max-w-[60px]">
                {isShareCurrentUser ? 'You' : share.memberName.split(' ')[0]}
              </span>
              <span>{formatCurrency(share.amount)}</span>
              {share.settled && (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
