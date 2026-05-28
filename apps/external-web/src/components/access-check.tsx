"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  checkGroupAccess,
  resolveAccessStatus,
} from "@/lib/access-check";

interface AccessCheckProps {
  groupId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  pollingInterval?: number;
  onAccessDenied?: (status: string) => void;
}

const STATUS_ROUTES: Record<string, string> = {
  expired: "/access-expired",
  completed: "/group-completed",
  archived: "/group-archived",
  removed: "/member-removed",
  closed: "/access-expired",
};

export function AccessCheck({
  groupId,
  children,
  fallback,
  pollingInterval = 60000,
  onAccessDenied,
}: AccessCheckProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "valid" | "denied">(
    "loading"
  );
  const mountedRef = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAccess = useCallback(async () => {
    if (!groupId) {
      return;
    }

    const response = await checkGroupAccess(groupId);
    if (!mountedRef.current) {
      return;
    }
    const { status: resolvedStatus, shouldRedirect } =
      resolveAccessStatus(response);

    if (!shouldRedirect) {
      setStatus("valid");
      return;
    }

    setStatus("denied");
    onAccessDenied?.(resolvedStatus);

    const route = STATUS_ROUTES[resolvedStatus] || "/access-expired";
    const params = new URLSearchParams();

    if (response.reason) {
      params.set("reason", response.reason);
    }
    if (response.data?.groupName) {
      params.set("groupName", response.data.groupName);
    }
    if (response.data?.groupType) {
      params.set("groupType", response.data.groupType);
    }
    if (response.data?.dateRange?.start) {
      params.set("dateStart", response.data.dateRange.start);
    }
    if (response.data?.dateRange?.end) {
      params.set("dateEnd", response.data.dateRange.end);
    }
    if (response.data?.totalSpent !== undefined) {
      params.set("totalSpent", String(response.data.totalSpent));
    }
    if (response.data?.personalBalance !== undefined) {
      params.set("balance", String(response.data.personalBalance));
    }
    if (response.data?.totalPaid !== undefined) {
      params.set("totalPaid", String(response.data.totalPaid));
    }
    if (response.data?.totalOwed !== undefined) {
      params.set("totalOwed", String(response.data.totalOwed));
    }
    if (response.data?.settlementStatus) {
      params.set("settlement", response.data.settlementStatus);
    }
    if (response.data?.memberCount !== undefined) {
      params.set("members", String(response.data.memberCount));
    }
    if (response.data?.yourContribution !== undefined) {
      params.set("contribution", String(response.data.yourContribution));
    }

    const qs = params.toString();
    router.push(qs ? `${route}?${qs}` : route);
  }, [groupId, router, onAccessDenied]);

  useEffect(() => {
    mountedRef.current = true;
    checkAccess();

    if (pollingInterval > 0) {
      pollingRef.current = setInterval(checkAccess, pollingInterval);
    }

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [checkAccess, pollingInterval]);

  if (status === "loading") {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-dabbu-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div className="w-48 h-4 rounded bg-dabbu-surface2 animate-pulse mx-auto mb-3" />
          <div className="w-32 h-3 rounded bg-dabbu-surface2 animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return null;
  }

  return <>{children}</>;
}
