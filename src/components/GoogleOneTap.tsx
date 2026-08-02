"use client";

import { useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleAccountsId = any;

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SNOOZE_KEY = "chatgiza:one-tap-dismissed-until";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

function isSnoozed(): boolean {
  const until = Number(localStorage.getItem(SNOOZE_KEY) ?? "0");
  return Date.now() < until;
}

function snooze() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
}

/** Renders nothing itself — just prompts Google's own One Tap sign-in overlay for signed-out visitors. */
export default function GoogleOneTap() {
  const { status } = useSession();
  const started = useRef(false);

  useEffect(() => {
    if (status !== "unauthenticated" || started.current || isSnoozed()) return;
    const clientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
    if (!clientId) return;

    function start() {
      if (!window.google?.accounts?.id) return;
      started.current = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            await signIn("google-one-tap", { credential: response.credential, callbackUrl: "/chatgiza" });
          } catch (err) {
            console.error("Google One Tap sign-in failed:", err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) snooze();
      });
    }

    if (window.google?.accounts?.id) {
      start();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = start;
    // One Tap is a nice-to-have, never something worth surfacing an error for.
    script.onerror = () => {};
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [status]);

  return null;
}
