"use client";

import { useParams } from "next/navigation";
import { AccessCheck } from "@/components/access-check";

function LoadingFallback() {
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

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const groupId = params.id as string;

  return (
    <AccessCheck groupId={groupId} fallback={<LoadingFallback />}>
      {children}
    </AccessCheck>
  );
}
