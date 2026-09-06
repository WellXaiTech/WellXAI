"use client";

import { useEffect, useState } from "react";
import { CHATGIZA_APK_URL, CHATGIZA_DESKTOP_URL, isNativeShell, isStandaloneApp } from "@/lib/useInstallPrompt";

const DISMISSED_KEY = "chatgiza:install-prompt-dismissed";

export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    if (isNativeShell() || isStandaloneApp() || localStorage.getItem(DISMISSED_KEY)) return;

    const ua = window.navigator.userAgent;
    setPlatform(/iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "desktop");

    // Shown after a short delay so it doesn't flash in during page load.
    const timer = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:left-auto sm:right-6">
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Get ChatGiZa</p>
        {platform === "ios" ? (
          <p className="mt-0.5 text-xs leading-5 text-muted">
            Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> for the full app experience.
          </p>
        ) : platform === "android" ? (
          <p className="mt-0.5 text-xs leading-5 text-muted">Download the Android app to use ChatGiZa full-screen.</p>
        ) : (
          <p className="mt-0.5 text-xs leading-5 text-muted">Download the desktop app for a real app window, no browser tab needed.</p>
        )}
        <div className="mt-2.5 flex items-center gap-3">
          {platform === "android" ? (
            <a
              href={CHATGIZA_APK_URL}
              download
              onClick={dismiss}
              className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-90"
            >
              Download APK
            </a>
          ) : platform === "desktop" ? (
            <a
              href={CHATGIZA_DESKTOP_URL}
              download
              onClick={dismiss}
              className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-90"
            >
              Download for Windows
            </a>
          ) : null}
          <button onClick={dismiss} className="text-xs text-muted transition-colors hover:text-foreground">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
