'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  DollarSign,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Activity,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { getDashboardStats, DashboardStats } from '@/lib/api';

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} />
  );
}

const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  subtitle,
  gradient,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: 'up' | 'down';
  subtitle: string;
  gradient: string;
}) => (
  <div className="group relative rounded-xl border bg-card p-5 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
    <div className={cn('absolute inset-0 opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.07]', gradient)} />
    <div className="relative flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          {title}
        </p>
        <p className="text-2xl font-bold mt-1.5 tabular-nums">{value}</p>
        {change && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <ArrowUpRight size={14} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={14} className="text-red-500" />
            )}
            <span
              className={cn(
                'text-xs font-semibold',
                trend === 'up' ? 'text-emerald-500' : 'text-red-500',
              )}
            >
              {change}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{subtitle}</span>
          </div>
        )}
      </div>
      <div className="w-10 h-10 rounded-xl bg-dabbu-500/10 flex items-center justify-center shrink-0 ml-3 group-hover:scale-110 transition-transform duration-300">
        <Icon size={20} className="text-dabbu-500" />
      </div>
    </div>
  </div>
);

const MiniCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-all">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold tabular-nums">{value}</p>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((json) => setStats(json.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your business at a glance
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={formatNumber(stats?.totalUsers ?? 0)}
          change={stats?.userGrowth != null ? `${stats.userGrowth > 0 ? '+' : ''}${stats.userGrowth}%` : ''}
          icon={Users}
          trend={(stats?.userGrowth ?? 0) >= 0 ? 'up' : 'down'}
          subtitle="vs last month"
          gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Active Users"
          value={formatNumber(stats?.activeUsers ?? 0)}
          change={`${Math.round(((stats?.activeUsers ?? 0) / Math.max(stats?.totalUsers ?? 1, 1)) * 100)}%`}
          icon={UserCheck}
          trend="up"
          subtitle="engagement rate"
          gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
        />
        <StatCard
          title="Active Subscriptions"
          value={formatNumber(stats?.activeSubscriptions ?? 0)}
          change={stats?.subscriptionGrowth != null ? `${stats.subscriptionGrowth > 0 ? '+' : ''}${stats.subscriptionGrowth}%` : ''}
          icon={CreditCard}
          trend={(stats?.subscriptionGrowth ?? 0) >= 0 ? 'up' : 'down'}
          subtitle="vs last month"
          gradient="bg-gradient-to-br from-violet-500 to-purple-500"
        />
        <StatCard
          title="Revenue This Month"
          value={`₹${formatNumber(stats?.revenueThisMonth ?? 0)}`}
          change={stats?.revenueGrowth != null ? `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%` : ''}
          icon={DollarSign}
          trend={(stats?.revenueGrowth ?? 0) >= 0 ? 'up' : 'down'}
          subtitle="vs last month"
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard
          label="New Users Today"
          value={formatNumber(stats?.newUsersToday ?? 0)}
          icon={TrendingUp}
        />
        <MiniCard
          label="Pending Payments"
          value={formatNumber(stats?.pendingPayments ?? 0)}
          icon={Activity}
        />
        <MiniCard
          label="Total Transactions"
          value={formatNumber(stats?.totalTransactions ?? 0)}
          icon={ArrowUpRight}
        />
        <MiniCard
          label="Total Families"
          value={formatNumber(stats?.totalFamilies ?? 0)}
          icon={Users}
        />
      </div>
    </div>
  );
}
