"use client";

import { useEffect, useState } from "react";

type UserPlatform = "web" | "desktop" | "android" | "vscode";
type UserRecord = {
  id: string;
  email: string;
  name: string;
  image: string;
  createdAt: number;
  lastSeenAt: number;
  platforms: UserPlatform[];
};
type DeviceSession = {
  id: string;
  device: string;
  os: string;
  signedInAt: number;
  ip: string;
  location: string;
  platform: "web" | "mobile";
};
type UserDetail = {
  user: UserRecord;
  sessions: DeviceSession[];
  androidDeviceCount: number;
  communityPostsCount: number;
  tokensUsed: number;
};

const PLATFORM_LABEL: Record<UserPlatform, string> = {
  web: "Web",
  desktop: "Desktop",
  android: "Android",
  vscode: "VS Code",
};
const PLATFORM_CLASS: Record<UserPlatform, string> = {
  web: "bg-blue-500/10 text-blue-500",
  desktop: "bg-purple-500/10 text-purple-500",
  android: "bg-emerald-500/10 text-emerald-500",
  vscode: "bg-orange-500/10 text-orange-500",
};

const CloseIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
const CalendarIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v3" />
    <path d="M16 2v3" />
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
  </svg>
);
const ClockIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const MonitorIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);
const SmartphoneIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function StatCard({ label, value, display }: { label: string; value: number; display?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-3.5 text-center">
      <p className="text-2xl font-semibold tabular-nums tracking-tight">{display ?? value.toLocaleString()}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

// Reuses the same top gradient WorkModal uses for "Meet ChatGiZa Work" --
// per explicit request to carry that same treatment onto this modal.
export default function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [detail, setDetail] = useState<UserDetail | null>(null);

  useEffect(() => {
    setState("loading");
    fetch(`/api/wx-6f44c8d2a535/user/${userId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data) => {
        setDetail(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="card relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background: "linear-gradient(180deg, rgba(99,102,241,0.55), rgba(59,130,246,0.28) 45%, transparent 80%)",
          }}
        />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {CloseIcon}
        </button>

        {state === "loading" && <div className="relative z-10 py-16 text-center text-sm text-muted">Loading…</div>}
        {state === "error" && (
          <div className="relative z-10 py-16 text-center text-sm text-muted">Couldn&apos;t load this account.</div>
        )}

        {state === "ready" && detail && (
          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-8 pt-9">
            <div className="text-center">
              {detail.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.user.image}
                  alt=""
                  className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-background"
                />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-xl font-medium ring-4 ring-background">
                  {(detail.user.name || "?")[0].toUpperCase()}
                </div>
              )}
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{detail.user.name || "—"}</h2>
              <p className="text-sm text-muted">{detail.user.email || "—"}</p>

              {detail.user.platforms.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {detail.user.platforms.map((p) => (
                    <span key={p} className={`rounded-full px-2.5 py-1 text-xs font-medium ${PLATFORM_CLASS[p]}`}>
                      {PLATFORM_LABEL[p]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <StatCard label="Apps" value={detail.user.platforms.length} />
              <StatCard label="Devices" value={detail.sessions.length} />
              <StatCard label="Android" value={detail.androidDeviceCount} />
              <StatCard label="Community" value={detail.communityPostsCount} />
              <StatCard label="Tokens (Build)" value={detail.tokensUsed} display={formatCompact(detail.tokensUsed)} />
            </div>

            <div className="mt-3 flex gap-2.5">
              <MetaCard icon={CalendarIcon} label="Joined" value={formatDateTime(detail.user.createdAt)} />
              <MetaCard icon={ClockIcon} label="Last seen" value={formatDateTime(detail.user.lastSeenAt)} />
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Devices</h3>
                <span className="text-xs text-muted">{detail.sessions.length} total</span>
              </div>
              <div className="space-y-1.5">
                {detail.sessions.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted">
                    No device history recorded.
                  </p>
                )}
                {detail.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-2/60"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted [&>svg]:h-3 [&>svg]:w-3">
                      {s.platform === "mobile" ? SmartphoneIcon : MonitorIcon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {s.device} <span className="text-muted">· {s.os}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[10px] leading-tight">
                      <p className="font-medium text-foreground">{s.location}</p>
                      <p className="mt-0.5 text-muted">{formatDateTime(s.signedInAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
