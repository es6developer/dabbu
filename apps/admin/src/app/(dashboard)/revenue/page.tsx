'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, TrendingUp, Users, CreditCard, Download } from 'lucide-react';

const revenueData = [
  { month: 'Jan', mrr: 45000, arr: 540000 },
  { month: 'Feb', mrr: 52000, arr: 624000 },
  { month: 'Mar', mrr: 48000, arr: 576000 },
  { month: 'Apr', mrr: 58000, arr: 696000 },
  { month: 'May', mrr: 55000, arr: 660000 },
  { month: 'Jun', mrr: 62000, arr: 744000 },
];

const planRevenue = [
  { name: 'Free', value: 0, color: '#6b7280' },
  { name: 'Basic', value: 25, color: '#3b82f6' },
  { name: 'Premium', value: 45, color: '#f59e0b' },
  { name: 'Family', value: 30, color: '#22c55e' },
];

const monthlyRevenue = [
  { source: 'Subscriptions', current: 62000, previous: 55000 },
  { source: 'Add-ons', current: 8500, previous: 7200 },
  { source: 'API Access', current: 3200, previous: 2800 },
  { source: 'Other', current: 1200, previous: 980 },
];

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Track MRR, ARR, and subscription revenue</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: '$62,000', change: '+12.7%', color: 'text-emerald-600', icon: DollarSign },
          { label: 'ARR', value: '$744,000', change: '+12.7%', color: 'text-emerald-600', icon: TrendingUp },
          { label: 'Active Subs', value: '2,847', change: '+156', color: 'text-emerald-600', icon: Users },
          { label: 'Avg Revenue/User', value: '$21.78', change: '+$1.20', color: 'text-emerald-600', icon: CreditCard },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm dark:border dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className={`text-sm ${stat.color}`}>{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="month" className="text-xs text-gray-500" />
                <YAxis className="text-xs text-gray-500" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="mrr" name="MRR" stroke="#3b82f6" fill="url(#mrrGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Revenue by Plan</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planRevenue}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {planRevenue.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {planRevenue.filter(p => p.value > 0).map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Revenue Breakdown</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="source" className="text-xs text-gray-500" />
              <YAxis className="text-xs text-gray-500" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
              />
              <Bar dataKey="current" name="Current Month" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="previous" name="Previous Month" fill="#93c5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
