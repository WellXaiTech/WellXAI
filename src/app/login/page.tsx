"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.82-.07-1.42-.22-2.05H12v3.72h6.6c-.13 1.09-.85 2.74-2.45 3.85l-.02.15 3.56 2.75.25.02c2.26-2.09 3.58-5.17 3.58-8.44Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.79-2.93c-1.01.7-2.37 1.19-4.15 1.19-3.17 0-5.86-2.09-6.82-4.98l-.14.01-3.7 2.87-.05.13C3.25 21.3 7.28 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.18 14.37a7.35 7.35 0 0 1-.4-2.37c0-.82.15-1.62.39-2.37l-.01-.16-3.75-2.92-.12.06A11.97 11.97 0 0 0 0 12c0 1.93.47 3.76 1.29 5.38l3.89-3.01Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c2.26 0 3.78.97 4.65 1.78l3.39-3.31C17.94 1.19 15.24 0 12 0 7.28 0 3.25 2.7 1.29 6.62l3.88 3.01C6.14 6.84 8.83 4.75 12 4.75Z"
    />
  </svg>
);

const AppleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.36 1.43c0 1.14-.42 2.1-1.26 2.9-.86.8-1.83 1.24-2.9 1.16-.05-1.1.4-2.14 1.24-2.98.83-.85 1.9-1.34 2.92-1.4v.32ZM20.4 17.4c-.42.98-.62 1.4-1.16 2.27-.75 1.2-1.8 2.7-3.11 2.72-1.16.02-1.46-.76-3.03-.75-1.57 0-1.9.74-3.06.77-1.31.04-2.3-1.3-3.06-2.5-2.1-3.24-2.33-7.04-1.03-9.06.92-1.44 2.37-2.28 3.74-2.28 1.4 0 2.28.78 3.44.78 1.12 0 1.8-.78 3.44-.78 1.22 0 2.51.66 3.44 1.8-3.02 1.66-2.53 5.98.4 6.79Z" />
  </svg>
);

const MicrosoftIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
    <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
  </svg>
);

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "We couldn't start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in didn't complete. Please try again.",
  OAuthCreateAccount: "We couldn't create your account. Please try again.",
  Callback: "Something interrupted sign-in. Please try again.",
  AccessDenied: "Sign-in was cancelled.",
  Configuration: "Sign-in is temporarily unavailable. Please try again shortly.",
};

function LoginPageInner() {
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? "Something went wrong signing in. Please try again." : null;

  useEffect(() => {
    if (status === "authenticated") router.replace("/chatgiza");
  }, [status, router]);

  function handleGoogleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    signIn("google", { callbackUrl: "/chatgiza" }, { prompt: "select_account" }).catch(() => {
      setSigningIn(false);
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground md:flex-row">
      <div className="relative flex h-[34vh] shrink-0 items-center justify-center overflow-hidden bg-surface md:hidden">
        <div className="hero-shimmer-bg" style={{ position: "absolute" }} />
        <span className="glow-badge relative z-10 rounded-full px-8 py-3 text-4xl font-extrabold tracking-tight">
          ChatGiZa
        </span>
      </div>

      <div className="flex w-full flex-1 flex-col justify-center px-8 py-8 sm:px-16 md:flex-none md:w-[46%] md:px-20 md:py-0">
        <Link href="/" className="mb-6 hidden text-lg font-extrabold tracking-tight md:mb-12 md:inline-block">
          ChatGiZa
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">Sign in to ChatGiZa</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted md:mt-4">
          Save your chat history, pick up conversations across devices, and personalize ChatGiZa to how you work.
        </p>

        {errorMessage && (
          <p className="mt-4 max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2.5 md:mt-10 md:gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="flex items-center justify-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60 md:py-4"
          >
            {GoogleIcon}
            {signingIn ? "Opening Google…" : "Continue with Google"}
          </button>

          <button
            onClick={() => setComingSoon("Apple")}
            className="flex items-center justify-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold transition-colors hover:bg-surface-2 md:py-4"
          >
            {AppleIcon}
            Continue with Apple
          </button>

          <button
            onClick={() => setComingSoon("Microsoft")}
            className="flex items-center justify-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold transition-colors hover:bg-surface-2 md:py-4"
          >
            {MicrosoftIcon}
            Continue with Microsoft
          </button>
        </div>

        {comingSoon && (
          <p className="mt-4 text-xs text-muted">
            {`${comingSoon} sign-in isn't connected yet — coming soon. Use Google for now.`}
          </p>
        )}

        <p className="mt-6 text-xs text-muted md:mt-10">
          By continuing, you agree to ChatGiZa&apos;s{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-surface md:flex md:w-[54%] md:items-center md:justify-center">
        <div className="hero-shimmer-bg" style={{ position: "absolute" }} />
        <span className="glow-badge relative z-10 rounded-full px-10 py-4 text-6xl font-extrabold tracking-tight lg:text-7xl">
          ChatGiZa
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
