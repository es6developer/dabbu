"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

function GroupCompletedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupName = searchParams.get("groupName");
  const totalSpent = searchParams.get("totalSpent");
  const totalPaid = searchParams.get("totalPaid");
  const totalOwed = searchParams.get("totalOwed");
  const balance = searchParams.get("balance");
  const settlementStatus = searchParams.get("settlement");

  const spent = totalSpent ? parseFloat(totalSpent) : 0;
  const paid = totalPaid ? parseFloat(totalPaid) : 0;
  const owed = totalOwed ? parseFloat(totalOwed) : 0;
  const bal = balance ? parseFloat(balance) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-dabbu-green/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-dabbu-green/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-dabbu-green" />
          </div>
          <h1 className="text-3xl font-bold text-dabbu-text mb-3">
            Trip Completed Successfully!
          </h1>
          <p className="text-dabbu-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
            {groupName
              ? `${groupName} has been wrapped up. `
              : "The group has been wrapped up. "}
            All expenses have been settled and finalized.
          </p>
        </div>

        <Card className="border-dabbu-border/50">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center pb-3 border-b border-dabbu-border/50">
              <p className="text-xs text-dabbu-text-muted mb-1">
                Total Spent
              </p>
              <p className="text-3xl font-bold text-dabbu-text">
                {formatCurrency(spent)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-dabbu-green/5">
                <p className="text-xs text-dabbu-text-muted mb-1">
                  You Paid
                </p>
                <p className="text-lg font-semibold text-dabbu-green">
                  {formatCurrency(paid)}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-dabbu-red/5">
                <p className="text-xs text-dabbu-text-muted mb-1">
                  You Owed
                </p>
                <p className="text-lg font-semibold text-dabbu-red">
                  {formatCurrency(owed)}
                </p>
              </div>
            </div>

            {settlementStatus && (
              <div className="text-center pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-dabbu-green/10 text-dabbu-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-dabbu-green" />
                  {settlementStatus === "settled"
                    ? "All Settled"
                    : "Pending Settlement"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-12 gap-2"
            onClick={() => {
              /* download settlement receipt */
            }}
          >
            <Download className="w-4 h-4" />
            Download Settlement Receipt
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12"
            onClick={() => router.push("/auth")}
          >
            View Your Personal Summary
          </Button>
        </div>

        <div className="relative pt-4">
          <div className="absolute inset-x-0 top-0 border-t border-dabbu-border/50" />
          <div className="pt-6">
            <Card className="border-dabbu-accent/20 bg-gradient-to-r from-dabbu-accent-muted via-dabbu-surface2 to-dabbu-accent-muted">
              <CardContent className="pt-6 text-center">
                <h3 className="text-base font-semibold text-dabbu-text mb-1">
                  Track all future trips with Dabbu
                </h3>
                <p className="text-xs text-dabbu-text-secondary mb-4">
                  Your next trip deserves smarter finance tracking
                </p>
                <Button
                  size="lg"
                  className="w-full h-12"
                  onClick={() => router.push("/auth")}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get 1 Month Premium Free
                </Button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full text-xs text-dabbu-text-muted mt-3 hover:text-dabbu-text-secondary transition-colors"
                >
                  Start your own group
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="text-center pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-dabbu-text-muted gap-2"
            onClick={() =>
              window.open(
                "https://apps.apple.com/app/dabbu-split",
                "_blank"
              )
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Install Dabbu App
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><GroupCompletedPage /></Suspense>;
}
