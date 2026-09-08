"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

type AppError = {
  id: string;
  message: string;
  stack: string | null;
  route: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: number;
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

export default function AdminErrorsPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [errors, setErrors] = useState<AppError[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/errors")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((d) => {
        setErrors(d.errors ?? []);
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
      <h1 className="text-2xl font-semibold tracking-tight">Errors</h1>
      <p className="mt-1 text-sm text-muted">
        Every uncaught server error, caught automatically (src/instrumentation.ts) -- the in-app counterpart to
        Sentry, which also gets each one once its DSN is configured.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        {errors.length === 0 ? (
          <p className="p-6 text-sm text-muted">No errors recorded yet -- that's a good sign.</p>
        ) : (
          <div className="divide-y divide-border">
            {errors.map((e) => (
              <div key={e.id} className="p-4">
                <button
                  onClick={() => setExpanded((cur) => (cur === e.id ? null : e.id))}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {e.route ?? "unknown route"}
                      {e.userEmail ? ` · ${e.userEmail}` : ""} · {timeAgo(e.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{expanded === e.id ? "Hide" : "Details"}</span>
                </button>
                {expanded === e.id && e.stack && (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-background p-3 text-xs text-muted">
                    {e.stack}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
