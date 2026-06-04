'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { listAuditLogs } from '@/lib/api';
import type { AuditLog } from '@/lib/api';

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page, actionFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listAuditLogs({ action: actionFilter || undefined, page, limit: 50 });
      setLogs(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      (l.admin?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase()),
  );

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">Administrative actions and system events</p>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: null, label: 'All' },
            { key: 'login', label: 'Login' },
            { key: 'created', label: 'Created' },
            { key: 'updated', label: 'Updated' },
            { key: 'deleted', label: 'Deleted' },
          ].map((f) => (
            <button
              key={f.key ?? 'all'}
              onClick={() => {
                setActionFilter(f.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                actionFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {log.admin?.name || log.admin?.email || 'System'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.action === 'deleted'
                          ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                          : log.action === 'created'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : log.action === 'updated'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{log.entity}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-md truncate">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No logs found</div>
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
    </div>
  );
}
