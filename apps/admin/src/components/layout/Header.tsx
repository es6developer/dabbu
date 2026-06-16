'use client';

import React from 'react';
import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <header className="glass sticky top-3 z-30 mx-3 rounded-2xl border-white/[0.06]">
      <div className="flex items-center justify-between h-14 px-5">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-white/[0.05] text-sm text-white/80 placeholder-white/25 border border-white/[0.06] focus:outline-none focus:border-indigo-500/40 focus:ring-0 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
            <Bell size={16} className="text-white/60" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          </button>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-white/60" />
              ) : (
                <Moon size={16} className="text-white/60" />
              )}
            </button>
          )}
          <div className="flex items-center gap-3 ml-3 pl-3 border-l border-white/[0.06]">
            <div className="text-right">
              <p className="text-sm font-medium text-white/80">Admin</p>
              <p className="text-xs text-white/40">admin@dabbu.app</p>
            </div>
            <Avatar className="w-9 h-9 ring-2 ring-white/[0.08]">
              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
                A
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
