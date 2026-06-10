'use client';

import React, { useState, useEffect } from 'react';
import SmartProgressBar from '../SmartProgressBar';

interface ReportLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

const phases = [
  'Gathering transaction data...',
  'Computing category breakdown...',
  'Analyzing trends over time...',
  'Generating charts & graphs...',
  'Finalizing report...',
];

export default function ReportLoader({ progress, premium, onComplete }: ReportLoaderProps) {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const idx = Math.min(Math.floor((progress / 100) * phases.length), phases.length - 1);
    setPhaseIdx(idx);
  }, [progress]);

  const barHeights = [20, 40, 65, 45, 80, 30, 55, 70, 35, 60, 50, 75];

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex items-center gap-4">
        <SmartProgressBar progress={progress} variant="ring" size="lg" premium={premium} />
      </div>

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg">Generating Report</h3>
        <p className="text-gray-400 text-sm mt-1">{phases[phaseIdx]}</p>
      </div>

      {/* animated bar chart */}
      <div className="flex items-end gap-1.5 h-24 w-full max-w-[280px]">
        {barHeights.map((h, i) => {
          const fillProgress = Math.max(0, Math.min(1, (progress / 100) * 1.5 - i * 0.05));
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all duration-500"
              style={{
                height: `${h * fillProgress}%`,
                background:
                  fillProgress > 0
                    ? premium
                      ? `linear-gradient(to top, #8B5CF6, #A78BFA)`
                      : `linear-gradient(to top, #7C3AED, #8B5CF6)`
                    : '#1f2937',
                opacity: fillProgress > 0 ? 0.4 + fillProgress * 0.6 : 0.2,
              }}
            />
          );
        })}
      </div>

      {premium && (
        <div className="flex flex-wrap gap-2 justify-center max-w-[260px]">
          {['Food', 'Travel', 'Bills', 'Shopping', 'Others'].map((cat, i) => (
            <div
              key={cat}
              className={`px-2 py-0.5 rounded text-[10px] transition-all duration-300 ${
                i < Math.floor((progress / 100) * 5)
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                  : 'bg-gray-800/50 text-gray-600 border border-gray-700/30'
              }`}
            >
              {cat}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
