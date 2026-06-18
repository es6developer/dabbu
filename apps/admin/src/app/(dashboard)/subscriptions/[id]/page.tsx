'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CreditCard, User, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { getSubscriptionDetail } from '@/lib/api';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSubscriptionDetail(params.id as string);
      setSub(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [params.id]);

  function statusColor(status: string) {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'past_due': return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'cancelled': case 'canceled': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'expired': return 'bg-white/[0.04] text-white/40 border border-white/[0.06]';
      default: return 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>;
  }

  if (!sub) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-ghost-glass p-2">
          <ChevronLeft size={20} className="text-white/60" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Subscription Detail</h1>
          <p className="text-white/40 mt-1">ID: {sub.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <User className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">User</span>
          </div>
          <p className="text-xl font-bold text-white">{sub.user?.firstName} {sub.user?.lastName}</p>
          <p className="text-sm text-white/40 mt-1">{sub.user?.email}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">Plan</span>
          </div>
          <p className="text-xl font-bold text-white">{sub.plan?.name || 'N/A'}</p>
          <p className="text-sm text-white/40 mt-1">
            {sub.plan?.price ? `₹${Number(sub.plan.price).toLocaleString('en-IN')}` : '—'} / {sub.plan?.interval || '—'}
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">Status</span>
          </div>
          <span className={`badge-glass ${statusColor(sub.status)}`}>{sub.status}</span>
          <p className="text-sm text-white/40 mt-1">Period ends: {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-white/40 text-sm block">Created</span>
            <span className="text-white font-medium">{sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '—'}</span>
          </div>
          <div>
            <span className="text-white/40 text-sm block">Current Period End</span>
            <span className="text-white font-medium">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleString() : '—'}</span>
          </div>
          {sub.trialEnd && (
            <div>
              <span className="text-white/40 text-sm block">Trial Ends</span>
              <span className="text-white font-medium">{new Date(sub.trialEnd).toLocaleString()}</span>
            </div>
          )}
          {sub.cancelledAt && (
            <div>
              <span className="text-white/40 text-sm block">Cancelled At</span>
              <span className="text-white font-medium">{new Date(sub.cancelledAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
