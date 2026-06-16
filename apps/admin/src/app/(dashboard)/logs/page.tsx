'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
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

  useEffect(() => { loadData(); }, [page, actionFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listAuditLogs({ action: actionFilter || undefined, page, limit: 50 });
      setLogs(res.data); setTotalPages(res.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const filtered = logs.filter(
    (l) => !search || l.description.toLowerCase().includes(search.toLowerCase()) ||
      (l.admin?.name || '').toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()),
  );

  function actionColor(action: string) {
    switch (action) {
      case 'deleted': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'created': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'updated': return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      default: return 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
        <p className="text-white/40">Administrative actions and system events</p>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search logs..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="glass-input w-full pl-10 pr-4 py-2.5" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: null, label: 'All' }, { key: 'login', label: 'Login' }, { key: 'created', label: 'Created' }, { key: 'updated', label: 'Updated' }, { key: 'deleted', label: 'Deleted' }].map((f) => (
            <button key={f.key ?? 'all'} onClick={() => { setActionFilter(f.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${actionFilter === f.key ? 'bg-indigo-500/30 text-white border border-indigo-500/30' : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-4 font-medium text-white/30">Time</th>
                <th className="text-left px-5 py-4 font-medium text-white/30">Admin</th>
                <th className="text-left px-5 py-4 font-medium text-white/30">Action</th>
                <th className="text-left px-5 py-4 font-medium text-white/30">Entity</th>
                <th className="text-left px-5 py-4 font-medium text-white/30">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 text-white/40 whitespace-nowrap text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-white/80">{log.admin?.name || log.admin?.email || 'System'}</td>
                  <td className="px-5 py-4"><span className={`badge-glass ${actionColor(log.action)}`}>{log.action}</span></td>
                  <td className="px-5 py-4 text-white/80">{log.entity}</td>
                  <td className="px-5 py-4 text-white/40 max-w-md truncate">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-white/40">No logs found</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost-glass">Previous</button>
          <span className="px-3 py-1.5 text-sm text-white/40">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost-glass">Next</button>
        </div>
      )}
    </div>
  );
}
