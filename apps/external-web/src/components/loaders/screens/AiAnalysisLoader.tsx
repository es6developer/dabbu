'use client';

import React, { useState, useEffect } from 'react';

interface AiAnalysisLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

const insights = [
  'Scanning transaction patterns...',
  'Detecting recurring subscriptions...',
  'Comparing with similar users...',
  'Identifying savings opportunities...',
  'Generating personalized report...',
];

const dots = [
  [2, 4],
  [5, 2],
  [8, 4],
  [6, 6],
  [3, 7],
  [7, 3],
  [4, 5],
  [6, 3],
  [3, 4],
  [7, 5],
];

export default function AiAnalysisLoader({ progress, premium, onComplete }: AiAnalysisLoaderProps) {
  const [insightIdx, setInsightIdx] = useState(0);

  useEffect(() => {
    const idx = Math.min(Math.floor((progress / 100) * insights.length), insights.length - 1);
    setInsightIdx(idx);
  }, [progress]);

  const activeDots = Math.floor((progress / 100) * dots.length);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* animated neural mesh */}
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="absolute inset-0">
          <defs>
            <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
          </defs>
          {dots.map(([x1, y1], i) =>
            dots.slice(i + 1).map(([x2, y2], j) => {
              const idx = i * dots.length + j;
              const isActive = idx < activeDots * 3;
              return (
                <line
                  key={`${i}-${j}`}
                  x1={x1 * 16}
                  y1={y1 * 16}
                  x2={x2 * 16}
                  y2={y2 * 16}
                  stroke={isActive ? (premium ? '#A78BFA' : '#8B5CF6') : '#1f2937'}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  className="transition-all duration-500"
                  opacity={isActive ? 0.6 : 0.2}
                />
              );
            }),
          )}
          {dots.map(([x, y], i) => (
            <circle
              key={i}
              cx={x * 16}
              cy={y * 16}
              r={i < activeDots ? 4 : 2}
              fill={i < activeDots ? (premium ? '#A78BFA' : '#8B5CF6') : '#374151'}
              className="transition-all duration-500"
            >
              {i < activeDots && (
                <animate
                  attributeName="r"
                  values="3;5;3"
                  dur={`${1.5 + (i % 3) * 0.5}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-2xl font-bold ${premium ? 'text-violet-300' : 'text-white'}`}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg">AI Analysis</h3>
        <p className="text-gray-400 text-sm mt-1">{insights[insightIdx]}</p>
      </div>

      <div className="flex gap-1.5">
        {insights.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < insightIdx
                ? premium
                  ? 'bg-violet-500'
                  : 'bg-[#8B5CF6]'
                : i === insightIdx
                  ? premium
                    ? 'bg-violet-400 animate-pulse'
                    : 'bg-[#8B5CF6] animate-pulse'
                  : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
