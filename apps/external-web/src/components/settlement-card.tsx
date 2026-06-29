'use client';

import { useState } from 'react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from './member-avatar';
import { api, type Settlement } from '@/lib/api';
import { toast } from 'sonner';

interface SettlementCardProps {
  settlement: Settlement;
  groupId: string;
  currentUserId?: string;
  onUpdated?: () => void;
}

const methodIcons: Record<string, string> = {
  upi: '📱',
  cash: '💵',
  bank: '🏦',
  paypal: '💳',
  other: '🔄',
};

export function SettlementCard({
  settlement,
  groupId,
  currentUserId,
  onUpdated,
}: SettlementCardProps) {
  const [marking, setMarking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isPending = settlement.status === 'pending';
  const isCurrentUserPayer = settlement.from.id === currentUserId;
  const isCurrentUserReceiver = settlement.to.id === currentUserId;

  const handleMarkPaid = async () => {
    setMarking(true);
    const res = await api.settlements.markPaid(groupId, settlement.id);
    if (res.error) {
      toast.error(res.error);
      setMarking(false);
      return;
    }
    toast.success('Settlement marked as paid!');
    onUpdated?.();
    setMarking(false);
  };

  const handlePayNow = () => {
    const vpa = settlement.to.email || '';
    if (!vpa) {
      toast.error('No UPI ID available for this member');
      return;
    }
    const upiLink = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(settlement.to.name)}&am=${settlement.amount}&cu=INR&tn=Settlement%20via%20Dabbu`;
    window.open(upiLink, '_blank');
    setShowConfirm(true);
  };

  const handleConfirmReceipt = async () => {
    setConfirming(true);
    const res = await api.settlements.guestConfirmSettlement(settlement.id, 'confirm');
    if (res.error) {
      toast.error(res.error);
      setConfirming(false);
      return;
    }
    toast.success('Payment confirmed!');
    onUpdated?.();
    setConfirming(false);
  };

  const handleRejectReceipt = async () => {
    const reason = prompt('Reason for rejection:');
    if (!reason) {
      return;
    }
    setConfirming(true);
    const res = await api.settlements.guestConfirmSettlement(settlement.id, 'reject', reason);
    if (res.error) {
      toast.error(res.error);
      setConfirming(false);
      return;
    }
    toast.success('Payment rejected');
    onUpdated?.();
    setConfirming(false);
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-200',
        isPending
          ? 'border-dabbu-border bg-gradient-to-b from-dabbu-surface to-transparent'
          : 'border-dabbu-green/20 bg-gradient-to-b from-dabbu-green-bg to-transparent opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <MemberAvatar name={settlement.from.name} size="md" />
          <div>
            <p className="text-sm font-medium text-dabbu-text">
              {isCurrentUserPayer ? 'You' : settlement.from.name}
            </p>
            <p className="text-xs text-dabbu-text-muted">pays</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-dabbu-accent-muted flex items-center justify-center">
            <svg
              className="w-4 h-4 text-dabbu-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
          {settlement.method && (
            <span className="text-xs mt-1">{methodIcons[settlement.method] || '🔄'}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-dabbu-text">
              {isCurrentUserReceiver ? 'You' : settlement.to.name}
            </p>
            <p className="text-xs text-dabbu-text-muted">receives</p>
          </div>
          <MemberAvatar name={settlement.to.name} size="md" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-dabbu-border/50">
        <div>
          <p className="text-xl font-bold text-dabbu-text">{formatCurrency(settlement.amount)}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {isPending ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dabbu-green/10 text-dabbu-green text-[10px] font-medium border border-dabbu-green/20">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Completed
              </span>
            )}
            <span className="text-[10px] text-dabbu-text-muted">{formatDate(settlement.date)}</span>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-2">
            {isCurrentUserPayer && !showConfirm && (
              <>
                <Button size="sm" variant="default" onClick={handlePayNow}>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Pay Now
                </Button>
                <Button size="sm" variant="outline" onClick={handleMarkPaid} loading={marking}>
                  Mark Paid
                </Button>
              </>
            )}
            {isCurrentUserPayer && showConfirm && (
              <Button size="sm" variant="default" onClick={handleMarkPaid} loading={marking}>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Confirm Payment
              </Button>
            )}
            {isCurrentUserReceiver && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleConfirmReceipt}
                  loading={confirming}
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-dabbu-red border-dabbu-red/30 hover:bg-dabbu-red-bg"
                  onClick={handleRejectReceipt}
                  loading={confirming}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {settlement.note && (
        <p className="text-xs text-dabbu-text-muted mt-2 italic">Note: {settlement.note}</p>
      )}
    </div>
  );
}
