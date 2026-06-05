'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import { listTickets, updateTicket, assignTicket, type SupportTicket } from '@/lib/api';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const statusStyles: Record<string, string> = {
  open: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  resolved: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
  closed: 'text-gray-600 bg-gray-50 dark:bg-gray-500/10 dark:text-gray-400',
};

const priorityStyles: Record<string, string> = {
  low: 'text-gray-600 bg-gray-50 dark:bg-gray-500/10 dark:text-gray-400',
  medium: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
  high: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  urgent: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
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
    setLoading(true);
    setError(null);
    try {
      const res = await listTickets({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      setTickets(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function handleStatusChange(id: string, status: string) {
    setStatusUpdating(id);
    try {
      await updateTicket(id, { status });
      load();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setStatusUpdating('');
    }
  }

  async function handleAssign(id: string) {
    try {
      await assignTicket(id);
      load();
      if (selected?.id === id) {
        setSelected((prev) =>
          prev ? { ...prev, assignedTo: { id: '', name: 'Me', email: '' } } : null,
        );
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSaveNotes(id: string) {
    try {
      await updateTicket(id, { adminNotes: noteInput });
      setNoteInput('');
      load();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, adminNotes: noteInput } : null));
        setSelected(null);
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ChevronLeft size={16} /> Back to tickets
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4 dark:border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.subject}</h2>
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[selected.status]}`}
              >
                {selected.status.replace('_', ' ')}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[selected.priority]}`}
              >
                {selected.priority}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">User:</span>{' '}
              <span className="text-gray-900 dark:text-white font-medium">
                {selected.user
                  ? `${selected.user.firstName} ${selected.user.lastName}`
                  : selected.email || 'Anonymous'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Category:</span>{' '}
              <span className="text-gray-900 dark:text-white">{selected.category}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Assigned to:</span>{' '}
              <span className="text-gray-900 dark:text-white">
                {selected.assignedTo?.name || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created:</span>{' '}
              <span className="text-gray-900 dark:text-white">
                {new Date(selected.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {selected.message}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                disabled={s === selected.status || statusUpdating === selected.id}
                onClick={() => handleStatusChange(selected.id, s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${s === selected.status ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {!selected.assignedTo && (
              <button
                onClick={() => handleAssign(selected.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Assign to me
              </button>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Notes
            </label>
            <textarea
              value={noteInput || selected.adminNotes || ''}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add internal notes..."
            />
            <button
              onClick={() => handleSaveNotes(selected.id)}
              disabled={!noteInput && !selected.adminNotes}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage and respond to user support requests
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: null, label: 'All', icon: Filter },
            { key: 'open', label: 'Open', icon: MessageCircle },
            { key: 'in_progress', label: 'In Progress', icon: Clock },
            { key: 'resolved', label: 'Resolved', icon: CheckCircle },
            { key: 'closed', label: 'Closed', icon: XCircle },
          ].map((f) => (
            <button
              key={f.key ?? 'all'}
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Open</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            {tickets.filter((t) => t.status === 'open').length}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">In Progress</p>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
            {tickets.filter((t) => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Resolved</p>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
            {tickets.filter((t) => t.status === 'resolved').length}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden dark:border dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No tickets found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Subject
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      User
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Priority
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Assigned
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                        {t.subject}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {t.user ? `${t.user.firstName} ${t.user.lastName}` : t.email || 'Anonymous'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[t.status]}`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[t.priority]}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.category}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {t.assignedTo?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
