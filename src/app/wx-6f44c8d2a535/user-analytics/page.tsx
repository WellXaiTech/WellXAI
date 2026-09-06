"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

type UserPlatform = "web" | "desktop" | "android" | "vscode";
type Analytics = {
  totalUsers: number;
  platformCounts: Record<UserPlatform, number>;
  untracked: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  activeToday: number;
  activeThisWeek: number;
};

const PLATFORM_META: Record<UserPlatform, { label: string; bar: string }> = {
  web: { label: "Web", bar: "bg-blue-500" },
  desktop: { label: "Desktop", bar: "bg-purple-500" },
  android: { label: "Android", bar: "bg-emerald-500" },
  vscode: { label: "VS Code", bar: "bg-orange-500" },
};

function StatCard({ label, value, sublabel }: { label: string; value: number; sublabel?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-2xl font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
      {sublabel && <p className="mt-2 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}

function PlatformBar({ label, bar, count, max }: { label: string; bar: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, (count / max) * 100) : 4;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted">{count}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminUserAnalyticsPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/analytics")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch(() => setState("forbidden"));
  }, [status]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (state === "forbidden" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="mt-3 text-muted">
            {status === "authenticated"
              ? "Your account doesn't have access to this page."
              : "Sign in with an admin account to continue."}
          </p>
          {status !== "authenticated" && (
            <button
              onClick={() => signIn("google")}
              className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  const maxPlatform = Math.max(1, ...Object.values(data.platformCounts));

  return (
    <AdminShell>
      <h1 className="text-2xl font-semibold tracking-tight">User Analytics</h1>
      <p className="mt-1 text-sm text-muted">Where accounts sign in from, and how active they are.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total users" value={data.totalUsers} />
        <StatCard label="Active today" value={data.activeToday} sublabel="Last seen in 24h" />
        <StatCard label="Active this week" value={data.activeThisWeek} sublabel="Last seen in 7d" />
        <StatCard label="New this month" value={data.newThisMonth} sublabel={`${data.newThisWeek} this week`} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm font-semibold">Platforms</p>
        <p className="text-xs text-muted">
          Accounts by surface they&apos;ve signed in from — one account can appear in more than one.
        </p>
        <div className="mt-5 space-y-4">
          {(Object.keys(PLATFORM_META) as UserPlatform[]).map((p) => (
            <PlatformBar key={p} label={PLATFORM_META[p].label} bar={PLATFORM_META[p].bar} count={data.platformCounts[p]} max={maxPlatform} />
          ))}
        </div>
        {data.untracked > 0 && (
          <p className="mt-4 text-xs text-muted">
            {`${data.untracked} account${data.untracked === 1 ? "" : "s"} haven't signed in since platform tracking was added, so they don't show a surface yet.`}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
