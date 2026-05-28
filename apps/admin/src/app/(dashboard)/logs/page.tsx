'use client';

import { useState } from 'react';
import {
  Search, Download, AlertTriangle, Filter, Info, RefreshCw,
} from 'lucide-react';

const logs = [
  { time: '2025-08-15 14:32:01', level: 'error', source: 'auth', message: 'Invalid JWT token received', user: 'user_12874', ip: '192.168.1.50' },
  { time: '2025-08-15 14:30:22', level: 'warn', source: 'api', message: 'Rate limit approaching for /api/accounts', user: 'user_98321', ip: '10.0.0.15' },
  { time: '2025-08-15 14:28:45', level: 'info', source: 'payment', message: 'Stripe webhook processed: evt_3O...', user: 'user_45231', ip: '3.210.0.12' },
  { time: '2025-08-15 14:25:10', level: 'error', source: 'db', message: 'Query timeout after 30s on table transactions', user: 'user_77882', ip: '10.0.0.22' },
  { time: '2025-08-15 14:20:00', level: 'warn', source: 'sms', message: 'SMS delivery failed for +919876543210', user: 'user_12874', ip: '-' },
  { time: '2025-08-15 14:15:33', level: 'info', source: 'family', message: 'Family "Home" created by user_98321', user: 'user_98321', ip: '10.0.0.15' },
  { time: '2025-08-15 14:10:55', level: 'error', source: 'subscription', message: 'Subscription renewal webhook failed', user: 'user_45231', ip: '3.210.0.12' },
  { time: '2025-08-15 14:05:12', level: 'info', source: 'user', message: 'User profile updated successfully', user: 'user_12874', ip: '192.168.1.50' },
];

const filterOptions = [
  { key: null, label: 'All', icon: Filter },
  { key: 'error', label: 'Errors', icon: AlertTriangle },
  { key: 'warn', label: 'Warnings', icon: Info },
  { key: 'info', label: 'Info', icon: Info },
];

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const filtered = logs.filter((l) => {
    if (levelFilter && l.level !== levelFilter) { return false; }
    if (search && !l.message.toLowerCase().includes(search.toLowerCase())) { return false; }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Logs</h1>
          <p className="text-gray-500 dark:text-gray-400">Monitor application logs and events</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {filterOptions.map((f) => (
            <button
              key={f.key ?? 'all'}
              onClick={() => setLevelFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                levelFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden dark:border dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Message</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{log.time}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.level === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        : log.level === 'warn'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.source}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-md truncate">{log.message}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{log.user}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
