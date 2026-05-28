"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) {
      setPlatform("ios");
    } else if (/android/i.test(ua)) {
      setPlatform("android");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      if (platform === "ios") {
        window.open(
          "https://apps.apple.com/app/dabbu-split",
          "_blank"
        );
      } else if (platform === "android") {
        window.open(
          "https://play.google.com/store/apps/details?id=app.dabbu.split",
          "_blank"
        );
      }
    }
  };

  if (dismissed) return null;
  if (!isInstallable && platform === "other") return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 p-4 animate-slide-up",
        className
      )}
    >
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-dabbu-border bg-dabbu-surface p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-dabbu-accent/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-dabbu-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-dabbu-text">
                {platform === "ios"
                  ? "Install Dabbu Split"
                  : "Add to Home Screen"}
              </h4>
              <p className="text-xs text-dabbu-text-secondary mt-0.5">
                {platform === "ios"
                  ? "Get the full experience from the App Store."
                  : platform === "android"
                  ? "Install the Dabbu Split app for quick access."
                  : "Install Dabbu Split for the best experience."}
              </p>
              {platform === "ios" && !isInstallable && (
                <p className="text-[10px] text-dabbu-text-muted mt-1">
                  Tap the share button <span className="inline-block">⎙</span> and select &ldquo;Add to Home Screen&rdquo;
                </p>
              )}
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
        </div>
      </div>
    </div>
  );
}
