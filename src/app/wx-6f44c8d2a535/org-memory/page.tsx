"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

type WorkspaceRecord = {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  hasInstructions: boolean;
  instructionsPreview: string;
  instructionsLength: number;
  createdAt: number;
};

const Building2Icon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 12h4" />
    <path d="M10 8h4" />
    <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
    <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
    <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
  </svg>
);

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminOrgMemoryPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/workspaces")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((data) => {
        setWorkspaces(data.workspaces);
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

  const withInstructions = workspaces.filter((w) => w.hasInstructions).length;

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Org Memory</h1>
          <p className="mt-1 text-sm text-muted">
            Shared custom instructions each workspace applies across its members&apos; chats.
          </p>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">{workspaces.length} Workspaces</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <p className="text-2xl font-semibold tabular-nums">{workspaces.length}</p>
          <p className="mt-0.5 text-xs text-muted">Workspaces</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <p className="text-2xl font-semibold tabular-nums">{withInstructions}</p>
          <p className="mt-0.5 text-xs text-muted">With shared memory</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <p className="text-2xl font-semibold tabular-nums">
            {workspaces.reduce((sum, w) => sum + w.memberCount, 0)}
          </p>
          <p className="mt-0.5 text-xs text-muted">Total members</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {workspaces.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            No workspaces created yet.
          </p>
        )}
        {workspaces.map((w) => (
          <div key={w.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
                  {Building2Icon}
                </span>
                <div>
                  <p className="text-sm font-semibold">{w.name}</p>
                  <p className="text-xs text-muted">
                    {w.ownerName || w.ownerEmail} · {w.memberCount} member{w.memberCount === 1 ? "" : "s"} · {formatDate(w.createdAt)}
                  </p>
                </div>
              </div>
              {w.hasInstructions ? (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                  {w.instructionsLength} chars
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">Empty</span>
              )}
            </div>
            {w.hasInstructions && (
              <p className="mt-3 rounded-xl bg-background px-3.5 py-2.5 text-xs text-muted">
                &quot;{w.instructionsPreview}
                {w.instructionsLength > w.instructionsPreview.length ? "…" : ""}&quot;
              </p>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
