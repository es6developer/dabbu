'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Database, Cpu, HardDrive, Server, RefreshCw, Loader2 } from 'lucide-react';
import { getSystemHealth } from '@/lib/api';
import type { SystemHealth } from '@/lib/api';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSystemHealth();
      setHealth(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>;
  }

  if (!health) return null;

  const svc = health.services;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Health</h1>
          <p className="text-white/40 mt-1">Real-time server metrics and service status</p>
        </div>
        <button onClick={load} className="btn-ghost-glass flex items-center gap-2 px-4 py-2">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">Status</span>
          </div>
          <p className={`text-2xl font-bold ${health.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
            {health.status === 'healthy' ? 'Healthy' : 'Degraded'}
          </p>
          <p className="text-sm text-white/40 mt-1">Overall system status</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">Uptime</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatUptime(health.uptime)}</p>
          <p className="text-sm text-white/40 mt-1">Since last restart</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <span className="font-medium text-white/70">Version</span>
          </div>
          <p className="text-2xl font-bold text-white">v{health.version}</p>
          <p className="text-sm text-white/40 mt-1">API version</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-indigo-400" />
            Database
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${svc.database.status === 'healthy' ? 'badge-glass bg-emerald-500/15 text-emerald-400' : 'badge-glass bg-red-500/10 text-red-400'}`}>
                {svc.database.status}
              </span>
            </div>
            {svc.database.latency && (
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Latency</span>
                <span className="text-white font-medium">{svc.database.latency}ms</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu size={18} className="text-indigo-400" />
            CPU & Memory
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Memory</span>
              <span className="text-white font-medium">{svc.memory.usage}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Heap</span>
              <span className="text-white font-medium">{formatBytes(svc.memory.heapUsed)} / {formatBytes(svc.memory.heapTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">RSS</span>
              <span className="text-white font-medium">{formatBytes(svc.memory.rss)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">CPU Cores</span>
              <span className="text-white font-medium">{svc.cpu.cores}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Load (1m)</span>
              <span className="text-white font-medium">{svc.cpu.loadAverage[0]?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {svc.disk && (
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive size={18} className="text-indigo-400" />
            Disk
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Status</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${svc.disk.status === 'healthy' ? 'badge-glass bg-emerald-500/15 text-emerald-400' : 'badge-glass bg-amber-500/15 text-amber-400'}`}>
              {svc.disk.status}
            </span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-white/60 text-sm">Free</span>
            <span className="text-white font-medium">{formatBytes(svc.disk.free)} / {formatBytes(svc.disk.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
