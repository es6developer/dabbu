'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, UserCheck, DollarSign, Loader2 } from 'lucide-react';
import { listSubscriptions } from '@/lib/api';
import type { Subscription } from '@/lib/api';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadData(); }, [page]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listSubscriptions(page, 20);
      setSubscriptions(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function statusColor(status: string) {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'past_due': return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'cancelled': case 'canceled': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'expired': return 'bg-white/[0.04] text-white/40 border border-white/[0.06]';
      default: return 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
    }
  }

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const totalRevenue = subscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + Number(s.plan.price), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
        <p className="text-white/40 mt-1">All user subscriptions across plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{subscriptions.length}</p>
          <p className="text-sm text-white/40 mt-1">All subscriptions</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-medium text-white/70">Active</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeCount}</p>
          <p className="text-sm text-white/40 mt-1">Active subscriptions</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <span className="font-medium text-white/70">Monthly Revenue</span>
          </div>
          <p className="text-3xl font-bold text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-sm text-white/40 mt-1">From active plans</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>
      ) : (
        <>
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 py-4 font-medium text-white/30">User</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Plan</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Status</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Price</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Period End</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-white">{sub.user.firstName} {sub.user.lastName}</div>
                        <div className="text-xs text-white/40">{sub.user.email}</div>
                      </td>
                      <td className="px-5 py-4 text-white/80">{sub.plan.name}</td>
                      <td className="px-5 py-4">
                        <span className={`badge-glass ${statusColor(sub.status)}`}>{sub.status}</span>
                      </td>
                      <td className="px-5 py-4 text-white/80">₹{Number(sub.plan.price).toLocaleString('en-IN')}/{sub.plan.interval}</td>
                      <td className="px-5 py-4 text-white/50">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-white/50">{new Date(sub.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subscriptions.length === 0 && <div className="text-center py-12 text-white/40">No subscriptions found</div>}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost-glass">Previous</button>
              <span className="px-3 py-1.5 text-sm text-white/40">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost-glass">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
