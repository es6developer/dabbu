'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Filter, Clock } from 'lucide-react';

const allNotifications = [
  { id: '1', type: 'alert', title: 'Server load high', message: 'CPU usage exceeded 80% on production', time: '2 min ago', read: false, severity: 'warning' },
  { id: '2', type: 'user', title: 'New signup', message: 'user@example.com just created an account', time: '5 min ago', read: false, severity: 'info' },
  { id: '3', type: 'payment', title: 'Payment failed', message: 'Subscription renewal failed for user_12345', time: '15 min ago', read: false, severity: 'error' },
  { id: '4', type: 'alert', title: 'DB connection pool', message: 'Connection pool at 75% capacity', time: '1 hour ago', read: true, severity: 'warning' },
  { id: '5', type: 'user', title: 'Account deleted', message: 'User requested account deletion', time: '2 hours ago', read: true, severity: 'info' },
  { id: '6', type: 'payment', title: 'Refund processed', message: '₹2,500 refunded to user_67890', time: '3 hours ago', read: false, severity: 'info' },
  { id: '7', type: 'system', title: 'Deploy completed', message: 'Version 2.4.1 deployed to production', time: '5 hours ago', read: true, severity: 'success' },
  { id: '8', type: 'alert', title: 'Rate limit hit', message: 'IP 192.168.1.1 exceeded rate limit', time: '6 hours ago', read: true, severity: 'warning' },
];

const severityColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
  error: 'text-red-500 bg-red-50 dark:bg-red-500/10',
  success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string | null>(null);

  const notifications = filter
    ? allNotifications.filter(n => n.type === filter)
    : allNotifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400">System-wide notifications and alerts</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: null, label: 'All', icon: Filter },
          { key: 'alert', label: 'Alerts', icon: Bell },
          { key: 'user', label: 'Users', icon: Bell },
          { key: 'payment', label: 'Payments', icon: Bell },
          { key: 'system', label: 'System', icon: Clock },
        ].map((f) => (
          <button
            key={f.key ?? 'all'}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700">
        <div className="space-y-1">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
              n.read ? 'opacity-60' : 'bg-gray-50 dark:bg-gray-700/50'
            }`}>
              <div className={`w-2 h-2 rounded-full mt-2 ${n.severity === 'error' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-500' : n.severity === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-900 dark:text-white truncate">{n.title}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    n.severity === 'error'
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : n.severity === 'warning'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      : n.severity === 'success'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  }`}>{n.type}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
