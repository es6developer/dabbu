'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingDown, UserMinus, Percent, RefreshCw } from 'lucide-react';

const churnData = [
  { month: 'Jan', churned: 45, new: 120, reactivated: 15 },
  { month: 'Feb', churned: 52, new: 135, reactivated: 18 },
  { month: 'Mar', churned: 38, new: 148, reactivated: 22 },
  { month: 'Apr', churned: 48, new: 142, reactivated: 20 },
  { month: 'May', churned: 35, new: 165, reactivated: 25 },
  { month: 'Jun', churned: 42, new: 158, reactivated: 28 },
];

const churnReasons = [
  { reason: 'Too expensive', pct: 32, count: 128 },
  { reason: 'Not using enough', pct: 24, count: 96 },
  { reason: 'Found alternative', pct: 18, count: 72 },
  { reason: 'Technical issues', pct: 14, count: 56 },
  { reason: 'Poor support', pct: 8, count: 32 },
  { reason: 'Other', pct: 4, count: 16 },
];

export default function ChurnPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Churn Analysis</h1>
          <p className="text-gray-500 dark:text-gray-400">Track customer churn and retention metrics</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Churn Rate', value: '4.2%', change: '-0.8%', color: 'text-emerald-600', icon: Percent },
          { label: 'Churned (30d)', value: '42', change: '+8', color: 'text-red-600', icon: UserMinus },
          { label: 'Retention Rate', value: '95.8%', change: '+0.8%', color: 'text-emerald-600', icon: TrendingDown },
          { label: 'Reactivation', value: '28', change: '+3', color: 'text-emerald-600', icon: RefreshCw },
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
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Churn vs New vs Reactivated</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="month" className="text-xs text-gray-500" />
                <YAxis className="text-xs text-gray-500" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                />
                <Bar dataKey="churned" name="Churned" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="new" name="New" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reactivated" name="Reactivated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Top Churn Reasons</h3>
          <div className="space-y-4">
            {churnReasons.map((r) => (
              <div key={r.reason}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{r.reason}</span>
                  <span className="text-gray-500">{r.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
