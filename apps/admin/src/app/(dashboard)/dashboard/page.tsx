'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { getDashboardStats } from '@/lib/api';

const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  subtitle,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: 'up' | 'down';
  subtitle: string;
}) => (
  <div className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {change && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <ArrowUpRight size={14} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={14} className="text-red-500" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                trend === 'up' ? 'text-emerald-500' : 'text-red-500',
              )}
            >
              {change}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{subtitle}</span>
          </div>
        )}
      </div>
      <div className="w-10 h-10 rounded-lg bg-dabbu-500/10 flex items-center justify-center">
        <Icon size={20} className="text-dabbu-500" />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((json) => setStats(json.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your business at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={formatNumber(stats?.totalUsers ?? 0)}
          change=""
          icon={Users}
          trend="up"
          subtitle=""
        />
        <StatCard
          title="Active Users"
          value={formatNumber(stats?.activeUsers ?? 0)}
          change=""
          icon={Users}
          trend="up"
          subtitle=""
        />
        <StatCard
          title="Active Subscriptions"
          value={formatNumber(stats?.activeSubscriptions ?? 0)}
          change=""
          icon={CreditCard}
          trend="up"
          subtitle=""
        />
        <StatCard
          title="Revenue This Month"
          value={`₹${formatNumber(stats?.revenueThisMonth ?? 0)}`}
          change=""
          icon={DollarSign}
          trend="up"
          subtitle=""
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-2">New Users Today</h3>
          <p className="text-3xl font-bold">{stats?.newUsersToday ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-2">Pending Payments</h3>
          <p className="text-3xl font-bold">{stats?.pendingPayments ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-2">Total Transactions</h3>
          <p className="text-3xl font-bold">{formatNumber(stats?.totalTransactions ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}
