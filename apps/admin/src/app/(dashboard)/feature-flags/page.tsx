'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@tremor/react';
import { Flag, Plus, Search, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/features`);
      const json = await res.json();
      setFlags(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load features');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(id: string, currentEnabled: boolean) {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, isEnabled: !currentEnabled } : f));
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`${API_URL}/admin/feature-flags/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, isEnabled: currentEnabled } : f));
    }
  }

  const filtered = flags.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-destructive">
      <p>{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
          <p className="text-muted-foreground">Toggle features across environments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dabbu-500 text-white rounded-lg hover:bg-dabbu-600 transition-colors">
          <Plus className="w-4 h-4" />
          New Flag
        </button>
      </div>

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
              <div key={flag.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{flag.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      flag.isEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
                    }`}>
                      {flag.isEnabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(flag.updatedAt).toLocaleDateString()}</span>
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
