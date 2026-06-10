'use client';

import React, { useState } from 'react';

interface ErrorLoadingScreenProps {
  error?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  premium?: boolean;
}

const funnyMessages = [
  'Our hamsters ran out of coffee...',
  'The AI is taking an unscheduled break...',
  'Someone forgot to pay the internet bill...',
  'Expenses are playing hide and seek...',
  'The abacus malfunctioned...',
  'Our servers are doing yoga...',
  'Transactions went on a walkabout...',
  'The calculator is tired of all this math...',
];

export default function ErrorLoadingScreen({
  error,
  onRetry,
  onDismiss,
  premium = false,
}: ErrorLoadingScreenProps) {
  const [funny] = useState(() => funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-6">
      <div className="relative">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${
            premium
              ? 'bg-violet-500/10 border-2 border-violet-500/30'
              : 'bg-red-500/10 border-2 border-red-500/30'
          }`}
        >
          <span className={premium ? 'text-violet-400' : 'text-red-400'}>!</span>
        </div>

        {premium && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center text-[8px] text-white font-bold">
            ✦
          </div>
        )}
      </div>

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg mb-1">
          {premium ? 'Premium Recovery Mode' : 'Something went wrong'}
        </h3>
        <p className="text-gray-400 text-sm">{funny}</p>
        {error && (
          <p className="text-gray-500 text-xs mt-2 font-mono max-w-[280px] mx-auto truncate">
            {error}
          </p>
        )}
      </div>

      {premium && (
        <div className="flex items-center gap-2 text-[10px] text-violet-400 font-mono">
          <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
          AUTO-RETRY IN 5s
        </div>
      )}

      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              premium
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
            }`}
          >
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-5 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
