'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PremiumBannerProps {
  variant?: 'sticky-bottom' | 'inline' | 'modal' | 'slide-in';
  trigger?: string;
  onDismiss?: () => void;
  className?: string;
}

const BANNER_TEXTS: Record<string, { title: string; description: string }> = {
  'split-type': {
    title: 'Advanced Split Types',
    description: 'Unlock percentage and exact amount splits in the full Dabbu app.',
  },
  export: {
    title: 'Export Expenses',
    description: 'Download your expense reports and summaries in the Dabbu app.',
  },
  recurring: {
    title: 'Recurring Expenses',
    description: 'Set up and manage recurring bills automatically in the full app.',
  },
  budget: {
    title: 'Budget Tracking',
    description: 'Set group budgets and track spending limits with Dabbu premium.',
  },
  default: {
    title: 'Unlock Premium Features',
    description: 'Get the full Dabbu experience with advanced tools and no limits.',
  },
};

export function PremiumBanner({
  variant = 'sticky-bottom',
  trigger = 'default',
  onDismiss,
  className,
}: PremiumBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !visible) {
    return null;
  }

  const text = BANNER_TEXTS[trigger] || BANNER_TEXTS.default;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (variant === 'sticky-bottom') {
    return (
      <div className={cn('fixed bottom-0 left-0 right-0 z-40 p-4 animate-slide-up', className)}>
        <div className="max-w-lg mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-dabbu-accent via-orange-600 to-dabbu-accent p-[1px]">
            <div className="rounded-2xl bg-gradient-to-b from-dabbu-surface to-dabbu-bg p-4">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-dabbu-text-muted hover:text-dabbu-text transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="flex items-start gap-3 pr-6">
                <div className="w-10 h-10 rounded-xl bg-dabbu-accent/20 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-dabbu-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-dabbu-text">{text.title}</h4>
                  <p className="text-xs text-dabbu-text-secondary mt-0.5">{text.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" className="text-xs h-8">
                      <svg
                        className="w-3.5 h-3.5 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Get 1 Month Free
                    </Button>
                    <span className="text-[10px] text-dabbu-text-muted">via Dabbu App</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-dabbu-accent/20 bg-gradient-to-r from-dabbu-accent-muted via-dabbu-surface2 to-dabbu-accent-muted p-4',
          className,
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-dabbu-text-muted hover:text-dabbu-text"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="flex items-center gap-3 pr-6">
          <div className="w-10 h-10 rounded-full bg-dabbu-accent/20 flex items-center justify-center shrink-0">
            <span className="text-dabbu-accent font-bold text-lg">$</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-dabbu-text">{text.title}</h4>
            <p className="text-xs text-dabbu-text-secondary">{text.description}</p>
          </div>
          <Button size="sm" className="shrink-0 text-xs h-8">
            Upgrade
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-sm rounded-2xl border border-dabbu-border bg-dabbu-bg p-6 shadow-2xl animate-slide-up">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-dabbu-text-muted hover:text-dabbu-text"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-dabbu-accent/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-dabbu-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-dabbu-text mb-2">{text.title}</h3>
            <p className="text-sm text-dabbu-text-secondary mb-6">{text.description}</p>
            <Button className="w-full" size="lg">
              Get Dabbu App
            </Button>
            <button
              onClick={handleDismiss}
              className="w-full text-sm text-dabbu-text-muted mt-3 hover:text-dabbu-text-secondary"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'slide-in') {
    return (
      <div className={cn('fixed right-4 bottom-24 z-40 w-72 animate-slide-up', className)}>
        <div className="relative rounded-xl border border-dabbu-accent/20 bg-dabbu-surface p-4 shadow-xl">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-dabbu-text-muted hover:text-dabbu-text"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="flex items-start gap-2 pr-4">
            <div className="w-8 h-8 rounded-lg bg-dabbu-accent/20 flex items-center justify-center shrink-0">
              <span className="text-dabbu-accent font-bold text-sm">D</span>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-dabbu-text">{text.title}</h4>
              <p className="text-[10px] text-dabbu-text-secondary mt-0.5">{text.description}</p>
              <button className="text-[10px] text-dabbu-accent font-medium mt-1 hover:underline">
                Get Dabbu App
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
