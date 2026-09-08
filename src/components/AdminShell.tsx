"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { chatgizaSignOut } from "@/lib/signOutHelper";
import { getStoredTheme, setTheme as applyStoredTheme, type Theme } from "@/lib/theme";

const OverviewIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 6.75a3.75 3.75 0 1 0-7.5 0a3.75 3.75 0 0 0 7.5 0M21 17.25a3.75 3.75 0 1 0-7.5 0a3.75 3.75 0 0 0 7.5 0m-10.5 0a3.75 3.75 0 1 0-7.5 0a3.75 3.75 0 0 0 7.5 0M17.25 3v1.34m0 0c.666 0 1.268.27 1.704.706M14.84 6.75a2.4 2.4 0 0 1 .707-1.704a2.4 2.4 0 0 1 1.704-.706m0 4.821V10.5m0-1.339c.666 0 1.268-.27 1.705-.706M14.839 6.75c0 .666.27 1.269.706 1.705a2.4 2.4 0 0 0 1.705.706M21 6.75h-1.34m0 0c0 .666-.27 1.269-.705 1.705m.706-1.705a2.4 2.4 0 0 0-.707-1.704M14.84 6.75H13.5m6.402-2.652l-.948.948m-4.356 4.356l.947-.947m4.357.947l-.947-.947m-4.357-4.357l.947.948" />
  </svg>
);

const UsersIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85" />
  </svg>
);

const AdsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const AgentsIcon = (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
    <path d="M27.2 16c0-6.19-5.01-11.2-11.2-11.2S4.8 9.81 4.8 16S9.81 27.2 16 27.2S27.2 22.19 27.2 16m-5.6 2.1a1.4 1.4 0 0 1 0 2.8h-4.2a1.4 1.4 0 0 1 0-2.8zm-11.2-6.8a1.397 1.397 0 0 1 1.84.361l.08.119l2.1 3.5l.087.171a1.4 1.4 0 0 1 0 1.1l-.088.171l-2.1 3.5a1.4 1.4 0 0 1-2.4-1.44l1.67-2.78l-1.67-2.78l-.067-.127a1.394 1.394 0 0 1 .547-1.79zM30 16c0 7.73-6.27 14-14 14S2 23.73 2 16S8.27 2 16 2s14 6.27 14 14" />
  </svg>
);

const AppsIcon = (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
    <path d="M18 23.937V10a6 6 0 0 1 12 0v2.006m0 11.997V38a6 6 0 0 1-12 0v-2.03" />
    <path d="M24 30H9.984C6.68 30 4 27.314 4 24s2.68-6 5.984-6h2.005M24 18h13.989A6.006 6.006 0 0 1 44 24c0 3.314-2.691 6-6.011 6h-1.923" />
  </svg>
);

const IdentityAccessIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

const UserAnalyticsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const BillingIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const OrgMemoryIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 18V5" />
    <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
    <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
    <path d="M18 18a4 4 0 0 0 2-7.464" />
    <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
    <path d="M6 18a4 4 0 0 1-2-7.464" />
    <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
  </svg>
);

const ErrorsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const FlaggedAccountsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22V15" />
  </svg>
);

const LogoutIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const SystemIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const SunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const MoonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

const THEME_OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "system", icon: SystemIcon, label: "System" },
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
];

// `color` is unused for now (labels are plain foreground/muted, icons too)
// -- kept on each entry rather than removed, in case per-item color comes
// back for one or the other later.
const NAV_ITEMS = [
  { href: "/wx-6f44c8d2a535", label: "Overview", icon: OverviewIcon, color: "text-indigo-500" },
  { href: "/wx-6f44c8d2a535/agents", label: "Agents", icon: AgentsIcon, color: "text-orange-500" },
  { href: "/wx-6f44c8d2a535/apps", label: "Apps", icon: AppsIcon, color: "text-blue-500" },
  { href: "/wx-6f44c8d2a535/identity-access", label: "Identity & Access", icon: IdentityAccessIcon, color: "text-emerald-500" },
  { href: "/wx-6f44c8d2a535/users", label: "Users", icon: UsersIcon, color: "text-violet-500" },
  { href: "/wx-6f44c8d2a535/user-analytics", label: "User Analytics", icon: UserAnalyticsIcon, color: "text-cyan-500" },
  { href: "/wx-6f44c8d2a535/flagged-accounts", label: "Flagged Accounts", icon: FlaggedAccountsIcon, color: "text-red-500" },
  { href: "/wx-6f44c8d2a535/errors", label: "Errors", icon: ErrorsIcon, color: "text-yellow-500" },
  { href: "/wx-6f44c8d2a535/billing", label: "Billing", icon: BillingIcon, color: "text-amber-500" },
  { href: "/wx-6f44c8d2a535/org-memory", label: "Org Memory", icon: OrgMemoryIcon, color: "text-pink-500" },
  { href: "/advertise/admin", label: "Ads review", icon: AdsIcon, color: "text-rose-500" },
];

// Shared chrome for every admin page -- each page still does its own
// auth/data fetch and only renders this once it's past its loading/
// forbidden state, so the sidebar never flashes for a signed-out visitor.
// Every nav entry is a real route under this same shell (no more links that
// drop back into the public marketing layout), so moving between sections
// never "pops out" of the admin chrome.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("system");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function handleThemeChange(t: Theme) {
    setThemeState(t);
    applyStoredTheme(t);
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border p-4">
        <div className="px-2 py-2 text-lg font-semibold tracking-tight">WellXAI Admin</div>

        <nav className="mt-4 flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="text-foreground">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div ref={menuRef} className="relative mt-auto border-t border-border pt-3">
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-border bg-surface p-3 shadow-lg">
              <p className="px-1 pb-2 text-xs font-medium text-muted">Appearance</p>
              <div className="mb-3 inline-flex w-full items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    aria-label={opt.label}
                    aria-pressed={theme === opt.value}
                    className={`flex flex-1 items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      theme === opt.value ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
              <button
                onClick={() => chatgizaSignOut()}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-surface-2"
              >
                {LogoutIcon}
                Log out
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-surface-2"
          >
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="h-8 w-8 shrink-0 rounded-full" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium">
                {session?.user?.name?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session?.user?.name ?? session?.user?.email}</p>
              <p className="truncate text-xs text-muted">Admin</p>
            </div>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
