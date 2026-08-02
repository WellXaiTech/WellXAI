"use client";

const DISMISS_KEY = "chatgiza:upgrade-nudge-dismissed-until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowUpgradeNudge(): boolean {
  if (typeof window === "undefined") return false;
  const until = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
  return Date.now() > until;
}

export function snoozeUpgradeNudge() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
}

export default function UpgradeNudgeBanner({
  onUpgrade,
  onDismiss,
}: {
  onUpgrade: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-auto mb-4 flex w-full max-w-[var(--max-w-chat)] flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-start gap-2 sm:min-w-0 sm:flex-1 sm:items-center">
        <span className="shrink-0 text-lg" aria-hidden>
          ⚡
        </span>
        <p className="min-w-0 flex-1 text-muted">
          <span className="font-semibold text-foreground">GiZa Pro</span> — majibu ya haraka, HD, utafutaji wa kina.
        </p>
        <button
          onClick={onDismiss}
          aria-label="Funga"
          className="shrink-0 text-muted transition-colors hover:text-foreground sm:hidden"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <button
          onClick={onUpgrade}
          className="btn-primary flex-1 rounded-full px-4 py-1.5 text-xs font-semibold hover:opacity-85 sm:flex-none"
        >
          Ona mipango
        </button>
        <button
          onClick={onDismiss}
          aria-label="Funga"
          className="hidden shrink-0 text-muted transition-colors hover:text-foreground sm:block"
        >
          ×
        </button>
      </div>
    </div>
  );
}
