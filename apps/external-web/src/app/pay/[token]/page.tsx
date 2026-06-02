'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface PayLinkData {
  groupName: string;
  amount: number;
  from: string;
  to: string;
  upiLink: string;
  status: string;
  expiresAt: string;
}

export default function PayLinkPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PayLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    api.settlements.getPayLink(token).then((res) => {
      if (res.data) {
        setData(res.data as PayLinkData);
      } else {
        toast.error(res.error || 'Payment link not found');
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-dabbu-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div className="w-48 h-4 rounded bg-dabbu-surface2 animate-pulse mx-auto mb-3" />
          <div className="w-32 h-3 rounded bg-dabbu-surface2 animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="w-16 h-16 rounded-full bg-dabbu-red-bg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-dabbu-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Payment Link Expired</h2>
          <p className="text-dabbu-text-secondary mb-6">
            This payment link is no longer valid. Please contact the group admin for a new link.
          </p>
        </Card>
      </div>
    );
  }

  const handlePay = async () => {
    setPaying(true);
    try {
      if (data.upiLink) {
        window.open(data.upiLink, '_blank');
      }
      toast.success('Payment initiated! Did it go through?');
      setPaying(false);
      setPaid(false);
    } catch {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-dabbu-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-dabbu-accent flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">D</span>
          </div>
          <h1 className="text-xl font-semibold text-dabbu-text">{data.groupName}</h1>
          <p className="text-sm text-dabbu-text-muted mt-1">Payment Request</p>
        </div>

        <Card gradient className="overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-dabbu-accent/10 via-transparent to-transparent pointer-events-none" />
          <CardContent className="relative">
            <div className="text-center py-4">
              <p className="text-sm text-dabbu-text-secondary mb-1">You owe</p>
              <p className="text-4xl font-bold text-dabbu-red">{formatCurrency(data.amount)}</p>
              <p className="text-sm text-dabbu-text-secondary mt-1">to {data.to}</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-dabbu-text-muted border-t border-dabbu-border/50 pt-4 mt-2">
              <span>From: {data.from}</span>
              <span>·</span>
              <span>Group: {data.groupName}</span>
            </div>
          </CardContent>
        </Card>

        {!paid ? (
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-base gap-2"
              size="lg"
              onClick={handlePay}
              disabled={paying}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {paying ? 'Opening UPI...' : 'Pay Now via UPI'}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={async () => {
                  await navigator.clipboard.writeText(data.upiLink);
                  toast.success('UPI link copied!');
                }}
              >
                Copy UPI Link
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => {
                  setPaid(true);
                }}
              >
                Mark as Paid
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-dabbu-green-bg flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-dabbu-green"
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
              </div>
              <h3 className="text-lg font-semibold text-dabbu-text mb-1">Payment Recorded</h3>
              <p className="text-sm text-dabbu-text-muted mb-4">
                Your payment of {formatCurrency(data.amount)} has been recorded. The receiver will
                confirm shortly.
              </p>
              <Button variant="outline" onClick={() => setPaid(false)}>
                Made a mistake? Undo
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-dabbu-text-muted">
          This link will expire on {new Date(data.expiresAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
