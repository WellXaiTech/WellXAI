"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import BuildWorkspace from "@/components/BuildWorkspace";

// Build now works directly on the website, not just inside the desktop
// app -- the earlier "Get ChatGiZa for Desktop" gate (standalone-only)
// was removed so entering /chatgiza/build never blocks you.
// TEMPORARY dev convenience, see NEXT_PUBLIC_DEV_SKIP_SIGNIN in .env -- lets
// Build be reached and used repeatedly (real API calls included, via the
// matching fallback in src/lib/requestUser.ts) without re-authenticating
// through Google each time. Remove/flip the env var before going public.
const DEV_SKIP_SIGNIN = process.env.NEXT_PUBLIC_DEV_SKIP_SIGNIN === "true";

// Once /api/build/access has confirmed "allowed" for this browser tab, skip
// the check (and the blank frame while it's in flight) on every later visit
// to this page in the same session -- clicking Ask<->Code back and forth
// was re-running this real network round trip every single time, and the
// blank gate it sits behind while "checking" was reported as a real,
// repeated dark flash: unlike a plain client-side route swap (e.g. the
// Quantara link), this page has nothing at all to show -- no sidebar, no
// content -- until that fetch resolves. A page reload still re-checks once,
// same as before; this only short-circuits repeat SPA navigations.
let cachedAccessAllowed = false;

export default function BuildPage() {
  const { status } = useSession();
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">(
    DEV_SKIP_SIGNIN || cachedAccessAllowed ? "allowed" : "checking"
  );

  useEffect(() => {
    if (DEV_SKIP_SIGNIN || cachedAccessAllowed) return;
    if (status !== "authenticated") return;
    fetch("/api/build/access")
      .then((r) => r.json())
      .then((d) => {
        if (d.allowed) cachedAccessAllowed = true;
        setAccess(d.allowed ? "allowed" : "denied");
      })
      .catch(() => setAccess("denied"));
  }, [status]);

  if (DEV_SKIP_SIGNIN) {
    return <BuildWorkspace />;
  }

  if (status === "loading") {
    // No "Loading…" text, per feedback -- a blank frame instead. Explicit
    // bg-background, not just an unstyled div, since an unpainted frame
    // can otherwise show through to the browser's own default dark canvas
    // instead of this app's real background.
    return <div className="h-full w-full bg-background" />;
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
    // No "Loading…" text, per feedback -- a blank frame instead. Explicit
    // bg-background, not just an unstyled div, since an unpainted frame
    // can otherwise show through to the browser's own default dark canvas
    // instead of this app's real background.
    return <div className="h-full w-full bg-background" />;
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
