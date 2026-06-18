'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { listCoupons, createCoupon, deleteCoupon } from '@/lib/api';
import type { Coupon } from '@/lib/api';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10, maxUses: 0, expiresAt: '',
  });
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listCoupons();
      setCoupons(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createCoupon({
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        maxUses: form.maxUses > 0 ? form.maxUses : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setShowCreate(false);
      setForm({ code: '', description: '', discountType: 'percentage', discountValue: 10, maxUses: 0, expiresAt: '' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    try {
      await deleteCoupon(id);
      load();
    } catch (e: any) { alert(e.message); }
  }

  const activeCoupons = coupons.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Coupons</h1>
          <p className="text-white/40 mt-1">Manage discount coupons ({activeCoupons.length} active)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost-glass p-2"><RefreshCw size={18} className="text-white/60" /></button>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-glass flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} />
            Create Coupon
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">New Coupon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/60">Code *</label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="glass-input w-full h-11 px-4" placeholder="SUMMER25" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/60">Discount Type</label>
              <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                className="glass-input w-full h-11 px-4">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/60">Discount Value *</label>
              <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                className="glass-input w-full h-11 px-4" min={1} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/60">Max Uses (0 = unlimited)</label>
              <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: Number(e.target.value) }))}
                className="glass-input w-full h-11 px-4" min={0} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/60">Expires At</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="glass-input w-full h-11 px-4" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/60">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="glass-input w-full h-11 px-4" placeholder="Optional description" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating} className="btn-glass px-6 py-2.5 text-sm">
              {creating ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null}
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost-glass px-6 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-4 font-medium text-white/30">Code</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Discount</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Uses</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Expires</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Status</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Created</th>
                  <th className="text-right px-5 py-4 font-medium text-white/30">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-indigo-400" />
                        <span className="font-mono font-medium text-white">{c.code}</span>
                      </div>
                      {c.description && <div className="text-xs text-white/40 mt-0.5">{c.description}</div>}
                    </td>
                    <td className="px-5 py-4 text-white/80">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue.toLocaleString('en-IN')}`}
                    </td>
                    <td className="px-5 py-4 text-white/80">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className="px-5 py-4 text-white/50">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge-glass ${c.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/50">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDelete(c.id, c.code)} className="text-red-400/60 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {coupons.length === 0 && <div className="text-center py-12 text-white/40">No coupons found</div>}
        </div>
      )}
    </div>
  );
}
