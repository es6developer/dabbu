"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

function MemberRemovedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const balance = searchParams.get("balance");

  const outstandingBalance = balance ? parseFloat(balance) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-dabbu-accent/3 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-dabbu-accent-muted flex items-center justify-center mx-auto mb-6">
            <Info className="w-10 h-10 text-dabbu-accent" />
          </div>
          <h1 className="text-2xl font-bold text-dabbu-text mb-3">
            You&apos;ve Been Removed from the Group
          </h1>
          <p className="text-dabbu-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
            A group admin has removed you from this group.
          </p>
        </div>

        {outstandingBalance !== 0 && (
          <Card className="border-dabbu-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dabbu-red/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-dabbu-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-dabbu-text-secondary">
                    You had an outstanding balance of{" "}
                    <span
                      className={`font-semibold ${
                        outstandingBalance > 0
                          ? "text-dabbu-green"
                          : "text-dabbu-red"
                      }`}
                    >
                      {formatCurrency(Math.abs(outstandingBalance))}
                    </span>
                    .
                  </p>
                  <p className="text-xs text-dabbu-text-muted mt-1">
                    Please contact the group admin to settle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-12"
            onClick={() =>
              (window.location.href = "mailto:support@dabbu.app")
            }
          >
            Contact Admin
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
            onClick={() => router.push("/")}
            className="w-full text-sm text-dabbu-text-muted hover:text-dabbu-text-secondary transition-colors py-2"
          >
            Start your own group
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><MemberRemovedPage /></Suspense>;
}
