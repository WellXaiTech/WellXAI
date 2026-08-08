"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

function JoinWorkspaceInner() {
  const { status } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJoined(true);
      setTimeout(() => router.push("/workspace"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join workspace");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24 w-full text-center">
      <h1 className="text-2xl font-semibold">Join a ChatGiZa Workspace</h1>

      {!token ? (
        <p className="mt-3 text-muted">This invite link is missing its token.</p>
      ) : status !== "authenticated" ? (
        <>
          <p className="mt-3 text-muted">Sign in to accept this invite.</p>
          <button
            onClick={() => signIn("google")}
            className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </>
      ) : joined ? (
        <p className="mt-3 text-muted">You&apos;re in! Redirecting…</p>
      ) : (
        <>
          <p className="mt-3 text-muted">You&apos;ve been invited to join a workspace.</p>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={busy}
            className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? "Joining…" : "Accept invite"}
          </button>
        </>
      )}
    </div>
  );
}

export default function JoinWorkspacePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-24 w-full" />}>
      <JoinWorkspaceInner />
    </Suspense>
  );
}
