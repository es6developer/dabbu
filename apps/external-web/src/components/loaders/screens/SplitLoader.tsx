'use client';

import React, { useState, useEffect } from 'react';
import SmartProgressBar from '../SmartProgressBar';
import MiniGameLoader from '../MiniGameLoader';

interface SplitLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

export default function SplitLoader({ progress, premium, onComplete }: SplitLoaderProps) {
  const [phase, setPhase] = useState<'calculating' | 'optimizing' | 'done'>('calculating');

  useEffect(() => {
    if (progress < 40) {
      setPhase('calculating');
    } else if (progress < 80) {
      setPhase('optimizing');
    } else {
      setPhase('done');
    }
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex items-center gap-4">
        <SmartProgressBar progress={progress} variant="cash" size="lg" premium={premium} />
      </div>

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg">
          {phase === 'calculating' && 'Splitting expenses...'}
          {phase === 'optimizing' && 'Finding fair shares...'}
          {phase === 'done' && 'Split complete!'}
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          {phase === 'calculating' && 'Calculating per-person amounts'}
          {phase === 'optimizing' && 'Minimizing transactions'}
          {phase === 'done' && 'Everyone pays their fair share'}
        </p>
      </div>

      {premium && (
        <div className="flex gap-3">
          {['₹0', '₹500', '₹1K', '₹2K', '₹5K'].map((amt, i) => (
            <div
              key={amt}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 ${
                i <= Math.floor((progress / 100) * 4)
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-gray-800/50 text-gray-600 border border-gray-700/30'
              }`}
            >
              {amt}
            </div>
          ))}
        </div>
      )}

      {premium && progress < 80 && (
        <div className="mt-2">
          <MiniGameLoader duration={2000} premium />
        </div>
      )}
    </div>
  );
}
