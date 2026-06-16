'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw, ChevronLeft } from 'lucide-react';
import { listTickets, updateTicket, assignTicket, type SupportTicket } from '@/lib/api';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const statusStyles: Record<string, string> = {
  open: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  resolved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
  medium: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  high: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [statusUpdating, setStatusUpdating] = useState('');
  const [noteInput, setNoteInput] = useState('');

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await listTickets({ status: statusFilter || undefined, search: search || undefined, page, limit: 20 });
      setTickets(res.data); setTotalPages(res.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, statusFilter]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 400); return () => clearTimeout(t); }, [search]);

  async function handleStatusChange(id: string, status: string) {
    setStatusUpdating(id);
    try {
      await updateTicket(id, { status }); load();
      if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status } : null));
    } catch (e: any) { alert(e.message); }
    finally { setStatusUpdating(''); }
  }

  async function handleAssign(id: string) {
    try { await assignTicket(id); load(); } catch (e: any) { alert(e.message); }
  }

  async function handleSaveNotes(id: string) {
    try {
      await updateTicket(id, { adminNotes: noteInput }); setNoteInput(''); load(); setSelected(null);
    } catch (e: any) { alert(e.message); }
  }

  if (selected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setSelected(null)} className="btn-ghost-glass">
          <ChevronLeft size={16} /> Back to tickets
        </button>
        <div className="glass-panel p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{selected.subject}</h2>
            <div className="flex gap-2">
              <span className={`badge-glass ${statusStyles[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              <span className={`badge-glass ${priorityStyles[selected.priority]}`}>{selected.priority}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="User" value={selected.user ? `${selected.user.firstName} ${selected.user.lastName}` : selected.email || 'Anonymous'} />
            <InfoRow label="Category" value={selected.category} />
            <InfoRow label="Assigned to" value={selected.assignedTo?.name || 'Unassigned'} />
            <InfoRow label="Created" value={new Date(selected.createdAt).toLocaleString()} />
          </div>
          <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.04]">
            <p className="text-sm text-white/70 whitespace-pre-wrap">{selected.message}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} disabled={s === selected.status || statusUpdating === selected.id}
                onClick={() => handleStatusChange(selected.id, s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${s === selected.status ? 'bg-indigo-500/30 text-white border border-indigo-500/30' : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          {!selected.assignedTo && (
            <button onClick={() => handleAssign(selected.id)} className="btn-glass">Assign to me</button>
          )}
          <div className="border-t border-white/[0.06] pt-5">
            <label className="block text-sm font-medium text-white/60 mb-1">Admin Notes</label>
            <textarea value={noteInput || selected.adminNotes || ''} onChange={(e) => setNoteInput(e.target.value)}
              rows={3} className="glass-input w-full px-3 py-2.5 resize-none" placeholder="Add internal notes..." />
            <button onClick={() => handleSaveNotes(selected.id)} disabled={!noteInput && !selected.adminNotes}
              className="btn-glass mt-3">Save Notes</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Support Tickets</h1>
          <p className="text-white/40">Manage and respond to user support requests</p>
        </div>
        <button onClick={load} className="btn-ghost-glass">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search tickets..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="glass-input w-full pl-10 pr-4 py-2.5" />
        </div>
        <div className="flex gap-2">
          {[{ key: null, label: 'All' }, { key: 'open', label: 'Open' }, { key: 'in_progress', label: 'In Progress' }, { key: 'resolved', label: 'Resolved' }, { key: 'closed', label: 'Closed' }].map((f) => (
            <button key={f.key ?? 'all'} onClick={() => { setStatusFilter(f.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${statusFilter === f.key ? 'bg-indigo-500/30 text-white border border-indigo-500/30' : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', count: tickets.filter((t) => t.status === 'open').length, color: 'text-blue-400' },
          { label: 'In Progress', count: tickets.filter((t) => t.status === 'in_progress').length, color: 'text-amber-400' },
          { label: 'Resolved', count: tickets.filter((t) => t.status === 'resolved').length, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-sm text-white/50">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {error && <div className="glass-panel p-4 text-sm text-red-400">{error}</div>}

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-white/40" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-white/40">No tickets found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 py-4 font-medium text-white/30">Subject</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">User</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Status</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Priority</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Category</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Assigned</th>
                    <th className="text-left px-5 py-4 font-medium text-white/30">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} onClick={() => setSelected(t)}
                      className="cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-white font-medium">{t.subject}</td>
                      <td className="px-5 py-4 text-white/50">{t.user ? `${t.user.firstName} ${t.user.lastName}` : t.email || 'Anonymous'}</td>
                      <td className="px-5 py-4"><span className={`badge-glass ${statusStyles[t.status]}`}>{t.status.replace('_', ' ')}</span></td>
                      <td className="px-5 py-4"><span className={`badge-glass ${priorityStyles[t.priority]}`}>{t.priority}</span></td>
                      <td className="px-5 py-4 text-white/60">{t.category}</td>
                      <td className="px-5 py-4 text-white/50">{t.assignedTo?.name || '—'}</td>
                      <td className="px-5 py-4 text-white/40 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
                <span className="text-xs text-white/40">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost-glass">Prev</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost-glass">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><span className="text-white/40">{label}:</span> <span className="text-white/80 font-medium">{value}</span></div>;
}
