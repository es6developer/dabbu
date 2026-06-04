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
  name: '',
  description: '',
  price: 0,
  currency: 'INR',
  interval: 'monthly',
  features: {} as Record<string, boolean>,
  isActive: true,
  sortOrder: 0,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...DEFAULT_FORM });

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await listPlans();
      const data = (res.data || []).sort(
        (a: SubscriptionPlan, b: SubscriptionPlan) => a.sortOrder - b.sortOrder,
      );
      setPlans(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    try {
      const body = { ...form, price: Number(form.price) };
      if (editingPlan) {
        await updatePlan(editingPlan.id, body);
      } else {
        await createPlan(body);
      }
      setShowForm(false);
      setEditingPlan(null);
      setForm({ ...DEFAULT_FORM });
      await loadPlans();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this plan?')) {
      return;
    }
    try {
      await deletePlan(id);
      await loadPlans();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function editPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: (plan.features as Record<string, boolean>) || {},
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setShowForm(true);
  }

  function newPlan() {
    setEditingPlan(null);
    setForm({ ...DEFAULT_FORM });
    setShowForm(true);
  }

  function toggleFeature(key: string) {
    setForm((prev: any) => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Manage subscription plans visible in the mobile app
          </p>
        </div>
        <button
          onClick={newPlan}
          className="flex items-center gap-2 px-4 py-2 bg-dabbu-500 text-white rounded-lg hover:bg-dabbu-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {editingPlan ? 'Edit Plan' : 'Create Plan'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Interval</label>
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                min={0}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">Active</label>
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Features</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FEATURE_KEYS.map((fk) => (
                <label
                  key={fk.key}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                  onClick={() => toggleFeature(fk.key)}
                >
                  <input
                    type="checkbox"
                    checked={!!form.features?.[fk.key]}
                    readOnly
                    className="w-4 h-4"
                  />
                  {fk.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={savePlan}
              className="flex items-center gap-2 px-4 py-2 bg-dabbu-500 text-white rounded-lg hover:bg-dabbu-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              {editingPlan ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingPlan(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-4 space-y-4">
          {plans.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No plans found. Create your first plan.
            </p>
          ) : (
            plans.map((plan) => {
              const enabledFeatures = plan.features
                ? Object.entries(plan.features as Record<string, boolean>).filter(([, v]) => v)
                    .length
                : 0;
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{plan.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          plan.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
                        }`}
                      >
                        {plan.isActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ₹{Number(plan.price).toLocaleString('en-IN')}/{plan.interval} &middot;{' '}
                      {enabledFeatures} features
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editPlan(plan)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
