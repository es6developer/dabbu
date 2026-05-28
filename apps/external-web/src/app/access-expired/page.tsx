"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const REASON_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  removed: {
    title: "Access Removed",
    subtitle:
      "A group admin has removed you from this group. You can request access again if needed.",
  },
  closed: {
    title: "Group Closed",
    subtitle:
      "This group has been permanently closed. The expenses have been finalized.",
  },
  expired: {
    title: "Access Expired",
    subtitle:
      "This invite link is no longer active. It may have expired or been revoked.",
  },
  completed: {
    title: "Trip Completed",
    subtitle:
      "This group has been marked as complete. Access to shared data is no longer available.",
  },
  revoked: {
    title: "Invite Revoked",
    subtitle:
      "The invitation has been revoked by the group admin. Please contact them for a new invite.",
  },
  default: {
    title: "Access Expired",
    subtitle:
      "Your access to this group is no longer active. This could be because the group was closed, the invite expired, or you were removed.",
  },
};

function AccessExpiredPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reason = searchParams.get("reason") || "default";
  const groupName = searchParams.get("groupName");
  const groupType = searchParams.get("groupType");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");

  const msg = REASON_MESSAGES[reason] || REASON_MESSAGES.default;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-dabbu-red/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-dabbu-red/10 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Lock className="w-10 h-10 text-dabbu-red" />
          </div>
          <h1 className="text-3xl font-bold text-dabbu-text mb-3">
            {msg.title}
          </h1>
          <p className="text-dabbu-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
            {msg.subtitle}
          </p>
        </div>

        {groupName && (
          <Card className="border-dabbu-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-dabbu-text">
                  {groupName}
                </h3>
                {groupType && (
                  <span className="px-2.5 py-1 rounded-full bg-dabbu-accent-muted text-dabbu-accent text-[10px] font-medium uppercase tracking-wider">
                    {groupType}
                  </span>
                )}
              </div>
              {dateStart && dateEnd && (
                <p className="text-xs text-dabbu-text-muted">
                  {new Date(dateStart).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  –{" "}
                  {new Date(dateEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-12"
            onClick={() => {
              /* triggers notification to admin */
            }}
          >
            Request Access Again
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 gap-2"
            onClick={() =>
              window.open(
                "https://apps.apple.com/app/dabbu-split",
                "_blank"
              )
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Install Dabbu App
          </Button>
          <button
            onClick={() => window.location.href = "mailto:support@dabbu.app"}
            className="w-full text-sm text-dabbu-text-muted hover:text-dabbu-text-secondary transition-colors py-2"
          >
            Contact Group Admin
          </button>
        </div>

        <div className="relative pt-4">
          <div className="absolute inset-x-0 top-0 border-t border-dabbu-border/50" />
          <div className="pt-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-dabbu-accent/10 mb-3">
              <svg className="w-6 h-6 text-dabbu-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-dabbu-text mb-1">
              Track your own expenses with Dabbu
            </h3>
            <p className="text-xs text-dabbu-text-secondary mb-4">
              Get 1 month of Premium FREE when you sign up
            </p>
            <Button
              size="lg"
              className="w-full h-12"
              onClick={() => router.push("/auth")}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get 1 Month Premium FREE
            </Button>
            <button
              onClick={() => router.push("/")}
              className="w-full text-xs text-dabbu-text-muted mt-3 hover:text-dabbu-text-secondary transition-colors"
            >
              Start your own group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><AccessExpiredPage /></Suspense>;
}
