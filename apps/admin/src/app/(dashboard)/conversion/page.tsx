'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Eye, ShoppingCart, CreditCard, Users, ArrowRight, Loader2, AlertCircle, Layers } from 'lucide-react';
import { getConversionFunnel, ConversionFunnel } from '@/lib/api';

const STAGES = [
  { key: 'pricing_viewed', label: 'Pricing Viewed', icon: Eye, color: '#6366f1' },
  { key: 'checkout_started', label: 'Checkout Started', icon: ShoppingCart, color: '#8b5cf6' },
  { key: 'payment_completed', label: 'Payment Completed', icon: CreditCard, color: '#06b6d4' },
  { key: 'retained_30d', label: 'Retained (30d)', icon: Users, color: '#22c55e' },
] as const;

function RateBadge({ rate }: { rate: string }) {
  const num = parseFloat(rate);
  const color = num >= 50 ? 'text-emerald-400' : num >= 25 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`text-sm font-semibold ${color}`}>{rate}</span>;
}

export default function ConversionPage() {
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConversionFunnel()
      .then((res) => setFunnel(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversion data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-panel p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-white/70 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-panel p-8 text-center">
          <Layers className="w-8 h-8 text-white/30 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No conversion data available yet.</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(
    funnel.pricing_viewed,
    funnel.checkout_started,
    funnel.payment_completed,
    funnel.retained_30d,
    1,
  );

  const barData = STAGES.map((s) => ({
    name: s.label,
    value: funnel[s.key as keyof ConversionFunnel] as number,
    fill: s.color,
  }));

  const conversionPairs = [
    { from: 'Pricing Viewed', to: 'Checkout Started', rate: funnel.viewToCheckout, fromKey: 'pricing_viewed', toKey: 'checkout_started' },
    { from: 'Checkout Started', to: 'Payment Completed', rate: funnel.checkoutToPayment, fromKey: 'checkout_started', toKey: 'payment_completed' },
    { from: 'Payment Completed', to: 'Retained (30d)', rate: funnel.paymentToRetained, fromKey: 'payment_completed', toKey: 'retained_30d' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Conversion Funnel</h1>
          <p className="text-white/40">Track user progression through the subscription funnel</p>
        </div>
        <div className="glass-card px-4 py-3 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider">Overall Conversion</p>
          <p className="text-2xl font-bold text-emerald-400">{funnel.overallConversion}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {STAGES.map((stage, i) => {
          const count = funnel[stage.key as keyof ConversionFunnel] as number;
          const pct = ((count / maxCount) * 100).toFixed(0);
          return (
            <div key={stage.key} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-white/50">{stage.label}</p>
                <stage.icon className="w-4 h-4 text-white/30" />
              </div>
              <p className="text-2xl font-bold text-white">{count.toLocaleString()}</p>
              <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                />
              </div>
              <p className="text-xs text-white/30 mt-1">{pct}% of peak</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 py-4">
        {conversionPairs.map((pair, i) => (
          <React.Fragment key={pair.rate}>
            <div className="glass-card px-4 py-2.5 text-center min-w-[140px]">
              <p className="text-xs text-white/40 mb-1">{pair.from} &rarr; {pair.to}</p>
              <RateBadge rate={pair.rate} />
            </div>
            {i < conversionPairs.length - 1 && <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-white/80 font-semibold mb-4">Funnel Drop-off</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} width={150} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '24px',
                  color: '#fff',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Users']}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={36}>
                {barData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
