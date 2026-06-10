'use client';

import React, { useState, useEffect } from 'react';

interface OcrLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

const phases = [
  { label: 'Capturing', icon: '📷' },
  { label: 'Processing', icon: '⚙️' },
  { label: 'Reading text', icon: '🔍' },
  { label: 'Extracting data', icon: '📊' },
  { label: 'Done!', icon: '✅' },
];

export default function OcrLoader({ progress, premium, onComplete }: OcrLoaderProps) {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const idx = Math.min(Math.floor((progress / 100) * phases.length), phases.length - 1);
    setPhaseIdx(idx);
  }, [progress]);

  const scanLineY = (progress / 100) * 140;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative w-40 h-40 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <rect
            x="20"
            y="20"
            width="120"
            height="120"
            rx="8"
            fill="none"
            stroke="#374151"
            strokeWidth="1"
          />

          {/* receipt lines being scanned */}
          {[40, 55, 70, 85, 100, 115].map((y, i) => (
            <rect
              key={i}
              x="30"
              y={y}
              width={i % 2 === 0 ? 80 : 60}
              height="4"
              rx="2"
              fill={i < Math.floor((progress / 100) * 6) ? '#8B5CF6' : '#1f2937'}
              className="transition-all duration-300"
              opacity={i < Math.floor((progress / 100) * 6) ? 0.6 : 0.3}
            />
          ))}

          {/* scan line */}
          {phaseIdx < phases.length - 1 && (
            <line
              x1="15"
              y1={scanLineY}
              x2="145"
              y2={scanLineY}
              stroke={premium ? '#A78BFA' : '#8B5CF6'}
              strokeWidth="2"
              opacity={0.8}
              className="transition-all duration-200"
            >
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          )}

          {phaseIdx === phases.length - 1 && (
            <text
              x="80"
              y="80"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#22c55e"
              fontSize="24"
            >
              ✓
            </text>
          )}
        </svg>

        {premium && (
          <div className="absolute top-2 right-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-lg">{phases[phaseIdx].icon}</span>
          <h3 className="text-white font-semibold text-lg">{phases[phaseIdx].label}</h3>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          {phaseIdx < phases.length - 1
            ? 'Reading receipt data...'
            : 'Receipt scanned successfully'}
        </p>
      </div>

      {premium && (
        <div className="flex items-center gap-2 text-[10px] text-violet-400 font-mono">
          <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
          OCR v2.4 • 99.2% accuracy
        </div>
      )}
    </div>
  );
}
