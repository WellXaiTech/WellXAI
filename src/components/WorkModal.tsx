"use client";

const CloseIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Dedicated modal for the "Work" pill next to Chat -- mirrors the reference's
// layout and top gradient (toggle pill, centered title, description, Learn
// more, single CTA) rather than the app's usual monochrome chrome, per
// explicit request to match the reference image directly.
export default function WorkModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="card relative w-full max-w-lg overflow-hidden rounded-3xl p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-2/3"
          style={{
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.55), rgba(59,130,246,0.28) 45%, transparent 80%)",
          }}
        />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {CloseIcon}
        </button>

        <div className="relative z-10">
          <div className="mx-auto mb-6 flex w-fit items-center gap-1 rounded-full bg-surface-2 p-1">
            <span className="rounded-full px-4 py-1.5 text-sm font-medium text-muted">Chat</span>
            <span className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-foreground shadow-sm">
              Work
            </span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Meet ChatGiZa Work</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
            Work is a separate space for your company&apos;s chats, kept apart from your personal ones — pulling in
            your team&apos;s shared instructions automatically instead of you re-explaining them every time.
          </p>
          {/* /workspace only exists on wellxai.world (proxy.ts redirects it
              there off any other host). A relative next/link href="/workspace"
              with target="_blank" still ended up navigating this tab away --
              Link's client-side RSC prefetch hits the cross-origin redirect,
              fails CORS, and its browser-navigation fallback doesn't carry
              target/rel with it. A plain anchor straight at the real
              destination sidesteps Link entirely, so the new tab actually
              opens and this chatgiza.com session (and this modal's own chat
              context) stays put instead of navigating away. */}
          <a
            href="https://wellxai.world/workspace"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm text-muted underline hover:text-foreground"
          >
            Learn more
          </a>

          <button
            onClick={onClose}
            className="mt-12 inline-flex items-center justify-center rounded-full bg-blue-500/15 px-6 py-2 text-sm font-semibold text-blue-500 transition-colors hover:bg-blue-500/25"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
