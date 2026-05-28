"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Group, type Member } from "@/lib/api";
import { formatCurrency, CATEGORIES, SPLIT_TYPES, cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
import { toast } from "sonner";

export default function NewExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("food");
  const [splitType, setSplitType] = useState("equal");
  const [paidById, setPaidById] = useState("");

  const [shares, setShares] = useState<
    { memberId: string; memberName: string; amount: number; percentage: number }[]
  >([]);

  const session = api.getTempSession();
  const currentUserId = (session?.id as string) || "";

  useEffect(() => {
    if (!groupId) return;
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    const res = await api.groups.get(groupId);
    if (res.error) {
      toast.error(res.error);
      router.push("/");
      return;
    }
    const g = res.data!;
    setGroup(g);
    setPaidById(currentUserId || g.members[0]?.id || "");
    setShares(
      g.members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        amount: 0,
        percentage: 0,
      }))
    );
    setLoading(false);
  };

  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => {
    if (!group || !parsedAmount) return;

    setShares((prev) => {
      return prev.map((share) => {
        if (splitType === "equal") {
          return {
            ...share,
            amount: parsedAmount / group.members.length,
            percentage: 100 / group.members.length,
          };
        }
        if (splitType === "percentage") {
          return {
            ...share,
            amount: (parsedAmount * share.percentage) / 100,
          };
        }
        return share;
      });
    });
  }, [parsedAmount, splitType, group]);

  const updateShareAmount = (memberId: string, value: number) => {
    setShares((prev) =>
      prev.map((s) =>
        s.memberId === memberId ? { ...s, amount: value } : s
      )
    );
  };

  const updateSharePercentage = (memberId: string, value: number) => {
    setShares((prev) =>
      prev.map((s) =>
        s.memberId === memberId
          ? { ...s, percentage: value, amount: (parsedAmount * value) / 100 }
          : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalShares = shares.reduce((s, share) => s + share.amount, 0);
    if (Math.abs(totalShares - parsedAmount) > 1) {
      toast.error(
        `Share total (${formatCurrency(totalShares)}) doesn't match amount (${formatCurrency(parsedAmount)})`
      );
      return;
    }

    setSubmitting(true);
    const res = await api.expenses.create(groupId, {
      description: description.trim(),
      amount: parsedAmount,
      category,
      splitType,
      paidById,
      shares: shares.map((s) => ({
        memberId: s.memberId,
        amount: parseFloat(s.amount.toFixed(2)),
        percentage: splitType === "percentage" ? s.percentage : undefined,
      })),
    });

    if (res.error) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }

    toast.success("Expense added!");
    router.push(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-dabbu-accent animate-pulse mx-auto" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="min-h-screen bg-dabbu-bg pb-20">
      <header className="glass-effect sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-dabbu-surface2 transition-colors"
            >
              <svg className="w-5 h-5 text-dabbu-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Add Expense</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 mb-1">
                  <span className="text-2xl text-dabbu-text-muted">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-40 bg-transparent text-5xl font-bold text-dabbu-text text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-dabbu-text-muted">
                  Enter the total amount
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Input
              label="Description"
              placeholder="What's this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            />

            <div>
              <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
                Paid by
              </label>
              <Select value={paidById} onValueChange={setPaidById}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {group.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.id === currentUserId ? "You" : member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dabbu-text-secondary mb-1.5">
                Split type
              </label>
              <Select value={splitType} onValueChange={setSplitType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPLIT_TYPES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Split Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {shares.map((share) => {
                  const member = group.members.find(
                    (m) => m.id === share.memberId
                  );
                  if (!member) return null;
                  const isYou = share.memberId === currentUserId;

                  return (
                    <div
                      key={share.memberId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-dabbu-surface2 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{
                          backgroundColor: `hsl(${
                            share.memberId.split("").reduce(
                              (a, c) => a + c.charCodeAt(0),
                              0
                            ) * 45 % 360
                          }, 70%, 50%)`,
                        }}
                      >
                        {share.memberName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dabbu-text">
                          {isYou ? "You" : share.memberName}
                        </p>
                        {splitType === "percentage" && (
                          <input
                            type="number"
                            value={share.percentage.toFixed(1)}
                            onChange={(e) =>
                              updateSharePercentage(
                                share.memberId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-transparent text-xs text-dabbu-accent outline-none border-b border-dabbu-border focus:border-dabbu-accent"
                          />
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {splitType === "exact" ? (
                          <input
                            type="number"
                            value={share.amount || ""}
                            onChange={(e) =>
                              updateShareAmount(
                                share.memberId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 bg-transparent text-sm font-medium text-dabbu-text text-right outline-none border-b border-dabbu-border focus:border-dabbu-accent"
                            placeholder="0"
                          />
                        ) : (
                          <span className="text-sm font-medium text-dabbu-text">
                            {formatCurrency(share.amount)}
                          </span>
                        )}
                        {splitType === "percentage" && (
                          <p className="text-[10px] text-dabbu-text-muted">
                            {formatCurrency(share.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-dabbu-border">
                <span className="text-sm text-dabbu-text-secondary">Total</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    Math.abs(shares.reduce((s, share) => s + share.amount, 0) - parsedAmount) > 1
                      ? "text-dabbu-red"
                      : "text-dabbu-green"
                  )}
                >
                  {formatCurrency(
                    shares.reduce((s, share) => s + share.amount, 0)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-14 text-base"
            size="lg"
            loading={submitting}
          >
            Add Expense
          </Button>
        </form>
      </main>
    </div>
  );
}
