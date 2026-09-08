"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

type FlaggedAccount = {
  userId: string;
  name: string;
  email: string;
  failedCount: number;
  rateLimitedCount: number;
  lastSeen: number;
};

function timeAgo(ts: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminFlaggedAccountsPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [flagged, setFlagged] = useState<FlaggedAccount[]>([]);
  const [meta, setMeta] = useState<{ lookbackDays: number; threshold: number } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/flagged-accounts")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((d) => {
        setFlagged(d.flagged ?? []);
        setMeta({ lookbackDays: d.lookbackDays, threshold: d.threshold });
        setState("ready");
      })
      .catch(() => setState("forbidden"));
  }, [status]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (state === "forbidden") {
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
      <h1 className="text-2xl font-semibold tracking-tight">Flagged Accounts</h1>
      <p className="mt-1 text-sm text-muted">
        {meta &&
          `Accounts with ${meta.threshold}+ failed or rate-limited 2FA attempts in the last ${meta.lookbackDays} days -- more than a real owner mistyping a code, the pattern an actual brute-force attempt leaves behind.`}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        {flagged.length === 0 ? (
          <p className="p-6 text-sm text-muted">No accounts crossed the threshold -- nothing to review.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Failed codes</th>
                <th className="px-4 py-3 font-medium">Rate-limited</th>
                <th className="px-4 py-3 font-medium">Last attempt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flagged.map((a) => (
                <tr key={a.userId}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{a.failedCount}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {a.rateLimitedCount > 0 ? (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                        {a.rateLimitedCount}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{timeAgo(a.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
