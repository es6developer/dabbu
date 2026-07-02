'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, UserCheck, Percent, Users, Loader2 } from 'lucide-react';
import { getDashboardStats, listSubscriptions } from '@/lib/api';

export default function ChurnPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), listSubscriptions(1, 1000).catch(() => ({ data: [] }))])
      .then(([s]) => { setStats(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalUsers = stats?.totalUsers || 1;
  const activeUsers = stats?.activeUsers || 0;
  const retentionRate = ((activeUsers / totalUsers) * 100).toFixed(1);
  const churnRate = (100 - parseFloat(retentionRate)).toFixed(1);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Churn Analysis</h1>
          <p className="text-white/40">Track customer churn and retention metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Churn Rate', value: `${churnRate}%`, change: 'Based on active vs total', color: 'text-red-400', icon: Percent },
          { label: 'Active Users', value: activeUsers.toLocaleString(), change: `${totalUsers - activeUsers} inactive`, color: 'text-emerald-400', icon: UserCheck },
          { label: 'Retention Rate', value: `${retentionRate}%`, change: 'Active / Total', color: 'text-emerald-400', icon: TrendingUp },
          { label: 'Total Users', value: totalUsers.toLocaleString(), change: 'All time', color: 'text-emerald-400', icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/50">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-white/30" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className={`text-sm mt-1 ${stat.color}`}>{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-white/80 font-semibold mb-4">Active vs Inactive Users</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Users', active: activeUsers, inactive: totalUsers - activeUsers }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: '#fff' }} />
                <Bar dataKey="active" name="Active" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="inactive" name="Inactive" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-7xl font-bold text-red-400">{churnRate}%</p>
            <p className="text-white/50 mt-3">of users are inactive</p>
            <p className="text-sm text-white/30 mt-1">{totalUsers - activeUsers} out of {totalUsers} total</p>
          </div>
        </div>
      </div>
    </div>
  );
}
