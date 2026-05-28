"use client";

import { cn, formatCurrency, formatDate, getCategoryLabel } from "@/lib/utils";
import { MemberAvatar } from "./member-avatar";
import type { Expense } from "@/lib/api";

interface ExpenseCardProps {
  expense: Expense;
  currentUserId?: string;
  onClick?: () => void;
}

const categoryIcons: Record<string, string> = {
  food: "🍽️",
  transport: "🚗",
  accommodation: "🏠",
  shopping: "🛍️",
  entertainment: "🎮",
  utilities: "⚡",
  health: "❤️",
  travel: "✈️",
  other: "📌",
};

const splitTypeColors: Record<string, string> = {
  equal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  percentage: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  exact: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function ExpenseCard({ expense, currentUserId, onClick }: ExpenseCardProps) {
  const currentUserShare = expense.shares.find(
    (s) => s.memberId === currentUserId
  );
  const isSettled = expense.settled;
  const isCurrentUserPaid = expense.paidBy.id === currentUserId;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 rounded-xl border border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent hover:border-dabbu-accent/30 transition-all duration-200 cursor-pointer",
        isSettled && "opacity-60"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-dabbu-surface2 flex items-center justify-center text-lg shrink-0">
          {categoryIcons[expense.category] || "📌"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-dabbu-text truncate">
                {expense.description}
              </h4>
              <p className="text-xs text-dabbu-text-muted mt-0.5">
                Paid by{" "}
                <span className="text-dabbu-text-secondary">
                  {isCurrentUserPaid ? "you" : expense.paidBy.name}
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
                    "text-xs font-medium mt-0.5",
                    currentUserShare.settled
                      ? "text-dabbu-green"
                      : "text-dabbu-red"
                  )}
                >
                  {currentUserShare.settled ? "Settled" : formatCurrency(currentUserShare.amount)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                splitTypeColors[expense.splitType]
              )}
            >
              {expense.splitType === "equal"
                ? "Equal"
                : expense.splitType === "percentage"
                ? "Percentage"
                : "Exact"}
            </span>
            <span className="text-[10px] text-dabbu-text-muted">
              {formatDate(expense.date)}
            </span>
            {isSettled && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-dabbu-green font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Settled
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex -space-x-1.5 mt-3">
        {expense.shares.slice(0, 5).map((share) => (
          <MemberAvatar
            key={share.memberId}
            name={share.memberName}
            size="sm"
            className="border-2 border-dabbu-bg"
          />
        ))}
        {expense.shares.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-dabbu-surface2 border-2 border-dabbu-bg flex items-center justify-center text-[10px] font-medium text-dabbu-text-muted">
            +{expense.shares.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
