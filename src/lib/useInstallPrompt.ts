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

// Windows desktop app (electron-app/) installer. Not yet on an automated
// release pipeline like the Android APK above -- update this manually
// (rebuild electron-app, re-push the desktop-releases branch) each time a
// new version ships, until that's worth automating.
export const CHATGIZA_DESKTOP_URL =
  "https://raw.githubusercontent.com/WellXaiTech/WellXAI/desktop-releases/ChatGiZa-Setup-0.1.0.exe";

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    // Set by the Electron desktop wrapper (electron-app/src/main.ts) via
    // webContents.setUserAgent -- a plain BrowserWindow never matches
    // display-mode: standalone (that's PWA-manifest-driven), so this is
    // how the desktop app identifies itself to get the same "app mode"
    // UI (Home/Code toggle, Build page unlocked) as the installed PWA.
    nav.userAgent.includes("ChatGiZaDesktop/")
  );
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
