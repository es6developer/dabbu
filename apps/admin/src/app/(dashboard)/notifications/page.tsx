'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { broadcastNotification } from '@/lib/api';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ totalUsers: number; sentCount: number; failedCount: number } | null>(null);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    setSending(true); setResult(null); setError('');
    try {
      const res = await broadcastNotification({ title, message, type });
      setResult(res.data); setTitle(''); setMessage('');
    } catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Broadcast Notification</h1>
        <p className="text-white/40">Send push notifications to all active users</p>
      </div>

      <div className="glass-panel p-7 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Notification Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="glass-input w-full px-3 py-2.5 appearance-none">
              <option value="system" className="bg-gray-900">System Announcement</option>
              <option value="maintenance" className="bg-gray-900">Maintenance Notice</option>
              <option value="promotion" className="bg-gray-900">Promotional</option>
              <option value="alert" className="bg-gray-900">Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System Maintenance Tonight" className="glass-input w-full px-3 py-2.5" />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your notification message..." rows={4}
              className="glass-input w-full px-3 py-2.5 resize-none" />
          </div>

          <button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} className="btn-glass">
            {sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-2xl border border-red-500/20">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20">
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
