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
      .then(([s]) => {
        setStats(s.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalUsers = stats?.totalUsers || 1;
  const activeUsers = stats?.activeUsers || 0;
  const retentionRate = ((activeUsers / totalUsers) * 100).toFixed(1);
  const churnRate = (100 - parseFloat(retentionRate)).toFixed(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Churn Analysis</h1>
          <p className="text-muted-foreground">Track customer churn and retention metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Churn Rate',
            value: `${churnRate}%`,
            change: 'Based on active vs total',
            color: 'text-red-600',
            icon: Percent,
          },
          {
            label: 'Active Users',
            value: activeUsers.toLocaleString(),
            change: `${totalUsers - activeUsers} inactive`,
            color: 'text-emerald-600',
            icon: UserCheck,
          },
          {
            label: 'Retention Rate',
            value: `${retentionRate}%`,
            change: 'Active / Total',
            color: 'text-emerald-600',
            icon: TrendingUp,
          },
          {
            label: 'Total Users',
            value: totalUsers.toLocaleString(),
            change: 'All time',
            color: 'text-emerald-600',
            icon: Users,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className={`text-sm ${stat.color}`}>{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <h3 className="text-foreground font-semibold mb-4">Active vs Inactive Users</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{ name: 'Users', active: activeUsers, inactive: totalUsers - activeUsers }]}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs text-muted-foreground" />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="active" name="Active" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inactive" name="Inactive" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <h3 className="text-foreground font-semibold mb-4">Churn Rate</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-bold text-red-500">{churnRate}%</p>
              <p className="text-muted-foreground mt-2">of users are inactive</p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalUsers - activeUsers} out of {totalUsers} total
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
