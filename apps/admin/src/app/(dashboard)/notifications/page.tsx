'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { broadcastNotification } from '@/lib/api';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    totalUsers: number;
    sentCount: number;
    failedCount: number;
  } | null>(null);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      return;
    }
    setSending(true);
    setResult(null);
    setError('');
    try {
      const res = await broadcastNotification({ title, message, type });
      setResult(res.data);
      setTitle('');
      setMessage('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Broadcast Notification</h1>
        <p className="text-muted-foreground">Send push notifications to all active users</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notification Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
            >
              <option value="system">System Announcement</option>
              <option value="maintenance">Maintenance Notice</option>
              <option value="promotion">Promotional</option>
              <option value="alert">Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System Maintenance Tonight"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your notification message..."
              rows={4}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Sent to {result.sentCount} / {result.totalUsers} users
              {result.failedCount > 0 && ` (${result.failedCount} failed)`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
