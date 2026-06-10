'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SmartProgressBar from './SmartProgressBar';

interface Stage {
  label: string;
  substeps: string[];
}

interface ProgressiveLoaderProps {
  stages: Stage[];
  duration?: number;
  onProgress?: (progress: number, stageIndex: number) => void;
  onComplete?: () => void;
  variant?: 'health' | 'ring' | 'shield' | 'cash' | 'mesh';
  premium?: boolean;
  barSize?: 'sm' | 'md' | 'lg';
}

export default function ProgressiveLoader({
  stages,
  duration = 3000,
  onProgress,
  onComplete,
  variant = 'health',
  premium = false,
  barSize = 'md',
}: ProgressiveLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  const stepDuration = duration / stages.reduce((acc, s) => acc + s.substeps.length, 0);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const raw = Math.min((elapsed / duration) * 100, 100);
    setProgress(raw);
    onProgress?.(raw, stageIndex);

    let cumulative = 0;
    for (let si = 0; si < stages.length; si++) {
      const ssCount = stages[si].substeps.length;
      const stageStart = (cumulative / stages.reduce((a, s) => a + s.substeps.length, 0)) * 100;
      const stageEnd =
        ((cumulative + ssCount) / stages.reduce((a, s) => a + s.substeps.length, 0)) * 100;
      if (raw >= stageStart && raw < stageEnd) {
        setStageIndex(si);
        const localProgress = (raw - stageStart) / (stageEnd - stageStart);
        setStepIndex(Math.min(Math.floor(localProgress * ssCount), ssCount - 1));
        break;
      }
      cumulative += ssCount;
    }

    if (raw >= 100 && !doneRef.current) {
      doneRef.current = true;
      onComplete?.();
    }
  }, [stages, duration, onProgress, onComplete]);

  useEffect(() => {
    startRef.current = Date.now();
    doneRef.current = false;
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [tick]);

  const currentStage = stages[stageIndex];
  const currentStep = currentStage?.substeps[stepIndex] || '';

  return (
    <div
      className={`flex flex-col items-center gap-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <SmartProgressBar progress={progress} variant={variant} size={barSize} premium={premium} />

      <div className="text-center">
        {premium && currentStage && (
          <div className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">
            Stage {stageIndex + 1} / {stages.length}
          </div>
        )}
        {currentStage && <div className="text-sm font-medium text-white">{currentStage.label}</div>}
      </div>

      <div className="flex flex-col items-center gap-1.5 min-h-[40px]">
        {currentStep && (
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${premium ? 'bg-violet-500' : 'bg-[#8B5CF6]'} animate-pulse`}
            />
            <span className="text-xs text-gray-400">{currentStep}</span>
          </div>
        )}
      </div>

      {premium && (
        <div className="flex gap-1">
          {stages.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < stageIndex
                  ? 'bg-violet-500'
                  : i === stageIndex
                    ? 'bg-violet-400 animate-pulse'
                    : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
