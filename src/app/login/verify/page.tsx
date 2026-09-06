"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const COPY: Record<string, { title: string; subtitle: string }> = {
  totp: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code from your authenticator app to finish signing in.",
  },
  email: {
    title: "Confirm it's you",
    subtitle: "Enter the 6-digit code we just emailed you to finish signing in on this device.",
  },
};

function VerifyChallengeInner() {
  const params = useSearchParams();
  const pendingId = params.get("pendingId");
  const method = params.get("method") === "email" ? "email" : "totp";
  const provider = method === "email" ? "email-verify" : "totp-verify";
  const copy = COPY[method];
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendsLeft, setResendsLeft] = useState(4);

  async function handleResend() {
    if (resending || resendsLeft <= 0 || !pendingId) return;
    setResending(true);
    setResendMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't resend the code.");
      setResendsLeft(data.resendsLeft);
      setResendMessage("A new code is on its way to your email.");
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit() {
    if (busy || code.trim().length !== 6 || !pendingId) return;
    setBusy(true);
    setError(null);
    const res = await signIn(provider, {
      pendingId,
      code: code.trim(),
      redirect: false,
    });
    if (!res || res.error) {
      setError("That code is incorrect or has expired. Please try again.");
      setBusy(false);
      return;
    }
    // This device just cleared its second factor -- mark it trusted so the
    // next sign-in on this same browser skips this screen entirely, until
    // an explicit sign-out (see chatgizaSignOut) clears it again.
    await fetch("/api/auth/mark-device-trusted", { method: "POST" }).catch(() => {});
    window.location.href = "/chatgiza";
  }

  if (!pendingId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold">Sign-in session missing</p>
        <p className="mt-2 text-sm text-muted">Please start signing in again.</p>
        <Link href="/login" className="mt-4 text-sm underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-center text-sm text-muted">{copy.subtitle}</p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="000000"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        className="mt-6 w-full rounded-lg border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-foreground/40"
      />

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy || code.length !== 6}
        className="mt-4 w-full rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-40"
      >
        {busy ? "Verifying…" : "Continue"}
      </button>

      {method === "email" && (
        <div className="mt-6 text-center">
          <button
            onClick={handleResend}
            disabled={resending || resendsLeft <= 0}
            className="text-xs text-muted underline disabled:no-underline disabled:opacity-50"
          >
            {resending
              ? "Resending…"
              : resendsLeft <= 0
                ? "No resends left"
                : "Didn't get a code? Resend"}
          </button>
          {resendMessage && <p className="mt-2 text-xs text-muted">{resendMessage}</p>}
        </div>
      )}

      <Link href="/login" className="mt-6 text-xs text-muted underline">
        Back to sign in
      </Link>
    </div>
  );
}

export default function VerifyChallengePage() {
  return (
    <Suspense fallback={null}>
      <VerifyChallengeInner />
    </Suspense>
  );
}
