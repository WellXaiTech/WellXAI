"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import type { Tab as SettingsTab } from "@/components/SettingsPanel";

export type { SettingsTab };

const ChevronRightIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const DesktopIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const MobileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </svg>
);

const UpgradeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);

const GearIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const GlobeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </svg>
);

const HelpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 3.5" />
    <path d="M12 16.5h.01" />
  </svg>
);

const LogoutIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2";

function MenuItem({
  icon,
  label,
  trailing,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={menuItemClass}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground/70">{icon}</span>
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  );
}

export default function AccountMenu({
  variant,
  onOpenSettings,
  onOpenLanguage,
  onOpenUpgradePlan,
  onOpenSupport,
}: {
  variant: "expanded" | "collapsed";
  onOpenSettings: (tab: SettingsTab) => void;
  onOpenLanguage: () => void;
  onOpenUpgradePlan: () => void;
  onOpenSupport: () => void;
}) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) setSwitcherOpen(false);
  }, [menuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSwitcherOpen(false);
        setAppsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="px-1 text-sm text-muted">···</div>;
  }

  if (!session?.user) {
    return variant === "expanded" ? (
      <Link
        href="/login"
        className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs">?</span>
        Log in
      </Link>
    ) : (
      <Link
        href="/login"
        aria-label="Log in"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs text-muted transition-colors hover:text-foreground"
      >
        ?
      </Link>
    );
  }

  const avatar = session.user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={session.user.image} alt="" className={variant === "expanded" ? "h-7 w-7 rounded-full" : "h-8 w-8 rounded-full"} />
  ) : (
    <span
      className={`flex items-center justify-center rounded-full border border-border text-xs ${
        variant === "expanded" ? "h-7 w-7" : "h-8 w-8"
      }`}
    >
      {session.user.name?.[0] ?? "?"}
    </span>
  );

  function go(tab: SettingsTab) {
    onOpenSettings(tab);
    setMenuOpen(false);
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-1" ref={ref}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className={
          variant === "expanded"
            ? "flex min-w-0 flex-1 items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
            : "flex h-8 w-8 items-center justify-center"
        }
      >
        {avatar}
        {variant === "expanded" && <span className="truncate">{session.user.name ?? session.user.email}</span>}
      </button>

      {variant === "expanded" && (
        <button
          onClick={() => setAppsOpen((v) => !v)}
          aria-label="Get ChatGiZa apps"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground ${
            appsOpen ? "bg-surface-2 text-foreground" : ""
          }`}
        >
          {GearIcon}
        </button>
      )}

      {appsOpen && (
        <div className="absolute bottom-0 left-full z-50 ml-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <div className={menuItemClass}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground/70">{DesktopIcon}</span>
            <span className="flex-1">Get ChatGiZa desktop</span>
          </div>
          <div className={menuItemClass}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground/70">{MobileIcon}</span>
            <span className="flex-1">Get ChatGiZa mobile</span>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="absolute bottom-full -inset-x-3 z-50 mb-1 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 ${
              switcherOpen ? "bg-surface-2" : ""
            }`}
          >
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {session.user.name ?? "Account"}
              </span>
              <span className="block truncate text-[10px] text-muted">{session.user.email}</span>
            </span>
            <span className="text-muted">{ChevronRightIcon}</span>
          </button>

          <div className="my-1 border-t border-border" />

          <MenuItem
            icon={UpgradeIcon}
            label="Upgrade plan"
            onClick={() => {
              onOpenUpgradePlan();
              setMenuOpen(false);
            }}
          />
          <MenuItem icon={GearIcon} label="Settings" onClick={() => go("General")} />
          <MenuItem
            icon={GlobeIcon}
            label="Language"
            trailing={<span className="text-muted">{ChevronRightIcon}</span>}
            onClick={() => {
              onOpenLanguage();
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={HelpIcon}
            label="Get Help"
            trailing={<span className="text-muted">{ChevronRightIcon}</span>}
            onClick={() => {
              onOpenSupport();
              setMenuOpen(false);
            }}
          />

          <div className="my-1 border-t border-border" />

          <MenuItem
            icon={LogoutIcon}
            label="Log out"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          />

          {switcherOpen && (
            <div className="absolute top-0 left-full z-50 ml-1 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <p className="truncate px-2 py-1 text-xs text-muted">{session.user.email}</p>
              <div className="my-1 border-t border-border" />
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5 text-sm">
                {avatar}
                <span className="flex-1 truncate">{session.user.name ?? session.user.email}</span>
                <span>{CheckIcon}</span>
              </div>
              <button
                onClick={() => signIn("google", undefined, { prompt: "select_account" })}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                + Add account
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
