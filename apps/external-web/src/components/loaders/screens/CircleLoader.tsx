'use client';

import React, { useState, useEffect } from 'react';
import SmartProgressBar from '../SmartProgressBar';

interface CircleLoaderProps {
  progress: number;
  premium?: boolean;
  onComplete?: () => void;
}

const members = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

export default function CircleLoader({ progress, premium, onComplete }: CircleLoaderProps) {
  const [visibleMembers, setVisibleMembers] = useState(0);

  useEffect(() => {
    const count = Math.floor((progress / 100) * members.length);
    setVisibleMembers(count);
  }, [progress]);

  const angleStep = 360 / members.length;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative w-48 h-48">
        {members.map((name, i) => {
          const angle = angleStep * i - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 72;
          const x = 96 + r * Math.cos(rad);
          const y = 96 + r * Math.sin(rad);
          const isVisible = i < visibleMembers;

          return (
            <div
              key={name}
              className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                isVisible
                  ? premium
                    ? 'bg-violet-500 text-white scale-100 shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                    : 'bg-[#8B5CF6] text-white scale-100'
                  : 'bg-gray-700 text-gray-600 scale-0'
              }`}
              style={{
                left: x - 16,
                top: y - 16,
              }}
            >
              {name[0]}
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center">
          <SmartProgressBar progress={progress} variant="ring" size="sm" premium={premium} />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-white font-semibold text-lg">
          {visibleMembers < members.length
            ? `Adding members... (${visibleMembers}/${members.length})`
            : 'All members joined!'}
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          {visibleMembers < members.length
            ? 'Sending invites to group members'
            : 'Your group is ready'}
        </p>
      </div>

      {premium && (
        <div className="flex flex-wrap gap-2 justify-center max-w-[200px]">
          {members.slice(0, visibleMembers).map((name) => (
            <div
              key={name}
              className="px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px]"
            >
              {name} ✓
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
