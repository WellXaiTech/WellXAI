"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SsoCompleteInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing SSO token");
      return;
    }
    signIn("sso", { ssoToken: token, callbackUrl: "/chatgiza" }).catch(() => {
      setError("SSO sign-in failed");
    });
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      {error ? (
        <>
          <p className="text-lg font-semibold">Sign-in failed</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <a href="/login" className="mt-4 text-sm underline">
            Back to sign in
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">Completing sign-in…</p>
      )}
    </div>
  );
}

export default function SsoCompletePage() {
  return (
    <Suspense fallback={null}>
      <SsoCompleteInner />
    </Suspense>
  );
}
