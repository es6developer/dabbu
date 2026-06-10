'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getRandomFact } from '@/data/financialFacts';

interface FactCarouselLoaderProps {
  category?: string;
  interval?: number;
  premium?: boolean;
  onFactChange?: (fact: string) => void;
}

export default function FactCarouselLoader({
  category,
  interval = 4000,
  premium = false,
  onFactChange,
}: FactCarouselLoaderProps) {
  const [fact, setFact] = useState('');
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const updateFact = () => {
    setVisible(false);
    setTimeout(() => {
      const newFact = getRandomFact(category);
      setFact(newFact);
      onFactChange?.(newFact);
      setVisible(true);
    }, 400);
  };

  useEffect(() => {
    setFact(getRandomFact(category));
    intervalRef.current = setInterval(updateFact, interval);
    return () => clearInterval(intervalRef.current);
  }, [category, interval]);

  return (
    <div className="flex flex-col items-center gap-3 px-6 max-w-sm mx-auto">
      {premium && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
            Did you know?
          </span>
          <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
        </div>
      )}

      <div
        className={`text-center transition-all duration-400 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <p className={`text-sm leading-relaxed ${premium ? 'text-violet-200' : 'text-gray-300'}`}>
          {fact || 'Loading insights...'}
        </p>
      </div>

      <div className="flex gap-1.5">
        <div
          className={`w-6 h-1 rounded-full transition-all duration-300 ${
            premium ? 'bg-violet-500' : 'bg-[#8B5CF6]'
          }`}
          style={{ opacity: 0.6 }}
        />
        <div
          className={`w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse`}
          style={{ animationDuration: '1.5s' }}
        />
        <div
          className={`w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse`}
          style={{ animationDuration: '2s' }}
        />
      </div>
    </div>
  );
}
