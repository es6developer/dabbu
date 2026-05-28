"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function GroupArchivedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupName = searchParams.get("groupName");
  const totalSpent = searchParams.get("totalSpent");
  const contribution = searchParams.get("contribution");
  const settlementStatus = searchParams.get("settlement");

  const spent = totalSpent ? parseFloat(totalSpent) : 0;
  const contrib = contribution ? parseFloat(contribution) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-dabbu-accent/3 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-dabbu-surface2 flex items-center justify-center mx-auto mb-6">
            <Archive className="w-10 h-10 text-dabbu-text-muted" />
          </div>
          <h1 className="text-2xl font-bold text-dabbu-text mb-3">
            This Group Has Been Archived
          </h1>
          <p className="text-dabbu-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
            {groupName
              ? `${groupName} is no longer active.`
              : "This group is no longer active."}{" "}
            The data is preserved but no new changes can be made.
          </p>
        </div>

        {spent > 0 && (
          <Card className="border-dabbu-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dabbu-text-secondary">
                  Total Spent
                </span>
                <span className="text-lg font-semibold text-dabbu-text">
                  {formatCurrency(spent)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-dabbu-border/50">
                <span className="text-sm text-dabbu-text-secondary">
                  Your Contribution
                </span>
                <span className="text-lg font-semibold text-dabbu-text">
                  {formatCurrency(contrib)}
                </span>
              </div>
              {settlementStatus && (
                <div className="flex items-center justify-between pt-3 border-t border-dabbu-border/50">
                  <span className="text-sm text-dabbu-text-secondary">
                    Settlement
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      settlementStatus === "settled"
                        ? "text-dabbu-green"
                        : "text-dabbu-text-muted"
                    }`}
                  >
                    {settlementStatus === "settled"
                      ? "Settled"
                      : "Pending"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-12"
            onClick={() => router.push("/auth")}
          >
            Continue your finance journey with Dabbu
          </Button>
          <p className="text-xs text-dabbu-text-muted text-center leading-relaxed">
            Dabbu helps you track personal and shared expenses effortlessly
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={() => router.push("/")}
            >
              Get started free
            </Button>
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
    </div>
  );
}
