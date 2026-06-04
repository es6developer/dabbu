'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Users, Calendar, Loader2 } from 'lucide-react';
import { listSubscriptions } from '@/lib/api';
import type { Subscription } from '@/lib/api';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listSubscriptions(page, 20);
      setSubscriptions(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function statusColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'past_due':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
    }
  }

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const totalRevenue = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + Number(s.plan.price), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">All user subscriptions across plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            <span className="font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{subscriptions.length}</p>
          <p className="text-sm text-muted-foreground mt-1">All subscriptions</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-emerald-500" />
            <span className="font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Active subscriptions</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Monthly Revenue</span>
          </div>
          <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-sm text-muted-foreground mt-1">From active plans</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Period End
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {sub.user.firstName} {sub.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{sub.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{sub.plan.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(sub.status)}`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        ₹{Number(sub.plan.price).toLocaleString('en-IN')}/{sub.plan.interval}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subscriptions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No subscriptions found</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
