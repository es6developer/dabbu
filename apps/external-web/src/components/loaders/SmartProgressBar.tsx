'use client';

import React from 'react';

type BarVariant = 'health' | 'ring' | 'shield' | 'cash' | 'mesh';

interface SmartProgressBarProps {
  progress: number;
  variant?: BarVariant;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  premium?: boolean;
}

const sizeMap = { sm: 6, md: 10, lg: 14 };

function HealthBar({
  progress,
  size,
  premium,
}: {
  progress: number;
  size: number;
  premium?: boolean;
}) {
  const segments = 12;
  const activeSegments = Math.floor((progress / 100) * segments);
  return (
    <div className={`flex gap-0.5 ${premium ? 'opacity-80' : ''}`} style={{ height: size }}>
      {Array.from({ length: segments }).map((_, i) => {
        let bg: string;
        if (i >= activeSegments) {
          bg = 'var(--dabbu-surface2)';
        } else if (i < activeSegments * 0.33) {
          bg = '#EF4444';
        } else if (i < activeSegments * 0.66) {
          bg = '#F59E0B';
        } else if (premium) {
          bg = 'linear-gradient(180deg, #A78BFA, #7C3AED)';
        } else {
          bg = '#10B981';
        }
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: i < activeSegments ? `${50 + (i / segments) * 50}%` : '30%',
              alignSelf: 'flex-end',
              background: bg,
            }}
          />
        );
      })}
    </div>
  );
}

function RingBar({
  progress,
  size: _size,
  premium,
}: {
  progress: number;
  size: number;
  premium?: boolean;
}) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" className="rotate-[-90deg]">
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--dabbu-surface2)" strokeWidth="6" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={premium ? 'url(#ringGrad)' : '#8B5CF6'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
      />
      {premium && (
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
        </defs>
      )}
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--dabbu-text)"
        fontSize="14"
        fontWeight="bold"
        transform="rotate(90, 40, 40)"
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

function ShieldBar({
  progress,
  size: _size,
  premium,
}: {
  progress: number;
  size: number;
  premium?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: 44, height: 52 }}>
        <svg width="44" height="52" viewBox="0 0 44 52" className="absolute inset-0">
          <path
            d="M22 2L4 12v14c0 12.48 7.76 24.14 18 26 10.24-1.86 18-13.52 18-26V12L22 2z"
            fill="none"
            stroke="var(--dabbu-surface2)"
            strokeWidth="2"
          />
          <path
            d="M22 2L4 12v14c0 12.48 7.76 24.14 18 26 10.24-1.86 18-13.52 18-26V12L22 2z"
            fill="none"
            stroke={premium ? '#A78BFA' : '#8B5CF6'}
            strokeWidth="2"
            strokeDasharray="140"
            strokeDashoffset={140 - (progress / 100) * 140}
            className="transition-all duration-500"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold mt-2"
          style={{ color: 'var(--dabbu-text)' }}
        >
          {Math.round(progress)}%
        </div>
      </div>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--dabbu-surface2)' }}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            premium
              ? 'bg-gradient-to-r from-violet-500 via-purple-400 to-indigo-500'
              : 'bg-[#8B5CF6]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {premium && <span className="text-[10px] text-violet-400 font-semibold">LOCKED</span>}
    </div>
  );
}

function CashBar({
  progress,
  size,
  premium,
}: {
  progress: number;
  size: number;
  premium?: boolean;
}) {
  const filledBills = Math.floor((progress / 100) * 10);
  return (
    <div className="flex items-end gap-1" style={{ height: size * 2.5 }}>
      {Array.from({ length: 10 }).map((_, i) => {
        let bg: string;
        if (i >= filledBills) {
          bg = 'var(--dabbu-surface2)';
        } else if (premium) {
          bg = 'linear-gradient(180deg, #7C3AED, #10B981)';
        } else {
          bg = 'linear-gradient(180deg, #8B5CF6, #10B981)';
        }
        return (
          <div
            key={i}
            className="w-3 rounded-t transition-all duration-300"
            style={{
              height: i < filledBills ? `${(i + 1) * 10}%` : '8%',
              opacity: i < filledBills ? 0.5 + (i / 10) * 0.5 : 0.3,
              background: bg,
            }}
          />
        );
      })}
      {premium && (
        <div className="ml-1 self-center">
          <span className="text-emerald-400 text-[10px]">$</span>
        </div>
      )}
    </div>
  );
}

function MeshBar({
  progress,
  size: _size,
  premium,
}: {
  progress: number;
  size: number;
  premium?: boolean;
}) {
  const dots = 5;
  const activeDots = Math.floor((progress / 100) * dots * dots);
  return (
    <div className="grid grid-cols-5 gap-1" style={{ width: 100 }}>
      {Array.from({ length: dots * dots }).map((_, i) => (
        <div
          key={i}
          className={`rounded-sm transition-all duration-300 ${i < activeDots && premium ? 'shadow-[0_0_4px_rgba(139,92,246,0.6)]' : ''}`}
          style={{
            width: 12,
            height: 12,
            backgroundColor:
              i < activeDots ? (premium ? '#8B5CF6' : '#8B5CF6') : 'var(--dabbu-surface2)',
          }}
        />
      ))}
    </div>
  );
}

export default function SmartProgressBar({
  progress,
  variant = 'health',
  showLabel = false,
  size = 'md',
  className = '',
  premium = false,
}: SmartProgressBarProps) {
  const s = sizeMap[size];

  const variants: Record<BarVariant, React.ReactNode> = {
    health: <HealthBar progress={progress} size={s} premium={premium} />,
    ring: <RingBar progress={progress} size={s} premium={premium} />,
    shield: <ShieldBar progress={progress} size={s} premium={premium} />,
    cash: <CashBar progress={progress} size={s} premium={premium} />,
    mesh: <MeshBar progress={progress} size={s} premium={premium} />,
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {variants[variant]}
      {showLabel && (
        <span className="text-xs font-mono" style={{ color: 'var(--dabbu-text-muted)' }}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
