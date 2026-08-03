"use client";

import { useEffect, useState } from "react";

// Non-standard but implemented by every Chromium browser — not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// GitHub's "latest" alias always resolves to whichever release tag was
// published most recently, so this link never goes stale as new builds ship.
export const CHATGIZA_APK_URL = "https://github.com/WellXaiTech/WellXAI/releases/latest/download/app-release.apk";

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

// Capacitor injects this global even when loading a remote server.url, so it
// reliably tells web code it's running inside the native Android shell.
export function isNativeShell() {
  return typeof window !== "undefined" && "Capacitor" in window;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  };

  return { canPrompt: !!deferredPrompt, promptInstall };
}
