"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

type SecurityEvent = {
  id: string;
  type: string;
  detail: string | null;
  actorEmail: string;
  actorName: string;
  createdAt: number;
};
type IdentityStats = {
  totpEnabledCount: number;
  passkeysCount: number;
  apiKeysCount: number;
  ssoCount: number;
  events: SecurityEvent[];
};

const LockIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const FingerprintIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M2 16h.01" />
    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
  </svg>
);
const KeyRoundIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);
const ShieldCheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>{icon}</span>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </div>
  );
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "Just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function eventLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminIdentityAccessPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [stats, setStats] = useState<IdentityStats | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/identity")
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
      <h1 className="text-2xl font-semibold tracking-tight">Identity &amp; Access</h1>
      <p className="mt-1 text-sm text-muted">Authentication methods and security activity across all accounts.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="2FA enabled" value={stats.totpEnabledCount} icon={LockIcon} accent="bg-blue-500/10 text-blue-500" />
        <StatCard label="Passkeys" value={stats.passkeysCount} icon={FingerprintIcon} accent="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="API keys" value={stats.apiKeysCount} icon={KeyRoundIcon} accent="bg-amber-500/10 text-amber-500" />
        <StatCard label="SSO connections" value={stats.ssoCount} icon={ShieldCheckIcon} accent="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recent security events</h2>
        <div className="space-y-1.5">
          {stats.events.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
              No security events recorded yet.
            </p>
          )}
          {stats.events.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{eventLabel(e.type)}</p>
                <p className="truncate text-xs text-muted">
                  {e.actorName || e.actorEmail}
                  {e.detail ? ` · ${e.detail}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">{timeAgo(e.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
