'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): 'ios' | 'android' | 'other' {
  if (typeof window === 'undefined') {
    return 'other';
  }
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) {
    return 'ios';
  }
  if (/android/i.test(ua)) {
    return 'android';
  }
  return 'other';
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  return false;
}

export function InstallPrompt({ className }: { className?: string }) {
  const platform = detectPlatform();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(isRunningStandalone());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (dismissed || standalone || platform === 'other') {
    return null;
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setDismissed(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 p-3 pb-6 bg-gradient-to-t from-dabbu-bg to-transparent pointer-events-none',
        className,
      )}
    >
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="rounded-2xl border border-dabbu-border bg-dabbu-surface p-4 shadow-2xl shadow-dabbu-accent/5">
          {platform === 'ios' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
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
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-dabbu-text">Install Dabbu (PWA)</h4>
                  <p className="text-xs text-dabbu-text-secondary mt-0.5">
                    Add to Home Screen for the full app experience.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDismissed(true)}
                    className="text-xs text-dabbu-text-muted hover:text-dabbu-text-secondary px-2 py-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-dabbu-surface2 p-3 flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-lg bg-dabbu-accent/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-dabbu-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </div>
                  <span className="text-[9px] text-dabbu-text-muted">Share</span>
                </div>
                <svg
                  className="w-5 h-5 text-dabbu-text-muted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-lg bg-dabbu-accent/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-dabbu-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m0 0l-4-4m4 4l4-4"
                      />
                    </svg>
                  </div>
                  <span className="text-[9px] text-dabbu-text-muted">Scroll down</span>
                </div>
                <svg
                  className="w-5 h-5 text-dabbu-text-muted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-lg bg-dabbu-accent/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-dabbu-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <span className="text-[9px] text-dabbu-text-muted">Add to Home</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
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
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-dabbu-text">Install Dabbu</h4>
                <p className="text-xs text-dabbu-text-secondary mt-0.5">
                  Install the PWA for quick access and offline support.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDismissed(true)}
                  className="text-xs text-dabbu-text-muted hover:text-dabbu-text-secondary px-2 py-1"
                >
                  Later
                </button>
                <Button size="sm" onClick={handleInstall}>
                  Install
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
