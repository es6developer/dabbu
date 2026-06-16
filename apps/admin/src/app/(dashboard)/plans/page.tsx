'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { listPlans, createPlan, updatePlan, deletePlan } from '@/lib/api';
import type { SubscriptionPlan } from '@/lib/api';

const ALL_FEATURE_KEYS = [
  { key: 'add_expense', label: 'Add Expense' },
  { key: 'edit_expense', label: 'Edit Expense' },
  { key: 'delete_expense', label: 'Delete Expense' },
  { key: 'add_category', label: 'Add Custom Category' },
  { key: 'sms_sync', label: 'SMS Auto-sync' },
  { key: 'bank_linking', label: 'Bank Account Linking' },
  { key: 'analytics', label: 'Advanced Analytics' },
  { key: 'recurring_detection', label: 'Recurring Detection' },
  { key: 'ai_insights', label: 'AI Insights' },
  { key: 'export_data', label: 'Export PDF/Excel' },
  { key: 'unlimited_accounts', label: 'Unlimited Accounts' },
  { key: 'family_sharing', label: 'Family Sharing' },
  { key: 'chat', label: 'Family Chat' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'bills', label: 'Bills' },
  { key: 'goals', label: 'Goals' },
  { key: 'investments', label: 'Investments' },
];

const DEFAULT_FORM = {
  name: '', description: '', price: 0, currency: 'INR',
  interval: 'monthly', features: {} as Record<string, boolean>,
  isActive: true, sortOrder: 0,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...DEFAULT_FORM });

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await listPlans();
      setPlans((res.data || []).sort((a: SubscriptionPlan, b: SubscriptionPlan) => a.sortOrder - b.sortOrder));
    } catch (e: any) { setError(e.message || 'Failed to load plans'); }
    finally { setLoading(false); }
  }

  async function savePlan() {
    try {
      const body = { ...form, price: Number(form.price) };
      if (editingPlan) await updatePlan(editingPlan.id, body);
      else await createPlan(body);
      setShowForm(false); setEditingPlan(null); setForm({ ...DEFAULT_FORM });
      await loadPlans();
    } catch (e: any) { alert(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try { await deletePlan(id); await loadPlans(); }
    catch (e: any) { alert(e.message); }
  }

  function editPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name, description: plan.description || '', price: plan.price,
      currency: plan.currency, interval: plan.interval,
      features: (plan.features as Record<string, boolean>) || {},
      isActive: plan.isActive, sortOrder: plan.sortOrder,
    });
    setShowForm(true);
  }

  function newPlan() { setEditingPlan(null); setForm({ ...DEFAULT_FORM }); setShowForm(true); }
  function toggleFeature(key: string) { setForm((prev: any) => ({ ...prev, features: { ...prev.features, [key]: !prev.features[key] } })); }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscription Plans</h1>
          <p className="text-white/40">Manage subscription plans visible in the mobile app</p>
        </div>
        <button onClick={newPlan} className="btn-glass">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Price', key: 'price', type: 'number' },
              { label: 'Sort Order', key: 'sortOrder', type: 'number' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-white/60 mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="glass-input w-full px-3 py-2.5" min={0} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="glass-input w-full px-3 py-2.5 appearance-none">
                <option value="INR" className="bg-gray-900">INR</option>
                <option value="USD" className="bg-gray-900">USD</option>
                <option value="EUR" className="bg-gray-900">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Interval</label>
              <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className="glass-input w-full px-3 py-2.5 appearance-none">
                <option value="monthly" className="bg-gray-900">Monthly</option>
                <option value="yearly" className="bg-gray-900">Yearly</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-white/60">Active</label>
              <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.isActive ? 'bg-indigo-500/50' : 'bg-white/[0.08]'}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${form.isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Features</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FEATURE_KEYS.map((fk) => (
                <label key={fk.key} onClick={() => toggleFeature(fk.key)}
                  className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-xl border transition-all ${form.features?.[fk.key] ? 'bg-indigo-500/10 border-indigo-500/30 text-white' : 'bg-white/[0.03] border-white/[0.06] text-white/50'}`}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${form.features?.[fk.key] ? 'bg-indigo-500' : 'bg-white/[0.08]'}`}>
                    {form.features?.[fk.key] && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {fk.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={savePlan} className="btn-glass"><Check className="w-4 h-4" />{editingPlan ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditingPlan(null); }} className="btn-ghost-glass"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="glass-panel">
        <div className="p-5 space-y-4">
          {plans.length === 0 ? (
            <p className="text-white/40 text-center py-8">No plans found. Create your first plan.</p>
          ) : (
            plans.map((plan) => {
              const enabledFeatures = plan.features ? Object.entries(plan.features as Record<string, boolean>).filter(([, v]) => v).length : 0;
              return (
                <div key={plan.id} className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{plan.name}</span>
                      <span className={`badge-glass ${plan.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'}`}>
                        {plan.isActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-white/50">
                      ₹{Number(plan.price).toLocaleString('en-IN')}/{plan.interval} · {enabledFeatures} features
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => editPlan(plan)} className="btn-ghost-glass"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(plan.id)} className="btn-ghost-glass text-red-400/60 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
