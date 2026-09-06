"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import BuildWorkspace from "@/components/BuildWorkspace";

// Build now works directly on the website, not just inside the desktop
// app -- the earlier "Get ChatGiZa for Desktop" gate (standalone-only)
// was removed so entering /chatgiza/build never blocks you.
export default function BuildPage() {
  const { status } = useSession();
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/build/access")
      .then((r) => r.json())
      .then((d) => setAccess(d.allowed ? "allowed" : "denied"))
      .catch(() => setAccess("denied"));
  }, [status]);

  if (status === "loading") {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted">Loading…</div>;
  }

  if (status !== "authenticated") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted">Sign in to use the Build page.</p>
        <button onClick={() => signIn("google")} className="btn-primary rounded-full px-5 py-2 text-sm font-medium">
          Sign in
        </button>
      </div>
    );
  }

  // Only reachable once authenticated, at which point the effect above has
  // actually started the /api/build/access fetch -- checking this before
  // the sign-in gate left signed-out visitors stuck on "Loading…" forever,
  // since access can never leave "checking" without that fetch ever firing.
  if (access === "checking") {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted">Loading…</div>;
  }

  if (access === "denied") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted">Build isn&apos;t available on your account yet.</p>
        <button onClick={() => window.history.back()} className="text-sm font-medium text-foreground underline">
          Go back
        </button>
      </div>
    );
  }

  return <BuildWorkspace />;
}
