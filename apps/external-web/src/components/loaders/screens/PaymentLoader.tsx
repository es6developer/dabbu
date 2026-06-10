'use client';

import React, { useState, useEffect } from 'react';
import SmartProgressBar from '../SmartProgressBar';

interface PaymentLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

const steps = [
  'Initiating payment...',
  'Connecting to bank...',
  'Processing transaction...',
  'Verifying with UPI...',
  'Payment successful!',
];

export default function PaymentLoader({ progress, premium, onComplete }: PaymentLoaderProps) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const idx = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);
    setStepIdx(idx);
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <SmartProgressBar progress={progress} variant="shield" size="lg" premium={premium} />

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg">Processing Payment</h3>
        <p className="text-gray-400 text-sm mt-1">{steps[stepIdx]}</p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                i < stepIdx
                  ? 'bg-green-500 text-white'
                  : i === stepIdx
                    ? premium
                      ? 'bg-violet-500 text-white animate-pulse'
                      : 'bg-[#8B5CF6] text-white animate-pulse'
                    : 'bg-gray-700 text-gray-500'
              }`}
            >
              {i < stepIdx ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs transition-all duration-300 ${
                i <= stepIdx ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>

      {premium && (
        <div className="flex items-center gap-2 text-[10px] text-violet-400 font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          SECURE CONNECTION • AES-256
        </div>
      )}
    </div>
  );
}
