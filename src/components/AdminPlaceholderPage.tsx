"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

// Shared shell for admin nav sections that don't have real content yet --
// same auth gate as Overview/Users (a 403 from the stats endpoint means
// "not an admin"), just without fetching data this page doesn't use.
export default function AdminPlaceholderPage({ title }: { title: string }) {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/stats")
      .then((r) => setState(r.ok ? "ready" : "forbidden"))
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
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="py-6 text-center text-xs font-light text-foreground">Nothing here yet.</p>
    </AdminShell>
  );
}
