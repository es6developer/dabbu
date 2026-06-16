'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@tremor/react';
import { Plus, Search, Loader2, X, Check } from 'lucide-react';
import { listFeatureFlags, toggleFeatureFlag, createFeatureFlag } from '@/lib/api';
import type { FeatureFlag } from '@/lib/api';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => { loadFlags(); }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const res = await listFeatureFlags();
      setFlags(res.data);
    } catch (e: any) { setError(e.message || 'Failed to load features'); }
    finally { setLoading(false); }
  }

  async function toggleFlag(id: string, currentEnabled: boolean) {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, isEnabled: !currentEnabled } : f)));
    try { await toggleFeatureFlag(id, !currentEnabled); }
    catch { setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, isEnabled: currentEnabled } : f))); }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createFeatureFlag({ name: newName, description: newDesc || undefined });
      setShowCreate(false); setNewName(''); setNewDesc('');
      await loadFlags();
    } catch (e: any) { alert(e.message); }
  }

  const filtered = flags.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Feature Flags</h1>
          <p className="text-white/40">Toggle features across environments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-glass">
          <Plus className="w-4 h-4" /> New Flag
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-medium text-white">Create Feature Flag</h3>
          <input type="text" placeholder="Flag name (e.g., ai-insights)" value={newName}
            onChange={(e) => setNewName(e.target.value)} className="glass-input w-full px-3 py-2.5" />
          <input type="text" placeholder="Description (optional)" value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)} className="glass-input w-full px-3 py-2.5" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-glass"><Check className="w-3 h-3" /> Create</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost-glass"><X className="w-3 h-3" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
        <input type="text" placeholder="Search flags..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="glass-input w-full pl-10 pr-4 py-2.5" />
      </div>

      <div className="glass-panel">
        <div className="p-5 space-y-4">
          {filtered.length === 0 ? (
            <p className="text-white/40 text-center py-8">No feature flags found</p>
          ) : (
            filtered.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{flag.name}</span>
                    <span className={`badge-glass ${flag.isEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'}`}>
                      {flag.isEnabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">{flag.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/30">{new Date(flag.createdAt).toLocaleDateString()}</span>
                  <Switch checked={flag.isEnabled} onChange={() => toggleFlag(flag.id, flag.isEnabled)} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
