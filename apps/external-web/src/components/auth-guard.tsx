"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  fallback,
  redirectTo = "/auth",
}: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = api.getTempToken();
    const session = api.getTempSession();

    if (token && session) {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
      if (redirectTo) {
        const currentPath = window.location.pathname;
        const redirectPath = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
        router.push(redirectPath);
      }
    }

    setChecking(false);
  }, [redirectTo, router]);

  if (checking) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-dabbu-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold">D</span>
          </div>
          <div className="w-32 h-3 rounded bg-dabbu-surface2 animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
