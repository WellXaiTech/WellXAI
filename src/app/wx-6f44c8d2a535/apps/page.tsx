"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";
import { CHATGIZA_APK_URL, CHATGIZA_DESKTOP_URL } from "@/lib/useInstallPrompt";

const GlobeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);
const SmartphoneIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);
const MonitorIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);
const CodeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </svg>
);
const ExternalLinkIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

// The real distribution surfaces this product actually ships on today --
// same URLs InstallAppPrompt/README already point people to, not new ones
// invented for this admin view.
const APPS = [
  {
    name: "ChatGiZa Web",
    platform: "Browser · PWA",
    description: "The main app — works in any modern browser, installable as a PWA.",
    icon: GlobeIcon,
    accent: "bg-blue-500/10 text-blue-500",
    href: "https://www.chatgiza.com/chatgiza",
    cta: "Open",
  },
  {
    name: "Android",
    platform: "APK · Sideloaded",
    description: "Native Android app, distributed as a direct APK download from GitHub Releases.",
    icon: SmartphoneIcon,
    accent: "bg-emerald-500/10 text-emerald-500",
    href: CHATGIZA_APK_URL,
    cta: "Download APK",
  },
  {
    name: "Desktop",
    platform: "Windows · Electron",
    description: "Chrome-free window onto ChatGiZa for Windows, unsigned installer.",
    icon: MonitorIcon,
    accent: "bg-purple-500/10 text-purple-500",
    href: CHATGIZA_DESKTOP_URL,
    cta: "Download",
  },
  {
    name: "VS Code Extension",
    platform: "Marketplace",
    description: "ChatGiZa coding agent, installable from the Visual Studio Code Marketplace.",
    icon: CodeIcon,
    accent: "bg-orange-500/10 text-orange-500",
    href: "https://marketplace.visualstudio.com/items?itemName=wellxaitech.chatgiza-agent",
    cta: "View listing",
  },
];

export default function AdminAppsPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/stats")
      .then((r) => setState(r.ok ? "ready" : "forbidden"))
      .catch(() => setState("forbidden"));
  }, [status]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (state === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="mt-3 text-muted">
            {status === "authenticated"
              ? "Your account doesn't have access to this page."
              : "Sign in with an admin account to continue."}
          </p>
          {status !== "authenticated" && (
            <button
              onClick={() => signIn("google")}
              className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
          <p className="mt-1 text-sm text-muted">Where ChatGiZa ships today.</p>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">{APPS.length} Apps</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {APPS.map((app) => (
          <div key={app.name} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${app.accent}`}>{app.icon}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">{app.platform}</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{app.name}</p>
            <p className="mt-1 text-xs text-muted">{app.description}</p>
            <a
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline underline-offset-2 hover:text-muted"
            >
              {app.cta} {ExternalLinkIcon}
            </a>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
