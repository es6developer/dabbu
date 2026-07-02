'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, TrendingUp, UserCheck, CreditCard, Loader2 } from 'lucide-react';
import { getDashboardStats, listSubscriptions } from '@/lib/api';

export default function RevenuePage() {
  const [stats, setStats] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), listSubscriptions(1, 1000).catch(() => ({ data: [] }))])
      .then(([s, subRes]) => { setStats(s.data); setSubs(subRes.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeSubs = subs.filter((s: any) => s.status === 'active');
  const monthlyRev = activeSubs.reduce((sum: number, s: any) => sum + Number(s.plan.price), 0);

  const planRevenue: { name: string; value: number; color: string }[] = [];
  const planMap = new Map<string, { value: number; color: string }>();
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];
  let ci = 0;
  activeSubs.forEach((s: any) => {
    const name = s.plan.name;
    if (!planMap.has(name)) planMap.set(name, { value: 0, color: colors[ci++ % colors.length] });
    planMap.get(name)!.value += Number(s.plan.price);
  });
  planMap.forEach((v, name) => planRevenue.push({ name, value: v.value, color: v.color }));

  const revenueData = [{ month: 'Current', mrr: monthlyRev, arr: monthlyRev * 12 }];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Revenue Analytics</h1>
          <p className="text-white/40">Track MRR, ARR, and subscription revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: `₹${monthlyRev.toLocaleString('en-IN')}`, change: 'Current month', icon: DollarSign },
          { label: 'ARR', value: `₹${(monthlyRev * 12).toLocaleString('en-IN')}`, change: 'Projected', icon: TrendingUp },
          { label: 'Active Subs', value: activeSubs.length.toLocaleString(), change: `${subs.length - activeSubs.length} inactive`, icon: UserCheck },
          { label: 'Avg Rev/User', value: activeSubs.length > 0 ? `₹${Math.round(monthlyRev / activeSubs.length).toLocaleString('en-IN')}` : '₹0', change: 'Per active sub', icon: CreditCard },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/50">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-white/30" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-emerald-400/80 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-white/80 font-semibold mb-4">Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: '#fff' }} />
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" fill="url(#mrrGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-white/80 font-semibold mb-4">Revenue by Plan</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planRevenue} cx="50%" cy="50%" innerRadius={80} outerRadius={140} paddingAngle={4} dataKey="value">
                  {planRevenue.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {planRevenue.filter((p) => p.value > 0).map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm text-white/50">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
