'use client';

import React from 'react';
import SmartProgressBar from './SmartProgressBar';
import FactCarouselLoader from './FactCarouselLoader';
import MiniGameLoader from './MiniGameLoader';

interface PremiumLoaderProps {
  progress: number;
  variant?: 'health' | 'ring' | 'shield' | 'cash' | 'mesh';
  category?: string;
  showMiniGame?: boolean;
  label?: string;
  onComplete?: (score?: number) => void;
}

export default function PremiumLoader({
  progress,
  variant = 'ring',
  category = 'savings',
  showMiniGame = false,
  label,
  onComplete,
}: PremiumLoaderProps) {
  return (
    <div className="relative flex flex-col items-center gap-6 py-8 px-4">
      {/* premium gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-violet-500/10 via-transparent to-violet-500/5 pointer-events-none" />

      <div className="relative">
        <SmartProgressBar progress={progress} variant={variant} size="lg" premium />
        {/* halo glow */}
        <div
          className="absolute -inset-4 rounded-full bg-violet-500/10 blur-xl pointer-events-none"
          style={{ opacity: progress / 100 }}
        />
      </div>

      {label && <h3 className="text-white font-semibold text-lg text-center relative">{label}</h3>}

      <div className="w-full max-w-xs relative">
        <FactCarouselLoader category={category} interval={5000} premium />
      </div>

      {showMiniGame && (
        <div className="relative">
          <MiniGameLoader duration={3000} premium onComplete={onComplete} />
        </div>
      )}

      {/* premium badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
          Premium Experience
        </span>
      </div>
    </div>
  );
}
