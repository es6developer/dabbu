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

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const res = await listFeatureFlags();
      setFlags(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load features');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(id: string, currentEnabled: boolean) {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, isEnabled: !currentEnabled } : f)));
    try {
      await toggleFeatureFlag(id, !currentEnabled);
    } catch {
      setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, isEnabled: currentEnabled } : f)));
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      return;
    }
    try {
      await createFeatureFlag({ name: newName, description: newDesc || undefined });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      await loadFlags();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered = flags.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
          <p className="text-muted-foreground">Toggle features across environments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-dabbu-500 text-white rounded-lg hover:bg-dabbu-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Flag
        </button>
      </div>

      {showCreate && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium text-foreground">Create Feature Flag</h3>
          <input
            type="text"
            placeholder="Flag name (e.g., ai-insights)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 px-3 py-1.5 bg-dabbu-500 text-white rounded-lg text-sm"
            >
              <Check className="w-3 h-3" /> Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-dabbu-500"
        />
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-4 space-y-4">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No feature flags found</p>
          ) : (
            filtered.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{flag.name}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        flag.isEnabled
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
                      }`}
                    >
                      {flag.isEnabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flag.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(flag.createdAt).toLocaleDateString()}
                  </span>
                  <Switch
                    checked={flag.isEnabled}
                    onChange={() => toggleFlag(flag.id, flag.isEnabled)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
