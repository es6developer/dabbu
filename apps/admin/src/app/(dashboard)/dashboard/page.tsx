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
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { getDashboardStats, DashboardStats } from '@/lib/api';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-white/[0.04]', className)} />;
}

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
  <div className="glass-card p-5 group">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/40 tracking-wide uppercase">{title}</p>
        <p className="text-3xl font-bold mt-2 tabular-nums text-white">{value}</p>
        {change && (
          <div className="flex items-center gap-1.5 mt-2.5">
            {trend === 'up' ? (
              <ArrowUpRight size={14} className="text-emerald-400" />
            ) : (
              <ArrowDownRight size={14} className="text-red-400" />
            )}
            <span className={cn('text-xs font-semibold', trend === 'up' ? 'text-emerald-400' : 'text-red-400')}>
              {change}
            </span>
            <span className="text-xs text-white/30 ml-1">{subtitle}</span>
          </div>
        )}
      </div>
      <div className="w-11 h-11 rounded-2xl bg-white/[0.06] flex items-center justify-center shrink-0 ml-3 group-hover:scale-110 transition-transform duration-300">
        <Icon size={20} className="text-white/60" />
      </div>
    </div>
  </div>
);

const MiniCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="glass-card p-4 group">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon size={16} className="text-white/50" />
      </div>
      <div>
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-sm font-bold text-white tabular-nums">{value}</p>
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Your business at a glance</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs text-white/40 border border-white/[0.06]">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
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
        />
        <StatCard
          title="Active Users"
          value={formatNumber(stats?.activeUsers ?? 0)}
          change={`${Math.round(((stats?.activeUsers ?? 0) / Math.max(stats?.totalUsers ?? 1, 1)) * 100)}%`}
          icon={UserCheck}
          trend="up"
          subtitle="engagement rate"
        />
        <StatCard
          title="Active Subscriptions"
          value={formatNumber(stats?.activeSubscriptions ?? 0)}
          change={stats?.subscriptionGrowth != null ? `${stats.subscriptionGrowth > 0 ? '+' : ''}${stats.subscriptionGrowth}%` : ''}
          icon={CreditCard}
          trend={(stats?.subscriptionGrowth ?? 0) >= 0 ? 'up' : 'down'}
          subtitle="vs last month"
        />
        <StatCard
          title="Revenue This Month"
          value={`₹${formatNumber(stats?.revenueThisMonth ?? 0)}`}
          change={stats?.revenueGrowth != null ? `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%` : ''}
          icon={DollarSign}
          trend={(stats?.revenueGrowth ?? 0) >= 0 ? 'up' : 'down'}
          subtitle="vs last month"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard label="New Users Today" value={formatNumber(stats?.newUsersToday ?? 0)} icon={TrendingUp} />
        <MiniCard label="Pending Payments" value={formatNumber(stats?.pendingPayments ?? 0)} icon={Activity} />
        <MiniCard label="Total Transactions" value={formatNumber(stats?.totalTransactions ?? 0)} icon={ArrowUpRight} />
        <MiniCard label="Total Families" value={formatNumber(stats?.totalFamilies ?? 0)} icon={Users} />
      </div>
    </div>
  );
}
