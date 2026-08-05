"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

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

export default function SignInPromptModal({ onClose }: { onClose: () => void }) {
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card sign-in-prompt-pop relative w-full max-w-sm overflow-hidden rounded-2xl p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hero-shimmer-bg" />

        <div className="glow-badge relative z-10 mx-auto mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
        </div>

        <h2 className="relative z-10 mb-1 text-lg font-semibold tracking-tight">Sign up to keep chatting</h2>
        <p className="relative z-10 mb-6 text-sm leading-6 text-muted">
          You&apos;ve used your free message. Create a free account to continue the conversation, save your chat
          history, and pick up right where you left off on any device.
        </p>

        <div className="relative z-10 flex flex-col gap-2.5">
          <button
            onClick={() => signIn("google", { callbackUrl: "/chatgiza" }, { prompt: "select_account" })}
            className="flex items-center justify-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold transition-all hover:scale-[1.01] hover:border-foreground/30 hover:bg-surface-2"
          >
            {GoogleIcon}
            Continue with Google
          </button>

          <button
            onClick={() => setComingSoon("Apple")}
            className="flex items-center justify-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold transition-all hover:scale-[1.01] hover:border-foreground/30 hover:bg-surface-2"
          >
            {AppleIcon}
            Continue with Apple
          </button>

          <button
            onClick={() => setComingSoon("Microsoft")}
            className="flex items-center justify-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold transition-all hover:scale-[1.01] hover:border-foreground/30 hover:bg-surface-2"
          >
            {MicrosoftIcon}
            Continue with Microsoft
          </button>
        </div>

        {comingSoon && (
          <p className="relative z-10 mt-3 text-xs text-muted">
            {`${comingSoon} sign-in isn't connected yet — coming soon. Use Google for now.`}
          </p>
        )}

        <button
          onClick={onClose}
          className="relative z-10 mt-4 w-full rounded-full py-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
