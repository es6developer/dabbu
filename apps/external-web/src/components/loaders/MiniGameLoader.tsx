'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MiniGameLoaderProps {
  onTap?: () => void;
  onComplete?: (score: number) => void;
  duration?: number;
  premium?: boolean;
}

type GameState = 'idle' | 'playing' | 'done';

export default function MiniGameLoader({
  onTap,
  onComplete,
  duration = 3000,
  premium = false,
}: MiniGameLoaderProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [activeButton, setActiveButton] = useState(0);
  const [combo, setCombo] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const gameTimerRef = useRef<ReturnType<typeof setInterval>>();
  const ripplesRef = useRef(0);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(duration);
    setCombo(0);

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          endGame();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    timerRef.current = setInterval(() => {
      setActiveButton(Math.floor(Math.random() * 9));
    }, 400);
  }, [duration]);

  const endGame = useCallback(() => {
    setGameState('done');
    clearInterval(gameTimerRef.current);
    clearInterval(timerRef.current);
    onComplete?.(score);
  }, [score, onComplete]);

  useEffect(() => {
    return () => {
      clearInterval(gameTimerRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const handleTap = () => {
    if (gameState === 'idle') {
      startGame();
      onTap?.();
      return;
    }
    if (gameState !== 'playing') {
      return;
    }

    setScore((s) => s + 1);
    setCombo((c) => c + 1);
    setActiveButton(Math.floor(Math.random() * 9));
    ripplesRef.current++;
    const id = ripplesRef.current;
    setRipples((r) => [...r, { id, x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 }]);
    setTimeout(() => setRipples((r) => r.filter((ri) => ri.id !== id)), 600);
    onTap?.();
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="text-sm text-gray-400 font-medium">
        {gameState === 'idle' && 'Tap to start →'}
        {gameState === 'playing' && `Tap! ${combo > 5 ? `🔥 x${combo}` : ''}`}
        {gameState === 'done' && `🎯 ${score} taps`}
      </div>

      {gameState === 'playing' && (
        <div className="text-xs text-gray-500 font-mono">{(timeLeft / 1000).toFixed(1)}s</div>
      )}

      <button
        onClick={handleTap}
        className={`relative w-48 h-48 rounded-full border-2 transition-all duration-150 overflow-hidden ${
          premium
            ? 'border-violet-500/50 bg-violet-500/10 hover:bg-violet-500/20'
            : 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20'
        } ${gameState === 'done' ? 'opacity-50 cursor-default' : 'cursor-pointer active:scale-95'}`}
        disabled={gameState === 'done'}
      >
        {gameState === 'playing' && (
          <div className="grid grid-cols-3 gap-2 p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-lg transition-all duration-100 ${
                  i === activeButton
                    ? premium
                      ? 'bg-violet-500 scale-110 shadow-[0_0_12px_rgba(139,92,246,0.6)]'
                      : 'bg-[#8B5CF6] scale-110 shadow-[0_0_12px_rgba(139,92,246,0.6)]'
                    : 'bg-gray-700/50'
                }`}
              />
            ))}
          </div>
        )}

        {gameState === 'idle' && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">▶</div>
        )}

        {gameState === 'done' && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">✓</div>
        )}

        {ripples.map((r) => (
          <div
            key={r.id}
            className="absolute w-4 h-4 rounded-full bg-violet-500/30 animate-ping"
            style={{
              left: `calc(50% + ${r.x}px)`,
              top: `calc(50% + ${r.y}px)`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </button>

      {gameState === 'playing' && (
        <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              premium ? 'bg-gradient-to-r from-violet-500 to-purple-400' : 'bg-[#8B5CF6]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="text-2xl font-bold text-white tabular-nums">{score}</div>

      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-6 h-1 rounded-full transition-all duration-300 ${
              combo > (i + 1) * 5 ? 'bg-green-500' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
