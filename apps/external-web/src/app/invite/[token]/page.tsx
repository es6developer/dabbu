"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type Group } from "@/lib/api";
import {
  checkGroupAccess,
  resolveAccessStatus,
} from "@/lib/access-check";
import { formatCurrency, getInitials, getRandomColor } from "@/lib/utils";
import { toast } from "sonner";

interface InviteData {
  group: Group;
  inviter: { name: string; avatar?: string };
  permissions: string[];
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!api.getTempToken();

  const redirectIfNeeded = useCallback(
    async (groupId: string) => {
      const response = await checkGroupAccess(groupId);
      const { status, shouldRedirect } = resolveAccessStatus(response);

      if (!shouldRedirect) {
        return;
      }

      const routeMap: Record<string, string> = {
        expired: "/access-expired",
        completed: "/group-completed",
        archived: "/group-archived",
        removed: "/member-removed",
        closed: "/access-expired",
      };

      const route = routeMap[status] || "/access-expired";
      const params = new URLSearchParams();

      if (response.data?.groupName) {
        params.set("groupName", response.data.groupName);
      }
      if (response.data?.groupType) {
        params.set("groupType", response.data.groupType);
      }
      if (response.reason) {
        params.set("reason", response.reason);
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

      if (response.data?.dateRange?.start) {
        params.set("dateStart", response.data.dateRange.start);
      }
      if (response.data?.dateRange?.end) {
        params.set("dateEnd", response.data.dateRange.end);
      }

      const qs = params.toString();
      router.replace(qs ? `${route}?${qs}` : route);
    },
    [router]
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    setLoading(true);
    setError(null);

    const res = await api.groups.getInvite(token);

    if (res.error) {
      if (res.status === 401 || res.status === 403) {
        const reason =
          res.status === 401
            ? "This invite link is invalid or has expired"
            : "You don't have permission to access this invite";
        setError(reason);
        setLoading(false);
        return;
      }

      if (res.status === 410) {
        router.replace("/access-expired?reason=expired&message=invite_revoked");
        return;
      }

      setError(res.error);
      setLoading(false);
      return;
    }

    const data = res.data!;
    const group = data.group;

    await redirectIfNeeded(group.id);

    setInvite(data as InviteData);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/invite/${token}`);
      return;
    }
    setJoining(true);
    const res = await api.groups.join(token);
    if (res.error) {
      toast.error(res.error);
      setJoining(false);
      return;
    }
    toast.success("Joined the group!");
    router.push(`/groups/${res.data!.group.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-dabbu-red-bg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-dabbu-red"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Invite Not Found</h2>
            <p className="text-dabbu-text-secondary mb-6">{error}</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  const group = invite.group;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-dabbu-accent/10 via-transparent to-transparent pointer-events-none" />

      <Card className="w-full max-w-lg relative z-10 animate-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-dabbu-accent flex items-center justify-center shadow-lg shadow-dabbu-accent/30">
              <span className="text-white font-bold text-2xl">
                {getInitials(group.name)}
              </span>
            </div>
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-dabbu-accent-muted text-dabbu-accent text-xs font-medium mb-3 mx-auto">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            You&apos;re invited!
          </div>
          <CardTitle className="text-2xl">{group.name}</CardTitle>
          {group.description && (
            <p className="text-dabbu-text-secondary text-sm mt-1">
              {group.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-dabbu-text-muted">
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.5a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {group.memberCount} members
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {formatCurrency(group.totalBalance)}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <h4 className="text-sm font-medium text-dabbu-text-secondary mb-3">
              Members
            </h4>
            <div className="space-y-2">
              {group.members.slice(0, 8).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-dabbu-surface2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: getRandomColor(member.name) }}
                    >
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-dabbu-text-muted capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      member.balance > 0
                        ? "text-dabbu-green"
                        : member.balance < 0
                        ? "text-dabbu-red"
                        : "text-dabbu-text-muted"
                    }`}
                  >
                    {member.balance === 0
                      ? "Settled"
                      : formatCurrency(member.balance)}
                  </span>
                </div>
              ))}
              {group.members.length > 8 && (
                <p className="text-xs text-center text-dabbu-text-muted pt-2">
                  +{group.members.length - 8} more members
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleJoin}
                loading={joining}
              >
                Join {group.name}
              </Button>
            ) : (
              <>
                <Button size="lg" className="w-full" onClick={handleJoin}>
                  Sign in to Join
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    router.push(`/auth?redirect=/invite/${token}`)
                  }
                >
                  Continue as Guest
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
