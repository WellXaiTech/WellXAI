"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

type Stats = {
  userCount: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  activeToday: number;
  activeThisWeek: number;
  signupsByDay: { date: string; count: number }[];
  postsCount: number;
  workspacesCount: number;
  subaccountsCount: number;
  adsPendingReview: number;
  adsApproved: number;
};

function formatDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const UsersIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <path d="M16 3.128a4 4 0 0 1 0 7.744" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);
const TrendingUpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7h6v6" />
    <path d="m22 7-8.5 8.5-5-5L2 17" />
  </svg>
);
const ActivityIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </svg>
);
const MessageSquareIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
  </svg>
);
const ArrowRightIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

function HeroStat({
  label,
  value,
  icon,
  accent,
  border,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  border: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 border-l-4 ${border}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}>{icon}</span>
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 px-5 py-4 text-center first:pl-6 last:pr-6">
      <p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

// Cubic-bezier interpolation through the daily points (control points offset
// halfway between each pair on the x-axis) -- a smooth curve instead of a
// jagged polyline, without pulling in a charting library for one chart.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = prev.x + (curr.x - prev.x) / 2;
    d += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function SignupsChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);

  const W = 700;
  const H = 180;
  const padY = 16;
  const points = days.map((d, i) => ({
    x: days.length > 1 ? (i / (days.length - 1)) * W : 0,
    y: padY + (1 - d.count / max) * (H - padY * 2),
  }));
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">New signups</p>
          <p className="text-xs text-muted">Last 14 days · {total} total</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
          {TrendingUpIcon}
        </span>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full overflow-visible">
          <defs>
            <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#signupsFill)" stroke="none" />
          <path d={linePath} fill="none" stroke="rgb(99 102 241)" strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={days[i].date} cx={p.x} cy={p.y} r="3.5" className="fill-surface stroke-indigo-500" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{formatDayLabel(days[0]?.date ?? "")}</span>
        <span>{formatDayLabel(days[days.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}

export default function AdminOverviewClient() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setState("ready");
      })
      .catch(() => setState("forbidden"));
  }, [status]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (state === "forbidden" || !stats) {
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

  return (
    <AdminShell>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-muted">Registered ChatGiZa users and recent activity.</p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HeroStat label="Total users" value={stats.userCount} icon={UsersIcon} accent="bg-blue-500/10 text-blue-500" border="border-l-blue-500" />
        <HeroStat
          label="Active today"
          value={stats.activeToday}
          icon={ActivityIcon}
          accent="bg-emerald-500/10 text-emerald-500"
          border="border-l-emerald-500"
        />
        <HeroStat
          label="Community posts"
          value={stats.postsCount}
          icon={MessageSquareIcon}
          accent="bg-pink-500/10 text-pink-500"
          border="border-l-pink-500"
        />
      </div>

      <div className="mt-3 flex divide-x divide-border rounded-2xl border border-border bg-surface">
        <MiniStat label="New this week" value={stats.newThisWeek} />
        <MiniStat label="New this month" value={stats.newThisMonth} />
        <MiniStat label="Active this week" value={stats.activeThisWeek} />
        <MiniStat label="Workspaces" value={stats.workspacesCount} />
        <MiniStat label="Ads pending" value={stats.adsPendingReview} />
      </div>

      <div className="mt-6">
        <SignupsChart days={stats.signupsByDay} />
      </div>

      {stats.adsPendingReview > 0 && (
        <Link
          href="/advertise/admin"
          className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          <span>
            {stats.adsPendingReview} ad{stats.adsPendingReview === 1 ? "" : "s"} waiting for review
          </span>
          <span className="flex items-center gap-1 text-muted">
            Review {ArrowRightIcon}
          </span>
        </Link>
      )}
    </AdminShell>
  );
}
