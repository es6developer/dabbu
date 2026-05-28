'use client';

import { useState } from 'react';
import { Search, Filter, MessageCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  user: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
}

const tickets: Ticket[] = [
  { id: 'TK-001', subject: 'Cannot link bank account', user: 'rahul@email.com', status: 'open', priority: 'high', category: 'Technical', createdAt: '2 hours ago' },
  { id: 'TK-002', subject: 'Subscription upgrade not reflecting', user: 'priya@email.com', status: 'in_progress', priority: 'urgent', category: 'Billing', createdAt: '4 hours ago' },
  { id: 'TK-003', subject: 'Transaction categorization issue', user: 'amit@email.com', status: 'open', priority: 'medium', category: 'Feature', createdAt: '1 day ago' },
  { id: 'TK-004', subject: 'Family invite not working', user: 'sara@email.com', status: 'in_progress', priority: 'high', category: 'Technical', createdAt: '1 day ago' },
  { id: 'TK-005', subject: 'How to export transactions?', user: 'vikram@email.com', status: 'resolved', priority: 'low', category: 'Question', createdAt: '2 days ago' },
  { id: 'TK-006', subject: 'App crashing on Android', user: 'neha@email.com', status: 'open', priority: 'urgent', category: 'Bug', createdAt: '2 days ago' },
  { id: 'TK-007', subject: 'Feature request: recurring tags', user: 'arjun@email.com', status: 'closed', priority: 'low', category: 'Feature', createdAt: '3 days ago' },
  { id: 'TK-008', subject: 'SMS sync not detecting ICICI transactions', user: 'karan@email.com', status: 'open', priority: 'medium', category: 'Technical', createdAt: '3 days ago' },
];

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and respond to user support requests</p>
        </div>
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
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Open</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{tickets.filter(t => t.status === 'open').length}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">In Progress</p>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{tickets.filter(t => t.status === 'in_progress').length}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Resolved Today</p>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">12</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden dark:border dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{t.id}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{t.subject}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.user}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.category}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{t.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
