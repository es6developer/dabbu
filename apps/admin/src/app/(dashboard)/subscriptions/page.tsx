'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

const subscriptionRevenue = [
  { month: 'Jan', free: 0, basic: 3200, premium: 8400, family: 3600 },
  { month: 'Feb', free: 0, basic: 3800, premium: 9200, family: 4200 },
  { month: 'Mar', free: 0, basic: 4100, premium: 10100, family: 4800 },
  { month: 'Apr', free: 0, basic: 4500, premium: 11200, family: 5400 },
  { month: 'May', free: 0, basic: 5200, premium: 12800, family: 6200 },
  { month: 'Jun', free: 0, basic: 5800, premium: 14100, family: 7100 },
  { month: 'Jul', free: 0, basic: 6100, premium: 15200, family: 7800 },
  { month: 'Aug', free: 0, basic: 6500, premium: 16800, family: 8500 },
  { month: 'Sep', free: 0, basic: 7200, premium: 18100, family: 9200 },
  { month: 'Oct', free: 0, basic: 7800, premium: 19500, family: 9800 },
  { month: 'Nov', free: 0, basic: 8200, premium: 20800, family: 10400 },
  { month: 'Dec', free: 0, basic: 8500, premium: 22100, family: 11200 },
];

const planMetrics = [
  { name: 'Free', users: 8500, revenue: 0, conversion: '18%', color: 'bg-gray-500' },
  { name: 'Basic', users: 3200, revenue: 8500, conversion: '27%', color: 'bg-indigo-500' },
  { name: 'Premium', users: 1800, revenue: 22100, conversion: '42%', color: 'bg-purple-500' },
  { name: 'Family', users: 800, revenue: 11200, conversion: '35%', color: 'bg-violet-500' },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Plan performance and subscriber metrics</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {planMetrics.map((plan) => (
          <div key={plan.name} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('w-3 h-3 rounded-full', plan.color)} />
              <span className="font-medium">{plan.name}</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(plan.users)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue: {plan.revenue > 0 ? formatCurrency(plan.revenue) : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">
              Conversion: {plan.conversion}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue by Plan */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-1">Revenue by Plan</h3>
        <p className="text-sm text-muted-foreground mb-6">Monthly breakdown</p>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subscriptionRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
              <Bar dataKey="basic" name="Basic" stackId="a" fill="#6366F1" radius={[2, 2, 0, 0]} />
              <Bar dataKey="premium" name="Premium" stackId="a" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="family" name="Family" stackId="a" fill="#A78BFA" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
