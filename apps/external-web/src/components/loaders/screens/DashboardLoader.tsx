'use client';

import React, { useEffect, useState } from 'react';
import SmartProgressBar from '../SmartProgressBar';
import FactCarouselLoader from '../FactCarouselLoader';

interface DashboardLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

export default function DashboardLoader({ progress, premium, onComplete }: DashboardLoaderProps) {
  const [phase, setPhase] = useState<'sync' | 'analyze' | 'done'>('sync');

  useEffect(() => {
    if (progress < 33) {
      setPhase('sync');
    } else if (progress < 66) {
      setPhase('analyze');
    } else {
      setPhase('done');
    }
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex items-center gap-3">
        <div className="relative">
          <SmartProgressBar progress={progress} variant="ring" size="lg" premium={premium} />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg">
          {phase === 'sync' && 'Syncing your expenses...'}
          {phase === 'analyze' && 'Analyzing spending patterns...'}
          {phase === 'done' && 'Almost ready!'}
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          {phase === 'sync' && 'Gathering data from all group members'}
          {phase === 'analyze' && 'Running AI calculations'}
          {phase === 'done' && 'Preparing your dashboard'}
        </p>
      </div>

      {premium && <FactCarouselLoader category="insights" interval={5000} premium />}

      <div className="w-full max-w-xs space-y-2">
        <SkeletonBar w="75%" delay={0} />
        <SkeletonBar w="90%" delay={0.1} />
        <SkeletonBar w="60%" delay={0.2} />
        <SkeletonBar w="85%" delay={0.3} />
      </div>
    </div>
  );
}

function SkeletonBar({ w, delay }: { w: string; delay: number }) {
  return (
    <div className="h-3 bg-gray-800 rounded-full overflow-hidden" style={{ width: w }}>
      <div
        className="h-full bg-gradient-to-r from-violet-500/20 via-violet-400/30 to-violet-500/20 rounded-full animate-shimmer"
        style={{ animationDelay: `${delay}s` }}
      />
    </div>
  );
}
